import { Request, Response, NextFunction } from 'express';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;

  constructor(message: string, statusCode = 400, code = 'API_ERROR', details?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Create a standard error response to ensure consistent format
 * @param statusCode HTTP status code
 * @param message Error message
 * @param code Error code
 * @param details Additional error details
 * @returns Standardized error response object
 */
export function createErrorResponse(
  statusCode: number = 500,
  message: string = 'Internal Server Error',
  code: string = 'INTERNAL_ERROR',
  details: any = null
) {
  return {
    success: false,
    data: [], // Always include empty data array for consistency
    error: {
      code,
      message,
      details: details || undefined
    }
  };
}

/**
 * Central error handler middleware
 */
export function errorHandler(err: Error | ApiError | PostgrestError | any, req: Request, res: Response, next: NextFunction) {
  let statusCode = 500;
  let errorMessage = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';
  let errorDetails = null;

  console.log('DEBUG - Error Handler Received:', {
    errorType: err.constructor.name,
    message: err.message,
    stack: err.stack?.substring(0, 200) + '...',
    isApiError: err instanceof ApiError
  });

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorCode = err.code || 'API_ERROR';
    errorDetails = err.details;
  } else if (typeof err === 'object' && err !== null) {
    // Handle Supabase PostgrestError
    if ('code' in err) {
      const pgError = err;
      statusCode = 400;
      errorMessage = pgError.message || 'Database Error';
      errorCode = String(pgError.code);
      
      // Map common postgres error codes to user-friendly messages
      if (pgError.code === '23505') {
        errorMessage = 'A record with this information already exists';
        errorCode = 'DUPLICATE_RECORD';
      } else if (pgError.code === '23503') {
        errorMessage = 'Referenced record does not exist';
        errorCode = 'FOREIGN_KEY_VIOLATION';
      }
    } else if (err.name === 'PostgrestError' || err.constructor?.name === 'PostgrestError') {
      // Handle newer Supabase errors
      statusCode = 400;
      errorMessage = err.message || 'Supabase API Error';
      errorCode = 'SUPABASE_ERROR';
      errorDetails = err;
    }
  } else if (err instanceof Error) {
    // Handle generic Error objects
    errorMessage = err.message || 'An unexpected error occurred';
    errorDetails = err.stack;
  }

  // For development only - more detailed error logging
  console.error(`API Error (${errorCode}):`, err);

  // Create a standardized error response
  const errorResponse = createErrorResponse(
    statusCode,
    errorMessage,
    errorCode,
    errorDetails
  );

  console.log('DEBUG - Final Error Response:', JSON.stringify(errorResponse, null, 2));

  // Ensure content-type is set to application/json
  res.setHeader('Content-Type', 'application/json');
  res.status(statusCode).json(errorResponse);
}

/**
 * Not found handler middleware
 */
export function notFoundHandler(req: Request, res: Response) {
  const notFoundResponse = {
    success: false,
    data: [],
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND'
    }
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json(notFoundResponse);
}

/**
 * Helper function to throw API errors that will be caught by the error handler middleware
 * Use this in your route handlers when you need to stop execution and return an error response
 */
export function throwApiError(message: string, statusCode = 400, code = 'API_ERROR', details?: Record<string, any>): never {
  throw new ApiError(message, statusCode, code, details);
}

/**
 * Helper function to send an API error response directly
 * Use this when you need more control over the response and don't want to throw an error
 */
export function sendApiError(res: Response, message: string, statusCode = 400, code = 'API_ERROR', details?: Record<string, any>) {
  const errorResponse = {
    success: false,
    data: [], // Always include empty data array
    error: {
      message,
      code,
      // Only include details in non-production environments or for non-500 errors
      ...(process.env.NODE_ENV !== 'production' || statusCode !== 500) && details ? { details } : {}
    }
  };
  
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(errorResponse);
} 