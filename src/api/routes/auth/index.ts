import express from 'express';
import { supabaseAdmin } from '../../supabaseAdmin.js';
import { validateBody } from '../../middleware/validation.js';
import { asyncHandler, sendSuccess, sendError } from '../../utils/route-helpers.js';
import { requireAuth } from '../../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required")
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters")
});

const updateUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  avatar_url: z.string().optional()
});

/**
 * @route POST /api/auth/login
 * @description Log in with email and password
 * @access Public
 */
router.post('/login', 
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Error logging in:', error);
        return sendError(res, error.message, error.code, 401);
      }
      
      return sendSuccess(res, {
        user: data.user,
        session: data.session
      });
    } catch (err) {
      console.error('Unexpected error during login:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error logging in',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/auth/signup
 * @description Sign up a new user
 * @access Public
 */
router.post('/signup', 
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const { email, password, first_name, last_name } = req.body;
    
    try {
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name,
            last_name
          }
        }
      });
      
      if (error) {
        console.error('Error signing up:', error);
        return sendError(res, error.message, error.code, 400);
      }
      
      return sendSuccess(res, {
        user: data.user,
        session: data.session
      });
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error signing up',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/auth/logout
 * @description Log out the current user
 * @access Private
 */
router.post('/logout', 
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      // Extract token from authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
      
      if (token) {
        await supabaseAdmin.auth.admin.signOut(token);
      }
      
      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      console.error('Unexpected error during logout:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error during logout',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route GET /api/auth/user
 * @description Get current user information
 * @access Private
 */
router.get('/user', 
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      return sendSuccess(res, { user: req.user });
    } catch (err) {
      console.error('Unexpected error getting user:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error getting user',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route PUT /api/auth/user
 * @description Update user profile
 * @access Private
 */
router.put('/user', 
  requireAuth,
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          user_metadata: updates 
        }
      );
      
      if (error) {
        console.error('Error updating user:', error);
        return sendError(res, error.message, error.code, 400);
      }
      
      return sendSuccess(res, { user: data.user });
    } catch (err) {
      console.error('Unexpected error updating user:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error updating user',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/auth/reset-password
 * @description Request password reset email
 * @access Public
 */
router.post('/reset-password', 
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.protocol}://${req.get('host')}/reset-password/confirm`
      });
      
      if (error) {
        console.error('Error requesting password reset:', error);
        return sendError(res, error.message, error.code, 400);
      }
      
      return sendSuccess(res, { 
        message: 'Password reset email sent' 
      });
    } catch (err) {
      console.error('Unexpected error requesting password reset:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error requesting password reset',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/auth/update-password
 * @description Update user password
 * @access Private
 */
router.post('/update-password', 
  requireAuth,
  validateBody(updatePasswordSchema),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user!.id;
    
    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );
      
      if (error) {
        console.error('Error updating password:', error);
        return sendError(res, error.message, error.code, 400);
      }
      
      return sendSuccess(res, { 
        message: 'Password updated successfully',
        user: data.user
      });
    } catch (err) {
      console.error('Unexpected error updating password:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error updating password',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route GET /api/auth/session
 * @description Get current auth session
 * @access Public with session token
 */
router.get('/session', 
  asyncHandler(async (req, res) => {
    try {
      // Extract token from authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
      
      if (!token) {
        return sendError(res, 'No authentication token provided', 'UNAUTHORIZED', 401);
      }
      
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error) {
        console.error('Error getting session:', error);
        return sendError(res, error.message, error.code, 401);
      }
      
      return sendSuccess(res, {
        user: data.user,
        session: {
          access_token: token
        }
      });
    } catch (err) {
      console.error('Unexpected error getting session:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error getting session',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/auth/refresh
 * @description Refresh auth session token
 * @access Public with refresh token
 */
router.post('/refresh', 
  asyncHandler(async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return sendError(res, 'No refresh token provided', 'UNAUTHORIZED', 401);
      }
      
      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token
      });
      
      if (error) {
        console.error('Error refreshing session:', error);
        return sendError(res, error.message, error.code, 401);
      }
      
      return sendSuccess(res, {
        session: data.session,
        user: data.user
      });
    } catch (err) {
      console.error('Unexpected error refreshing session:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error refreshing session',
        'SERVER_ERROR',
        500
      );
    }
  })
);

export default router; 