import { DateTime } from 'luxon';
import {
  utcToColombiaTime,
  colombiaTimeToUtc,
  isWorkingDay,
  isWithinBusinessHours,
  adjustToPreviousWorkingTime
} from '../utils/dateUtils';
import { BusinessHoursConfig } from '../types';

class WorkingDaysService {
  /**
   * Calculates the resulting date after adding working days and hours
   */
  async calculateWorkingDateTime(
    days: number = 0,
    hours: number = 0,
    startDate?: Date
  ): Promise<Date> {
    // Use current time in Colombia if no start date provided
    let currentDate = startDate ? new Date(startDate) : new Date();
    
    // Convert to Colombia timezone for calculations
    let currentColombiaTime = utcToColombiaTime(currentDate);
    
    // Adjust to previous working time if needed
    if (!await isWorkingDay(currentDate) || !isWithinBusinessHours(currentColombiaTime)) {
      currentDate = await adjustToPreviousWorkingTime(currentDate);
      currentColombiaTime = utcToColombiaTime(currentDate);
    }

    // Add working days first, then working hours to handle carry-over correctly
    if (days > 0) {
      currentColombiaTime = await this.addWorkingDays(currentColombiaTime, days);
    }

    // Then add working hours
    if (hours > 0) {
      currentColombiaTime = await this.addWorkingHours(currentColombiaTime, hours);
    }

    // Convert back to UTC for response
    return colombiaTimeToUtc(currentColombiaTime);
  }

  /**
   * Adds working days to a date
   */
  private async addWorkingDays(startDate: DateTime, daysToAdd: number): Promise<DateTime> {
    let currentDate = startDate;
    let daysAdded = 0;

    while (daysAdded < daysToAdd) {
      // Move to next day, preserving the time
      currentDate = currentDate.plus({ days: 1 });
      
      // Keep moving forward until we find a working day (not weekend and not holiday)
      while (!await isWorkingDay(currentDate.toJSDate())) {
        currentDate = currentDate.plus({ days: 1 });
      }
      
      daysAdded++;
    }

    return currentDate;
  }

  /**
   * Adds working hours to a date
   */
  private async addWorkingHours(startDate: DateTime, hoursToAdd: number): Promise<DateTime> {
    let currentDate = startDate;
    let hoursAdded = 0;
    
    // Special case: if we start outside business hours and only need 1 hour, go to 8:00 AM
    const remainingHours = this.calculateRemainingBusinessHours(currentDate);
    if (remainingHours === 0 && hoursToAdd === 1) {
      return await this.getNextWorkingDayStart(currentDate);
    }

    while (hoursAdded < hoursToAdd) {
      // Calculate remaining business hours in current day
      const remainingHours = this.calculateRemainingBusinessHours(currentDate);
      
      if (remainingHours > 0) {
        const hoursToAddNow = Math.min(hoursToAdd - hoursAdded, remainingHours);
        
        // Add the hours, skipping lunch break if needed
        currentDate = this.addHoursSkippingLunch(currentDate, hoursToAddNow);
        hoursAdded += hoursToAddNow;
      }

      // If we still have hours to add, move to next business day
      if (hoursAdded < hoursToAdd) {
        currentDate = await this.getNextWorkingDayStart(currentDate);
      }
    }

    return currentDate;
  }

