/**
 * Type declarations for authentication-related interfaces.
 * These extend the Express Request interface to include our custom properties.
 */

import { Request } from 'express';

/**
 * Represents the authenticated user with their roles and permissions.
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  role?: string; // Primary role (first in the roles array)
}

/**
 * Extends the Express Request interface to include our authenticated user object.
 * This provides proper type safety for API routes.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
} 