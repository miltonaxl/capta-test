import { Request, Response } from 'express';
import { workingDaysService } from '../services/workingDaysService';
import { WorkingDaysResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

class WorkingDaysController {
  /**
   * Handles the working days calculation request
   */
  calculateWorkingDays = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { days, hours, date } = req.query;

    // Parse and validate parameters
    const parsedDays = days ? parseInt(days as string, 10) : undefined;
    const parsedHours = hours ? parseInt(hours as string, 10) : undefined;
    
    try {
      workingDaysService.validateParameters(parsedDays, parsedHours, date as string);
    } catch (error) {
      if (error instanceof Error) {
        throw createError.badRequest(error.message);
      }
      throw createError.badRequest('Invalid parameters');
    }

    try {
      // Calculate result
      const resultDate = await workingDaysService.calculateWorkingDateTime(
        parsedDays,
        parsedHours,
        date ? new Date(date as string) : undefined
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