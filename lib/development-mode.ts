/**
 * Development Mode Configuration
 * 
 * This file contains helper functions and configurations for development mode.
 * IMPORTANT: These should NOT be used in production.
 */

// Check both NODE_ENV and the explicit bypass flag
export const DEVELOPMENT_MODE = process.env.NODE_ENV === 'development' && 
  (process.env.NEXT_PUBLIC_DEV_BYPASS_RLS === 'true' || process.env.NEXT_PUBLIC_DEV_BYPASS_RLS === undefined);

// Log development mode status for debugging
if (typeof window !== 'undefined') {
  console.log('[DEV MODE]', { 
    enabled: DEVELOPMENT_MODE, 
    nodeEnv: process.env.NODE_ENV,
    bypassRls: process.env.NEXT_PUBLIC_DEV_BYPASS_RLS
  });
}

// Emulated user roles for development (simulating a user with all permissions)
export const DEV_USER_ROLES = ['admin', 'content_manager', 'instructor'];

// Helper to check if user has a specific role in development mode
export function devHasRole(role: string): boolean {
  if (!DEVELOPMENT_MODE) return false;
  return DEV_USER_ROLES.includes(role);
}

// Development mode feedback messages
export const DEV_MESSAGES = {
  RLS_ERROR: "RLS Policy Error detected in development mode. In production, users would need the appropriate roles.",
  MOCK_AUTH: "Using mock authentication for development."
}; 