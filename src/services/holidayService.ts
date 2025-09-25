import axios from 'axios';
import { ColombianHoliday } from '../types';

class HolidayService {
  private holidaysCache: Map<number, string[]> = new Map();
  private allHolidaysCache: string[] | null = null;
  private readonly HOLIDAYS_URL = 'https://content.capta.co/Recruitment/WorkingDays.json';

  // Festivos fijos de Colombia (que no cambian de fecha)
  private readonly FIXED_HOLIDAYS = [
    { month: 1, day: 1, name: 'Año Nuevo' },
    { month: 5, day: 1, name: 'Día del Trabajo' },
    { month: 7, day: 20, name: 'Día de la Independencia' },
    { month: 8, day: 7, name: 'Batalla de Boyacá' },
    { month: 12, day: 8, name: 'Inmaculada Concepción' },
    { month: 12, day: 25, name: 'Navidad' }
  ];

  // Festivos que se trasladan al lunes siguiente si caen en día diferente
  private readonly MOVABLE_HOLIDAYS = [
    { month: 1, day: 6, name: 'Día de los Reyes Magos' },
    { month: 3, day: 19, name: 'Día de San José' },
    { month: 6, day: 29, name: 'San Pedro y San Pablo' },
    { month: 8, day: 15, name: 'Asunción de la Virgen' },
    { month: 10, day: 12, name: 'Día de la Raza' },
    { month: 11, day: 1, name: 'Día de Todos los Santos' },
    { month: 11, day: 11, name: 'Independencia de Cartagena' }
  ];

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
   * Calculates Colombian holidays for a specific year using local logic
   */
  private calculateColombianHolidays(year: number): ColombianHoliday[] {
    const holidays: ColombianHoliday[] = [];

    // Add fixed holidays
    for (const holiday of this.FIXED_HOLIDAYS) {
      const date = new Date(year, holiday.month - 1, holiday.day);
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr) {
        holidays.push({
          date: dateStr,
          name: holiday.name,
          type: 'national'
        });
      }
    }

