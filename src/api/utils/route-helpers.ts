/**
 * Helper utilities for Express route handlers to address TypeScript compatibility issues
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Type for Express async route handlers
 * This allows handlers to be properly typed while using async/await
 */
export type AsyncRequestHandler<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an async route handler to properly catch errors and pass them to next()
 * This solves the TypeScript typing issues with Express route handlers
 * 
 * @param fn The async route handler function
 * @returns A wrapped request handler that forwards errors to next()
 */
export const asyncHandler = <P = Record<string, any>, ResBody = any, ReqBody = any, ReqQuery = Record<string, any>>(
  fn: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standard API success response
 * @param res Express response object
 * @param data The data to include in the response
 * @param status HTTP status code (default: 200)
 */
export const sendSuccess = (res: Response, data: any, status = 200): void => {
  res.status(status).json({
    success: true,
    data
  });
};

/**
 * Standard API error response
 * @param res Express response object
 * @param message Error message
 * @param code Error code
 * @param status HTTP status code (default: 400)
 * @param details Additional error details
 */
export const sendError = (
  res: Response,
  message: string,
  code = 'ERROR',
  status = 400,
  details?: any
): void => {
  res.status(status).json({
    success: false,
    data: [],
    error: {
      message,
      code,
      ...(details ? { details } : {})
    }
  });
}; 