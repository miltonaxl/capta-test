import { Request, Response } from 'express';
import { workingDaysService } from '../services/workingDaysService';
import { WorkingDaysResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { safeValidateWorkingDaysQuery } from '../schemas/validation';

class WorkingDaysController {
  /**
   * Handles the working days calculation request
   */
  calculateWorkingDays = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate parameters using Zod
    const validationResult = safeValidateWorkingDaysQuery(req.query);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((err: any) => err.message).join(', ');
      throw createError.badRequest(`Validation error: ${errorMessages}`);
    }

    const { days, hours, date } = validationResult.data;

    try {
      // Calculate result
      const resultDate = await workingDaysService.calculateWorkingDateTime(
        days,
        hours,
        date ? new Date(date) : undefined
      );

      // Format response
      const response: WorkingDaysResponse = {
        date: resultDate.toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('failed to fetch') || errorMessage.includes('api error')) {
          throw createError.serviceUnavailable('Holiday service is temporarily unavailable');
        }
      }
      throw createError.internal('An error occurred while calculating working days');
    }
  });

  /**
   * Health check endpoint
   */
  healthCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Colombia Working Days API'
    });
  });
}

export const workingDaysController = new WorkingDaysController();