    // Add movable holidays (moved to Monday if they fall on other days)
    for (const holiday of this.MOVABLE_HOLIDAYS) {
      const originalDate = new Date(year, holiday.month - 1, holiday.day);
      let finalDate = originalDate;

      // If it's not Monday (1), move to next Monday
      if (originalDate.getDay() !== 1) {
        const daysToAdd = (8 - originalDate.getDay()) % 7;
        finalDate = new Date(originalDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      }

      const dateStr = finalDate.toISOString().split('T')[0];
      if (dateStr) {
        holidays.push({
          date: dateStr,
          name: holiday.name,
          type: 'national'
        });
      }
    }

    // Add Easter-based holidays (Semana Santa)
    const easterDate = this.calculateEaster(year);
    
    // Jueves Santo (Thursday before Easter)
    const holyThursday = new Date(easterDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    const holyThursdayStr = holyThursday.toISOString().split('T')[0];
    if (holyThursdayStr) {
      holidays.push({
        date: holyThursdayStr,
        name: 'Jueves Santo',
        type: 'national'
      });
    }

    // Viernes Santo (Friday before Easter)
    const goodFriday = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const goodFridayStr = goodFriday.toISOString().split('T')[0];
    if (goodFridayStr) {
      holidays.push({
        date: goodFridayStr,
        name: 'Viernes Santo',
        type: 'national'
      });
    }

    // Ascensión del Señor (39 days after Easter, moved to Monday)
    const ascension = new Date(easterDate.getTime() + 39 * 24 * 60 * 60 * 1000);
    const ascensionMonday = this.moveToNextMonday(ascension);
    const ascensionStr = ascensionMonday.toISOString().split('T')[0];
    if (ascensionStr) {
      holidays.push({
        date: ascensionStr,
        name: 'Ascensión del Señor',
        type: 'national'
      });
    }

    // Corpus Christi (60 days after Easter, moved to Monday)
    const corpusChristi = new Date(easterDate.getTime() + 60 * 24 * 60 * 60 * 1000);
    const corpusChristiMonday = this.moveToNextMonday(corpusChristi);
    const corpusChristiStr = corpusChristiMonday.toISOString().split('T')[0];
    if (corpusChristiStr) {
      holidays.push({
        date: corpusChristiStr,
        name: 'Corpus Christi',
        type: 'national'
      });
    }

    // Sagrado Corazón de Jesús (68 days after Easter, moved to Monday)
    const sacredHeart = new Date(easterDate.getTime() + 68 * 24 * 60 * 60 * 1000);
    const sacredHeartMonday = this.moveToNextMonday(sacredHeart);
    const sacredHeartStr = sacredHeartMonday.toISOString().split('T')[0];
    if (sacredHeartStr) {
      holidays.push({
        date: sacredHeartStr,
        name: 'Sagrado Corazón de Jesús',
        type: 'national'
      });
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculates Easter date for a given year using the algorithm
   */
  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
  }

  /**
   * Moves a date to the next Monday if it's not already Monday
   */
  private moveToNextMonday(date: Date): Date {
    if (date.getDay() === 1) return date; // Already Monday
    const daysToAdd = (8 - date.getDay()) % 7;
    return new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
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
      
      // Check if we have holidays for the requested year
      const yearHolidays = allHolidays.filter(dateStr => {
        if (!dateStr) return false;
        const holidayYear = new Date(dateStr).getFullYear();
        return holidayYear === year;
      });

      // If no holidays found for this year in external API, use local implementation
      if (yearHolidays.length === 0) {
        console.warn(`No holidays found for year ${year} in external API, using local implementation`);
        const localHolidays = this.calculateColombianHolidays(year);
        // Cache the local holidays
        this.holidaysCache.set(year, localHolidays.map(h => h.date));
        return localHolidays;
      }

      // Cache the result
      this.holidaysCache.set(year, yearHolidays);
      
      // Convert to our format
      return yearHolidays.map(date => ({
        date: date,
        name: 'Día Festivo',
        type: 'national' as const
      }));
    } catch (error) {
      console.error(`Error fetching holidays for year ${year}, using local implementation:`, error);
      const localHolidays = this.calculateColombianHolidays(year);
      // Cache the local holidays
      this.holidaysCache.set(year, localHolidays.map(h => h.date));
      return localHolidays;
    }
  }

  /**
   * Gets Colombian holidays using local implementation as fallback
   */
  async getColombianHolidays(): Promise<ColombianHoliday[]> {
    try {
      const allHolidays = await this.fetchAllHolidays();
      
      // Check if we have holidays for current and next year
      const currentYear = new Date().getFullYear();
      const hasCurrentYear = allHolidays.some(dateStr => {
        if (!dateStr) return false;
        return new Date(dateStr).getFullYear() === currentYear;
      });
      const hasNextYear = allHolidays.some(dateStr => {
        if (!dateStr) return false;
        return new Date(dateStr).getFullYear() === currentYear + 1;
      });
      
      // If external API doesn't have recent data, use local implementation
      if (!hasCurrentYear && !hasNextYear) {
        console.warn('External API lacks recent holiday data, using local implementation');
        return this.getLocalColombianHolidays();
      }
      
      // Convert to our format
      return allHolidays.map(date => ({
        date: date,
        name: 'Día Festivo',
        type: 'national' as const
      }));
    } catch (error) {
      console.error('Error fetching Colombian holidays from external API, using local implementation:', error);
      return this.getLocalColombianHolidays();
    }
  }

  private getLocalColombianHolidays(): ColombianHoliday[] {
    const currentYear = new Date().getFullYear();
    const holidays: ColombianHoliday[] = [];
    
    // Generate holidays for current year and next 2 years
    for (let year = currentYear; year <= currentYear + 2; year++) {
      holidays.push(...this.calculateColombianHolidays(year));
    }
    
    return holidays;
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