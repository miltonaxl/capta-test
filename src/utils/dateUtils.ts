import { DateTime } from 'luxon';
import { holidayService } from '../services/holidayService';
import { BusinessHoursConfig, DayOfWeek } from '../types';

/**
 * Converts a UTC date to Colombia timezone (America/Bogota)
 */
export function utcToColombiaTime(date: Date): DateTime {
  return DateTime.fromJSDate(date).setZone('America/Bogota');
}

/**
 * Converts a Colombia timezone date to UTC
 */
export function colombiaTimeToUtc(date: DateTime): Date {
  return date.setZone('America/Bogota').toUTC().toJSDate();
}

/**
 * Checks if a date is a working day (Monday-Friday and not a holiday)
 */
export async function isWorkingDay(date: Date): Promise<boolean> {
  const colombiaTime = utcToColombiaTime(date);
  const dayOfWeek = colombiaTime.weekday as DayOfWeek;
  
  // Check if it's weekend (Luxon: Monday=1, Tuesday=2, ..., Saturday=6, Sunday=7)
  if (dayOfWeek === 6 || dayOfWeek === 7) { // Saturday or Sunday
    return false;
  }

  // Check if it's a holiday
  const isHoliday = await holidayService.isHoliday(date);
  return !isHoliday;
}

/**
 * Checks if a time is within business hours (8:00 AM - 5:00 PM, excluding lunch 12:00 PM - 1:00 PM)
 */
export function isWithinBusinessHours(date: DateTime): boolean {
  const hour = date.hour;
  const minute = date.minute;
  
  // Before business hours
  if (hour < BusinessHoursConfig.startHour || 
      (hour === BusinessHoursConfig.startHour && minute < BusinessHoursConfig.startMinute)) {
    return false;
  }

  // After business hours
  if (hour > BusinessHoursConfig.endHour || 
      (hour === BusinessHoursConfig.endHour && minute > BusinessHoursConfig.endMinute)) {
    return false;
  }

  // During lunch break (12:00 PM - 1:00 PM inclusive)
  if ((hour === BusinessHoursConfig.lunchStartHour && minute >= BusinessHoursConfig.lunchStartMinute) ||
      (hour > BusinessHoursConfig.lunchStartHour && hour < BusinessHoursConfig.lunchEndHour) ||
      (hour === BusinessHoursConfig.lunchEndHour && minute <= BusinessHoursConfig.lunchEndMinute)) {
    return false;
  }

  return true;
}

/**
 * Adjusts a date to the nearest previous working time within business hours
 */
export async function adjustToPreviousWorkingTime(date: Date): Promise<Date> {
  let currentDate = utcToColombiaTime(date);
  
  // First, adjust to a working day
  while (!await isWorkingDay(currentDate.toJSDate())) {
    currentDate = currentDate.minus({ days: 1 });
    // Set to end of business day
    currentDate = currentDate.set({
      hour: BusinessHoursConfig.endHour,
      minute: BusinessHoursConfig.endMinute,
      second: 0,
      millisecond: 0
    });
  }

  // Then adjust within the day to business hours
  if (!isWithinBusinessHours(currentDate)) {
    // If before business hours, go to previous day end
    if (currentDate.hour < BusinessHoursConfig.startHour || 
        (currentDate.hour === BusinessHoursConfig.startHour && currentDate.minute < BusinessHoursConfig.startMinute)) {
      currentDate = currentDate.minus({ days: 1 });
      currentDate = currentDate.set({
        hour: BusinessHoursConfig.endHour,
        minute: BusinessHoursConfig.endMinute,
        second: 0,
        millisecond: 0
      });
      
      // Recursively adjust if we moved to a non-working day
      return adjustToPreviousWorkingTime(colombiaTimeToUtc(currentDate));
    }
    
    // If after business hours, set to end of current day
    if (currentDate.hour > BusinessHoursConfig.endHour || 
        (currentDate.hour === BusinessHoursConfig.endHour && currentDate.minute > BusinessHoursConfig.endMinute)) {
      currentDate = currentDate.set({
        hour: BusinessHoursConfig.endHour,
        minute: BusinessHoursConfig.endMinute,
        second: 0,
        millisecond: 0
      });
    }
    
    // If during lunch break, set to just before lunch
    if ((currentDate.hour > BusinessHoursConfig.lunchStartHour || 
         (currentDate.hour === BusinessHoursConfig.lunchStartHour && currentDate.minute >= BusinessHoursConfig.lunchStartMinute)) &&
        (currentDate.hour < BusinessHoursConfig.lunchEndHour || 
         (currentDate.hour === BusinessHoursConfig.lunchEndHour && currentDate.minute < BusinessHoursConfig.lunchEndMinute))) {
      currentDate = currentDate.set({
        hour: BusinessHoursConfig.lunchStartHour,
        minute: BusinessHoursConfig.lunchStartMinute,
        second: 0,
        millisecond: 0
      });
    }
  }

  return colombiaTimeToUtc(currentDate);
}

/**
 * Gets the next business day start time
 */
export async function getNextBusinessDayStart(date: DateTime): Promise<DateTime> {
  // Move to next day at business start time
  let nextDay = date.plus({ days: 1 }).set({
    hour: BusinessHoursConfig.startHour,
    minute: BusinessHoursConfig.startMinute,
    second: 0,
    millisecond: 0
  });
  
  // Keep moving forward until we find a working day
  while (!await isWorkingDay(nextDay.toJSDate())) {
    nextDay = nextDay.plus({ days: 1 }).set({
      hour: BusinessHoursConfig.startHour,
      minute: BusinessHoursConfig.startMinute,
      second: 0,
      millisecond: 0
    });
  }
  
  return nextDay;
}

/**
 * Gets the start of business hours for a given date
 */
export function getBusinessDayStart(date: DateTime): DateTime {
  return date.set({
    hour: BusinessHoursConfig.startHour,
    minute: BusinessHoursConfig.startMinute,
    second: 0,
    millisecond: 0
  });
}