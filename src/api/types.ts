import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from './middleware/auth';

// Define a custom handler type that allows returning Response objects 
// but is compatible with Express's router methods
export type AsyncRequestHandler = (
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>> | undefined>;

// Custom handlers that work with AuthenticatedRequest
export type AuthenticatedRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>> | undefined>;

// Helper function to cast an async handler to a RequestHandler type
// This helps TypeScript understand that our handlers are compatible with Express
export const asyncHandler = (handler: AsyncRequestHandler): RequestHandler => 
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// Helper function to cast an authenticated async handler to a RequestHandler type
export const authHandler = (handler: AuthenticatedRequestHandler): RequestHandler => 
  (req, res, next) => Promise.resolve(handler(req as AuthenticatedRequest, res, next)).catch(next); 