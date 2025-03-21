import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { AuthenticatedRequest } from './auth';

/**
 * Type-safe wrapper for Express async route handlers.
 * This properly handles the Promise chain and ensures error propagation.
 */
export function asyncHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response,
    next: NextFunction
  ) => Promise<any>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return function(req, res, next) {
    // Important: Do NOT return the Promise chain
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Type-safe wrapper for Express async route handlers that require authentication.
 * This properly handles the Promise chain and ensures error propagation.
 */
export function authAsyncHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
>(
  fn: (
    req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
    res: Response,
    next: NextFunction
  ) => Promise<any>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return function(req, res, next) {
    // Cast to authenticated request and handle Promise rejection
    Promise.resolve(fn(req as AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, res, next)).catch(next);
  };
}

/**
 * Usage examples:
 * 
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   
 *   // Important: Don't use "return" with res.json()
 *   res.json({ success: true, data });
 * }));
 * 
 * router.post('/', authAsyncHandler(async (req, res) => {
 *   const userId = req.user?.id;  // Access authenticated user
 *   const data = await createSomething(userId);
 *   
 *   // Important: Don't use "return" with res.json()
 *   res.status(201).json({ success: true, data });
 * }));
 */ 