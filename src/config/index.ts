/**
 * Application configuration
 */
export const config = {
  // Business hours configuration
  businessHours: {
    start: 8, // 8:00 AM
    end: 17,  // 5:00 PM
    lunchStart: 12, // 12:00 PM
    lunchEnd: 13,   // 1:00 PM
  },
  
  // Timezone configuration
  timezone: 'America/Bogota',
  
  // API configuration
  api: {
    port: process.env['PORT'] || 3000,
    version: 'v1',
  },
  
  // Cache configuration
  cache: {
    holidaysCacheDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  }
};

export default config;