import { NextFunction, Request, Response } from 'express';
import { supabaseAdmin, getUserFromToken, validateToken } from '../supabaseAdmin';
import { throwApiError } from './error-handler';
import { AuthUser } from '../../types/auth';

/**
 * Simplified AuthenticatedRequest type that leverages our global Express.Request extension.
 * This means route handlers can access req.user properly typed without additional generics.
 * 
 * Usage examples:
 * - Basic: req: AuthenticatedRequest
 * - With params: req: AuthenticatedRequest<{ programId: string }>
 * - With body: req: AuthenticatedRequest<{}, ProgramData>
 */
export type AuthenticatedRequest<P = {}, B = any> = Request<P, any, B, any>;

/**
 * Middleware to require authentication
 * Verifies the JWT token and loads user data with roles
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth Middleware] Missing or invalid Authorization header');
      return throwApiError('Authentication required', 401, 'UNAUTHORIZED');
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      console.error('[Auth Middleware] Token is empty after extracting from Authorization header');
      return throwApiError('Invalid token format', 401, 'INVALID_TOKEN_FORMAT');
    }
    
    console.log('[Auth Middleware] Token extracted from header, validating...');
    
    // First, directly validate the token to extract user info
    // This provides a fallback in case the DB lookup fails
    const tokenValidation = validateToken(token);
    
    if (!tokenValidation.valid || !tokenValidation.userId) {
      console.error('[Auth Middleware] Token validation failed:', tokenValidation.error);
      return throwApiError(tokenValidation.error || 'Invalid token', 401, 'INVALID_TOKEN');
    }
    
    console.log(`[Auth Middleware] Token contains valid user ID: ${tokenValidation.userId}`);
    console.log(`[Auth Middleware] Token payload:`, tokenValidation.payload);
    
    // Create a user object from token first so we have something even if DB lookup fails
    // Some Supabase JWT tokens include basic user information we can use
    const tokenPayload = tokenValidation.payload || {};
    const fallbackUser = {
      id: tokenValidation.userId,
      email: tokenPayload.email || `${tokenValidation.userId}@user.example.com`,
      roles: ['user'], // Default fallback role
      role: 'user'
    };
    
    // When token contains user information (like email), we can be more confident using it directly
    const hasUserInfoInToken = !!tokenPayload.email;
    
    // Use our custom token validation that avoids Supabase auth localStorage issues
    const { data, error } = await getUserFromToken(token);
    
    // If we have a DB error but the token itself is valid, we use the fallback user
    if ((error || !data) && tokenValidation.valid) {
      console.warn('[Auth Middleware] Database lookup failed but token is valid. Using token data as fallback.');
      console.log('[Auth Middleware] Fallback user:', fallbackUser);
      
      // If we detected the payload contains user info, we can be more confident
      if (hasUserInfoInToken) {
        console.log('[Auth Middleware] Token contains user info (email), using fallback is safer');
      } else {
        console.log('[Auth Middleware] Token does not contain user info, fallback is basic');
      }
      
      // Use the fallback user data from token
      req.user = fallbackUser;
      
      console.log('[Auth Middleware] Using fallback user data from token:', req.user);
      next();
      return;
    }
    
    // Standard error handling for invalid tokens
    if (error) {
      console.error('[Auth Middleware] Token validation error:', error);
      if (error.code === 'INVALID_TOKEN') {
        return throwApiError('Invalid token format', 401, 'INVALID_TOKEN_FORMAT');
      } else if (error.message?.includes('expired')) {
        return throwApiError('Token expired', 401, 'TOKEN_EXPIRED');
      } else {
        return throwApiError(error.message || 'Invalid or expired token', 401, 'INVALID_TOKEN');
      }
    }

    if (!data) {
      console.error('[Auth Middleware] Token valid but no user data returned');
      return throwApiError('User not found', 401, 'USER_NOT_FOUND');
    }
    
    console.log('[Auth Middleware] Token validated successfully for user:', data.id);
    
    // Check if user is active
    if (!data.is_active) {
      console.error('[Auth Middleware] Account is inactive:', data.id);
      return throwApiError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
    }
    
    // Add user data to request (properly typed thanks to our global interface extension)
    req.user = {
      id: data.id,
      email: data.email,
      roles: data.roles || ['user'],
      // Add the primary role as a convenience property
      role: data.roles && data.roles.length > 0 ? data.roles[0] : 'user'
    };
    
    console.log('[Auth Middleware] Authentication successful for user:', data.id);
    next();
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error during authentication:', error);
    next(error);
  }
};

/**
 * Middleware to require specific role(s)
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return throwApiError('Authentication required', 401, 'UNAUTHORIZED');
    }
    
    const hasRole = req.user.roles.some((role: string) => allowedRoles.includes(role));
    
    if (!hasRole) {
      return throwApiError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    next();
  };
}; 