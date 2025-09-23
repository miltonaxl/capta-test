import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let error = 'InternalServerError';

  // Handle custom API errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    error = getErrorType(statusCode);
  }

  // Log error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    timestamp: new Date().toISOString()
  });

  // Send error response
  res.status(statusCode).json({
    error,
    message,
    ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack })
  });
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent endpoints
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'NotFound',
    message: 'Endpoint not found'
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Get error type based on status code
 */
function getErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'BadRequest';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'NotFound';
    case 422:
      return 'InvalidParameters';
    case 429:
      return 'TooManyRequests';
    case 500:
      return 'InternalServerError';
    case 503:
      return 'ServiceUnavailable';
    default:
      return 'InternalServerError';
  }
}

/**
 * Common error creators for convenience
 */
export const createError = {
  badRequest: (message: string) => new ApiError(400, message),
  unauthorized: (message: string) => new ApiError(401, message),
  forbidden: (message: string) => new ApiError(403, message),
  notFound: (message: string) => new ApiError(404, message),
  invalidParameters: (message: string) => new ApiError(422, message),
  tooManyRequests: (message: string) => new ApiError(429, message),
  internal: (message: string) => new ApiError(500, message),
  serviceUnavailable: (message: string) => new ApiError(503, message)
};