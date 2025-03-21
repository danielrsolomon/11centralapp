import { Response } from 'express';

/**
 * Standard API error format for consistent error responses
 */
export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

/**
 * Helper function to throw standard API errors
 * @param message Human-readable error message
 * @param status HTTP status code
 * @param code Machine-readable error code
 * @param details Additional error details
 */
export function throwApiError(
  message: string, 
  status: number = 500, 
  code: string = 'INTERNAL_ERROR',
  details?: any
): never {
  const error: ApiError & { status: number } = {
    message,
    code,
    status,
    details
  };
  
  throw error;
}

/**
 * Middleware to handle API errors
 */
export function handleApiError(err: any, req: any, res: Response, next: any) {
  console.error('API Error:', err);
  
  // If this is a known API error that we threw deliberately
  if (err && err.code && err.status) {
    return res.status(err.status).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details
      }
    });
  }
  
  // Default error for unexpected exceptions
  return res.status(500).json({
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
}

/**
 * Helper to send API errors directly from a route handler
 */
export function sendApiError(
  res: Response,
  message: string,
  status: number = 400,
  code: string = 'BAD_REQUEST',
  details?: any
) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
      details
    }
  });
} 