  /**
   * Adds hours to a date while skipping lunch break
   */
  private addHoursSkippingLunch(date: DateTime, hoursToAdd: number): DateTime {
    let result = date;
    let hoursAdded = 0;

    while (hoursAdded < hoursToAdd) {
      const hour = result.hour;
      const minute = result.minute;

      // Check if we're about to enter lunch break
      const isBeforeLunch = hour < BusinessHoursConfig.lunchStartHour || 
                           (hour === BusinessHoursConfig.lunchStartHour && minute < BusinessHoursConfig.lunchStartMinute);
      
      const isAfterLunch = hour >= BusinessHoursConfig.lunchEndHour || 
                          (hour === BusinessHoursConfig.lunchEndHour && minute >= BusinessHoursConfig.lunchEndMinute);

      if (isBeforeLunch) {
        // Calculate time until lunch starts
        const lunchStart = result.set({
          hour: BusinessHoursConfig.lunchStartHour,
          minute: BusinessHoursConfig.lunchStartMinute,
          second: 0,
          millisecond: 0
        });
        
        const timeUntilLunch = lunchStart.diff(result);
        const hoursUntilLunch = timeUntilLunch.as('hours');
        
        const hoursToAddBeforeLunch = Math.min(hoursToAdd - hoursAdded, hoursUntilLunch);
        
        if (hoursToAddBeforeLunch > 0) {
          result = result.plus({ hours: hoursToAddBeforeLunch });
          hoursAdded += hoursToAddBeforeLunch;
        }
        
        // If we still have hours to add, skip to after lunch
        if (hoursAdded < hoursToAdd) {
          result = result.set({
            hour: BusinessHoursConfig.lunchEndHour,
            minute: BusinessHoursConfig.lunchEndMinute,
            second: 0,
            millisecond: 0
          });
        }
      } else if (!isAfterLunch) {
        // We're during lunch break, skip to after lunch
        result = result.set({
          hour: BusinessHoursConfig.lunchEndHour,
          minute: BusinessHoursConfig.lunchEndMinute,
          second: 0,
          millisecond: 0
        });
      } else {
        // After lunch, just add the remaining hours
        const remainingHours = hoursToAdd - hoursAdded;
        result = result.plus({ hours: remainingHours });
        hoursAdded = hoursToAdd;
      }
    }

    return result;
  }

  /**
   * Calculates remaining business hours in the current day
   */
  private calculateRemainingBusinessHours(date: DateTime): number {
    if (!isWithinBusinessHours(date)) {
      return 0;
    }

    const endOfDay = date.set({
      hour: BusinessHoursConfig.endHour,
      minute: BusinessHoursConfig.endMinute,
      second: 0,
      millisecond: 0
    });

    // Calculate time until end of day
    let remainingMillis = endOfDay.diff(date).milliseconds;
    
    // Subtract lunch break if applicable
    if (date.hour < BusinessHoursConfig.lunchEndHour) {
      const lunchStart = date.set({
        hour: BusinessHoursConfig.lunchStartHour,
        minute: BusinessHoursConfig.lunchStartMinute,
        second: 0,
        millisecond: 0
      });

      const lunchEnd = date.set({
        hour: BusinessHoursConfig.lunchEndHour,
        minute: BusinessHoursConfig.lunchEndMinute,
        second: 0,
        millisecond: 0
      });

      // If we're before lunch, subtract lunch duration
      if (date < lunchStart) {
        remainingMillis -= lunchEnd.diff(lunchStart).milliseconds;
      }
      // If we're during lunch, subtract remaining lunch time
      else if (date >= lunchStart && date < lunchEnd) {
        remainingMillis -= lunchEnd.diff(date).milliseconds;
      }
    }

    return Math.max(0, remainingMillis / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Gets the start of the next working day
   */
  private async getNextWorkingDayStart(date: DateTime): Promise<DateTime> {
    // Start with the next day at 8:00 AM (business hours start)
    const startHour = BusinessHoursConfig.startHour;
    
    let nextDay = date.plus({ days: 1 }).set({
      hour: startHour,
      minute: BusinessHoursConfig.startMinute,
      second: 0,
      millisecond: 0
    });
    
    // Keep moving forward until we find a working day (not weekend and not holiday)
    while (!await isWorkingDay(nextDay.toJSDate())) {
      nextDay = nextDay.plus({ days: 1 }).set({
        hour: startHour,
        minute: BusinessHoursConfig.startMinute,
        second: 0,
        millisecond: 0
      });
    }

    return nextDay;
  }


}

export const workingDaysService = new WorkingDaysService();