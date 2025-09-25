import { z } from 'zod';

/**
 * Schema for validating working days calculation request parameters
 */
export const workingDaysQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || (Number.isInteger(val) && val >= 0), {
      message: 'Days must be a positive integer'
    }),
  
  hours: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || (Number.isInteger(val) && val >= 0), {
      message: 'Hours must be a positive integer'
    }),
  
  date: z
    .string()
    .optional()
    .refine((val) => {
      if (val === undefined) return true;
      
      // Check if date has Z suffix (UTC)
      if (!val.endsWith('Z')) {
        return false;
      }
      
      // Check if date is valid
      const parsedDate = new Date(val);
      return !isNaN(parsedDate.getTime());
    }, {
      message: 'Date must be in UTC format with Z suffix and be a valid ISO 8601 date'
    })
}).refine((data) => {
  // At least one of days or hours must be provided
  return data.days !== undefined || data.hours !== undefined;
}, {
  message: 'At least one of days or hours must be provided',
  path: ['days'] // This will show the error on the days field
});

/**
 * Type inference from the schema
 */
export type WorkingDaysQuery = z.infer<typeof workingDaysQuerySchema>;

/**
 * Schema for health check endpoint (no parameters needed)
 */
export const healthCheckSchema = z.object({});

/**
 * Utility function to validate and parse working days query parameters
 */
export const validateWorkingDaysQuery = (query: unknown) => {
  return workingDaysQuerySchema.parse(query);
};

/**
 * Utility function to safely validate working days query parameters
 * Returns either the parsed data or validation errors
 */
export const safeValidateWorkingDaysQuery = (query: unknown) => {
  return workingDaysQuerySchema.safeParse(query);
};