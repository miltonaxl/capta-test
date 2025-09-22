export interface WorkingDaysRequest {
  days?: number;
  hours?: number;
  date?: string;
}

export interface WorkingDaysResponse {
  date: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface ColombianHoliday {
  date: string;
  name: string;
  type: 'national' | 'regional';
}

export interface BusinessHours {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  lunchStartHour: number;
  lunchStartMinute: number;
  lunchEndHour: number;
  lunchEndMinute: number;
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Luxon: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday

export const BusinessHoursConfig: BusinessHours = {
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  lunchStartHour: 12,
  lunchStartMinute: 0,
  lunchEndHour: 13,
  lunchEndMinute: 0,
};