import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, handleAdminError } from '../supabaseAdmin.js';
import { validateBody } from '../middleware/validation.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/route-helpers.js';
import { z } from 'zod';
import { tokenValidationSchema } from '../schemas/auth.js';
import { storeUserSession, getUserSession, removeUserSession } from '../utils/sessionStorage.js';

const router = express.Router();

// Define schemas for request validation
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const testLoginSchema = z.object({
  username: z.string().min(1, "Username is required")
});

/**
 * @route POST /api/auth/login
 * @description Log in with email and password
 * @access Public
 */
router.post('/login', 
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    
    console.log(`[Auth] Login attempt for: ${email}`);
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('[Auth] Login failed:', error);
      sendError(
        res, 
        error.message, 
        error.code || 'AUTHENTICATION_ERROR', 
        401
      );
      return;
    }
    
    console.log('[Auth] Login successful for:', email);
    
    // Return user and session information
    sendSuccess(res, {
      user: data.user,
      session: data.session
    });
  })
);

// For development testing only - do not use in production
// This endpoint allows developers to easily test the system with predefined test accounts
if (process.env.NODE_ENV === 'development') {
  /**
   * @route POST /api/auth/dev-login
   * @description Development-only endpoint to log in with test accounts
   * @access Development only
   */
  router.post('/dev-login', 
    validateBody(testLoginSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { username } = req.body;
      
      console.log('[DEV] Test login requested for:', username);
      
      // Define test accounts (in development only)
      const TEST_ACCOUNTS: Record<string, {email: string, password: string}> = {
        'test': { email: 'test@example.com', password: 'password123' },
        'admin': { email: 'admin@example.com', password: 'admin123' },
        'daniel': { email: 'danielrsolomon@gmail.com', password: 'password123' }
      };
      
      // Check if requested username exists
      if (!TEST_ACCOUNTS[username]) {
        console.log('[DEV] Invalid test account requested:', username);
        sendError(
          res,
          `Invalid test account. Available accounts: ${Object.keys(TEST_ACCOUNTS).join(', ')}`,
          'INVALID_TEST_ACCOUNT',
          400
        );
        return;
      }
      
      const { email, password } = TEST_ACCOUNTS[username];
      
      // Attempt to sign in with Supabase
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('[DEV] Test login failed:', error);
        sendError(
          res,
          `Test login failed: ${error.message}`,
          error.code || 'DEV_LOGIN_ERROR',
          401
        );
        return;
      }
      
      console.log('[DEV] Test login successful for:', username);
      
      // Return user and session information for test login
      sendSuccess(res, {
        user: data.user,
        session: data.session
      });
    })
  );
}

/**
 * @route POST /api/auth/logout
 * @description Log out the current user
 * @access Public
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Extract token from authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  if (token) {
    // If we have a token, get the user ID first
    try {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user?.id) {
        // Remove the user's session from our storage
        await removeUserSession(data.user.id);
      }
    } catch (err) {
      console.error('Error getting user for session removal:', err);
    }
    
    // Then sign out the specific session
    await supabaseAdmin.auth.admin.signOut(token);
  } else {
    // Without a token, this just invalidates cookies, which doesn't apply to API
    await supabaseAdmin.auth.signOut();
  }
  
  sendSuccess(res, { message: 'Logged out successfully' });
}));

/**
 * GET /api/auth/session
 * 
 * Retrieves the user session based on the provided token
 * The token should be sent in the Authorization header as "Bearer <token>"
 */
router.get('/session', asyncHandler(async (req: Request, res: Response) => {
  // Extract token from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // If no token is provided, return a 401 Unauthorized response
  if (!token) {
    sendError(res, 'No authorization token provided', 'AUTH_ERROR', 401);
    return;
  }

  // Use the admin client to retrieve user information from the token
  const { data: user, error } = await supabaseAdmin.auth.getUser(token);

  // If there's an error or no user found, return a 401 Unauthorized response
  if (error || !user) {
    console.error('Error getting user session:', error);
    sendError(res, error?.message || 'Invalid or expired token', 'AUTH_ERROR', 401);
    return;
  }

  // Check if we have a stored session for this user
  const userId = user.user?.id;
  let sessionData = null;
  
  if (userId) {
    // Try to get existing session from storage
    sessionData = await getUserSession(userId);
    
    // If no session exists or it's expired, create a new one
    if (!sessionData || !sessionData.expires_at || sessionData.expires_at < Date.now()) {
      // Create new session data
      sessionData = {
        access_token: token,
        token_type: 'bearer',
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
        user_id: userId
      };
      
      // Store the session
      await storeUserSession(userId, sessionData);
    }
  }

  // Return the user session data
  sendSuccess(res, { 
    user: user.user,
    session: sessionData || {
      access_token: token,
      token_type: 'bearer',
      expires_at: Date.now() + (24 * 60 * 60 * 1000) // Default to 24 hours from now
    }
  });
}));

/**
 * POST /api/auth/validate-token
 * 
 * Validates a token without returning user data
 * Useful for quickly checking if a token is valid
 */
router.post('/validate-token', validateBody(tokenValidationSchema), asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !data) {
    sendSuccess(res, { 
      valid: false,
      error: error?.message || 'Invalid token'
    });
    return;
  }

  sendSuccess(res, { 
    valid: true,
    userId: data.user?.id
  });
}));

/**
 * GET /api/auth/user
 * 
 * Retrieves the user data based on the provided token
 * The token should be sent in the Authorization header as "Bearer <token>"
 */
router.get('/user', asyncHandler(async (req: Request, res: Response) => {
  // Extract token from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // If no token is provided, return a 401 Unauthorized response
  if (!token) {
    sendError(res, 'No authorization token provided', 'AUTH_ERROR', 401);
    return;
  }

  // Use the admin client to retrieve user information from the token
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  // If there's an error or no user found, return a 401 Unauthorized response
  if (error || !data) {
    console.error('Error getting user data:', error);
    sendError(res, error?.message || 'Invalid or expired token', 'AUTH_ERROR', 401);
    return;
  }

  // Return the user data
  sendSuccess(res, data.user);
}));

export default router; 