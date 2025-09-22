import axios from 'axios';
import { ColombianHoliday } from '../types';

class HolidayService {
  private holidaysCache: Map<number, string[]> = new Map();
  private allHolidaysCache: string[] | null = null;
  private readonly HOLIDAYS_URL = 'https://content.capta.co/Recruitment/WorkingDays.json';

  constructor() {
    // No initialization needed for external API
  }

  /**
   * Fetches all holidays from the external API
   */
  private async fetchAllHolidays(): Promise<string[]> {
    if (this.allHolidaysCache) {
      return this.allHolidaysCache;
    }

    try {
      const response = await axios.get(this.HOLIDAYS_URL);
      const holidays: string[] = response.data;
      
      // Cache the result
      this.allHolidaysCache = holidays;
      
      return holidays;
    } catch (error) {
      console.error('Error fetching holidays from external API:', error);
      return [];
    }
  }

  /**
   * Gets holidays for a specific year from the external API
   */
  async fetchHolidays(year: number): Promise<ColombianHoliday[]> {
    if (this.holidaysCache.has(year)) {
      const cached = this.holidaysCache.get(year)!;
      return cached.map(date => ({
        date: date,
        name: 'Día Festivo',
        type: 'national' as const
      }));
    }

    try {
      const allHolidays = await this.fetchAllHolidays();
      
      // Filter holidays for the specific year
       const yearHolidays = allHolidays.filter(dateStr => {
         if (!dateStr) return false;
         const holidayYear = new Date(dateStr).getFullYear();
         return holidayYear === year;
       });

      // Cache the result
      this.holidaysCache.set(year, yearHolidays);
      
      // Convert to our format
      return yearHolidays.map(date => ({
        date: date,
        name: 'Día Festivo',
        type: 'national' as const
      }));
    } catch (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  }

  /**
   * Gets holidays for a specific year
   */
  async getHolidaysForYear(year: number): Promise<ColombianHoliday[]> {
    return this.fetchHolidays(year);
  }

  /**
   * Checks if a specific date is a holiday in Colombia
   */
  async isHoliday(date: Date): Promise<boolean> {
    try {
      // Convert date to YYYY-MM-DD format for comparison
      const dateStr = date.toISOString().split('T')[0];
      if (!dateStr) return false;
      
      const allHolidays = await this.fetchAllHolidays();
      
      return allHolidays.includes(dateStr);
    } catch (error) {
      console.error('Error checking if date is holiday:', error);
      return false;
    }
  }

  /**
   * Gets all holidays for multiple years (useful for date ranges that span years)
   */
  async getHolidaysForDateRange(startDate: Date, endDate: Date): Promise<ColombianHoliday[]> {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    let allHolidays: ColombianHoliday[] = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = await this.getHolidaysForYear(year);
      allHolidays = allHolidays.concat(yearHolidays);
    }

    // Filter holidays within the date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return allHolidays.filter(holiday => {
       const holidayDateStr = holiday.date;
       return holidayDateStr && startDateStr && endDateStr && 
              holidayDateStr >= startDateStr && holidayDateStr <= endDateStr;
     });
  }

  /**
   * Gets holiday information for a specific date
   */
  async getHolidayInfo(date: Date): Promise<ColombianHoliday | null> {
    try {
      const isHol = await this.isHoliday(date);
      if (isHol) {
        const dateStr = date.toISOString().split('T')[0];
        if (!dateStr) return null;
        
        return {
          date: dateStr,
          name: 'Día Festivo',
          type: 'national' as const
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting holiday info:', error);
      return null;
    }
  }

  /**
   * Clears the holiday cache
   */
  clearCache(): void {
    this.holidaysCache.clear();
    this.allHolidaysCache = null;
  }
}

export const holidayService = new HolidayService();