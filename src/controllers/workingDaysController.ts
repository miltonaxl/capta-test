import { Request, Response } from 'express';
import { workingDaysService } from '../services/workingDaysService';
import { WorkingDaysResponse, ErrorResponse } from '../types';

class WorkingDaysController {
  /**
   * Handles the working days calculation request
   */
  async calculateWorkingDays(req: Request, res: Response): Promise<void> {
    try {
      const { days, hours, date } = req.query;

      // Parse and validate parameters
      const parsedDays = days ? parseInt(days as string, 10) : undefined;
      const parsedHours = hours ? parseInt(hours as string, 10) : undefined;
      
      workingDaysService.validateParameters(parsedDays, parsedHours, date as string);

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
      this.handleError(error, res);
    }
  }

  /**
   * Handles different types of errors and sends appropriate responses
   */
  private handleError(error: unknown, res: Response): void {
    console.error('Error in working days calculation:', error);

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('invalid') || errorMessage.includes('must be')) {
        const errorResponse: ErrorResponse = {
          error: 'InvalidParameters',
          message: error.message
        };
        res.status(400).json(errorResponse);
        return;
      }
      
      if (errorMessage.includes('failed to fetch') || errorMessage.includes('api error')) {
        const errorResponse: ErrorResponse = {
          error: 'ServiceUnavailable',
          message: 'Holiday service is temporarily unavailable'
        };
        res.status(503).json(errorResponse);
        return;
      }
    }

    // Generic error response
    const errorResponse: ErrorResponse = {
      error: 'InternalError',
      message: 'An internal server error occurred'
    };
    res.status(500).json(errorResponse);
  }

  /**
   * Health check endpoint
   */
  healthCheck(_req: Request, res: Response): void {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Colombia Working Days API'
    });
  }
}

export const workingDaysController = new WorkingDaysController();