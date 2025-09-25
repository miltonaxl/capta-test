import { workingDaysService } from '../services/workingDaysService';
import { holidayService } from '../services/holidayService';
import { utcToColombiaTime, isWorkingDay, isWithinBusinessHours, adjustToPreviousWorkingTime } from '../utils/dateUtils';
import { safeValidateWorkingDaysQuery } from '../schemas/validation';

// Mock the holiday service
jest.mock('../services/holidayService');

const mockedHolidayService = holidayService as jest.Mocked<typeof holidayService>;

describe('Working Days Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock holiday service to return no holidays by default
    mockedHolidayService.isHoliday.mockResolvedValue(false);
    mockedHolidayService.getHolidaysForYear.mockResolvedValue([]);
  });

  describe('Parameter Validation with Zod', () => {
    test('should return error when no parameters provided', () => {
      const result = safeValidateWorkingDaysQuery({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('At least one of days or hours must be provided'))).toBe(true);
      }
    });

    test('should return error when days is negative', () => {
      const result = safeValidateWorkingDaysQuery({ days: '-1' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Days must be a positive integer'))).toBe(true);
      }
    });

    test('should return error when hours is negative', () => {
      const result = safeValidateWorkingDaysQuery({ hours: '-1' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Hours must be a positive integer'))).toBe(true);
      }
    });

    test('should return error when date is invalid', () => {
      const result = safeValidateWorkingDaysQuery({ days: '1', hours: '0', date: 'invalid-date' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Date must be in UTC format with Z suffix'))).toBe(true);
      }
    });

    test('should return error when date does not have Z suffix', () => {
      const result = safeValidateWorkingDaysQuery({ days: '1', hours: '0', date: '2025-01-01T12:00:00' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Date must be in UTC format with Z suffix'))).toBe(true);
      }
    });

    test('should accept valid parameters', () => {
      const result1 = safeValidateWorkingDaysQuery({ days: '1', hours: '2', date: '2025-01-01T12:00:00Z' });
      expect(result1.success).toBe(true);

      const result2 = safeValidateWorkingDaysQuery({ days: '1' });
      expect(result2.success).toBe(true);

      const result3 = safeValidateWorkingDaysQuery({ hours: '2' });
      expect(result3.success).toBe(true);
    });
  });

  describe('Date Utilities', () => {
    test('should convert UTC to Colombia time', () => {
      const utcDate = new Date('2025-01-01T12:00:00Z');
      const colombiaTime = utcToColombiaTime(utcDate);
      
      expect(colombiaTime.hour).toBe(7); // Colombia is UTC-5
      expect(colombiaTime.minute).toBe(0);
    });

    test('should check if within business hours', () => {
      // Within business hours
      const duringWork = utcToColombiaTime(new Date('2025-01-01T14:00:00Z')); // 9:00 AM Colombia
      expect(isWithinBusinessHours(duringWork)).toBe(true);

      // Before business hours
      const beforeWork = utcToColombiaTime(new Date('2025-01-01T12:00:00Z')); // 7:00 AM Colombia
      expect(isWithinBusinessHours(beforeWork)).toBe(false);

      // After business hours
      const afterWork = utcToColombiaTime(new Date('2025-01-01T23:00:00Z')); // 6:00 PM Colombia
      expect(isWithinBusinessHours(afterWork)).toBe(false);

      // During lunch break
      const duringLunch = utcToColombiaTime(new Date('2025-01-01T18:00:00Z')); // 1:00 PM Colombia
      expect(isWithinBusinessHours(duringLunch)).toBe(false);
    });

    test('should adjust to previous working time for weekend', async () => {
      const weekendDate = new Date('2025-01-05T12:00:00Z'); // Sunday
      const adjusted = await adjustToPreviousWorkingTime(weekendDate);
      
      // Should be Friday 5:00 PM Colombia time
      const colombiaTime = utcToColombiaTime(adjusted);
      expect(colombiaTime.weekday).toBe(5); // Friday
      expect(colombiaTime.hour).toBe(17); // 5:00 PM
      expect(colombiaTime.minute).toBe(0);
    });

    test('should check if working day', async () => {
      // Weekday
      const weekday = new Date('2025-01-01T12:00:00Z'); // Wednesday
      expect(await isWorkingDay(weekday)).toBe(true);

      // Weekend
      const weekend = new Date('2025-01-05T12:00:00Z'); // Sunday
      expect(await isWorkingDay(weekend)).toBe(false);

      // Holiday
      mockedHolidayService.isHoliday.mockResolvedValueOnce(true);
      const holiday = new Date('2025-01-01T12:00:00Z');
      expect(await isWorkingDay(holiday)).toBe(false);
    });
  });

  describe('Business Logic Examples', () => {
    // Mock specific holidays for testing
    beforeEach(() => {
      mockedHolidayService.getHolidaysForYear.mockResolvedValue([
        { date: '2025-04-17', name: 'Jueves Santo', type: 'national' },
        { date: '2025-04-18', name: 'Viernes Santo', type: 'national' }
      ]);
    });

    test('Example 1: Friday 5:00 PM + 1 hour = Monday 8:00 AM', async () => {
      const friday5PM = new Date('2025-01-03T22:00:00Z'); // Friday 5:00 PM Colombia
      const result = await workingDaysService.calculateWorkingDateTime(undefined, 1, friday5PM);
      
      const colombiaTime = utcToColombiaTime(result);
      expect(colombiaTime.weekday).toBe(1); // Monday
      expect(colombiaTime.hour).toBe(8); // 8:00 AM
      expect(colombiaTime.minute).toBe(0);
    });

    test('Example 2: Saturday 2:00 PM + 1 hour = Monday 8:00 AM', async () => {
      const saturday2PM = new Date('2025-01-04T19:00:00Z'); // Saturday 2:00 PM Colombia
      const result = await workingDaysService.calculateWorkingDateTime(undefined, 1, saturday2PM);
      
      const colombiaTime = utcToColombiaTime(result);
      expect(colombiaTime.weekday).toBe(1); // Monday
      expect(colombiaTime.hour).toBe(8); // 8:00 AM
      expect(colombiaTime.minute).toBe(0);
    });

    test('Example 3: Tuesday 3:00 PM + 1 day + 3 hours = Thursday 9:00 AM', async () => {
      const tuesday3PM = new Date('2025-01-07T20:00:00Z'); // Tuesday 3:00 PM Colombia
      const result = await workingDaysService.calculateWorkingDateTime(1, 3, tuesday3PM);
      
      const colombiaTime = utcToColombiaTime(result);
      expect(colombiaTime.weekday).toBe(4); // Thursday
      expect(colombiaTime.hour).toBe(9); // 9:00 AM
      expect(colombiaTime.minute).toBe(0);
    });

    test('Example 9: With holidays (April 10 + 5 days + 4 hours)', async () => {
      // Mock holidays for April 17-18
      mockedHolidayService.isHoliday.mockImplementation(async (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return dateStr === '2025-04-17' || dateStr === '2025-04-18';
      });

      const april10 = new Date('2025-04-10T15:00:00.000Z');
      const result = await workingDaysService.calculateWorkingDateTime(5, 4, april10);
      
      // Should be April 21st 3:00 PM Colombia time (skipping holidays on 17th and 18th)
      const colombiaTime = utcToColombiaTime(result);
      expect(colombiaTime.toFormat('yyyy-MM-dd')).toBe('2025-04-21');
      expect(colombiaTime.hour).toBe(15); // 3:00 PM
      expect(colombiaTime.minute).toBe(0);
    });

    test('should handle lunch break correctly', async () => {
      const beforeLunch = new Date('2025-01-01T16:30:00Z'); // 11:30 AM Colombia
      const result = await workingDaysService.calculateWorkingDateTime(undefined, 3, beforeLunch);
      
      const colombiaTime = utcToColombiaTime(result);
      // Should be 3:30 PM Colombia time (skipping lunch break)
      expect(colombiaTime.hour).toBe(15); // 3:00 PM
      expect(colombiaTime.minute).toBe(30);
    });
  });

  describe('Edge Cases', () => {
    test('should handle start time outside business hours', async () => {
      const sundayNight = new Date('2025-01-05T23:00:00Z'); // Sunday 6:00 PM Colombia
      const result = await workingDaysService.calculateWorkingDateTime(undefined, 1, sundayNight);
      
      const colombiaTime = utcToColombiaTime(result);
      expect(colombiaTime.weekday).toBe(1); // Monday
      expect(colombiaTime.hour).toBe(8); // 8:00 AM
    });

    test('should handle multiple consecutive holidays', async () => {
      // Mock multiple holidays
      mockedHolidayService.isHoliday.mockImplementation(async (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return dateStr ? ['2025-12-25', '2025-12-26', '2025-12-31'].includes(dateStr) : false;
      });

      const beforeHolidays = new Date('2025-12-24T13:00:00Z'); // Wednesday 8:00 AM Colombia
      const result = await workingDaysService.calculateWorkingDateTime(1, 0, beforeHolidays);
      
      // Should skip holidays and land on Monday (next working day)
      const colombiaTime = utcToColombiaTime(result);
      expect(colombiaTime.toFormat('yyyy-MM-dd')).toBe('2025-12-29');
      expect(colombiaTime.hour).toBe(8); // 8:00 AM
    });
  });
});