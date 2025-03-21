import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { throwApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const userIdSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  roles: z.array(z.string()).default(['user'])
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  roles: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
});

/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination and filters
 * @access Admin
 */
router.get('/',
  requireAuth,
  requireRole(['admin']),
  validateQuery(z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        role,
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;
      
      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;
      
      // Start building the query
      let query = supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, roles, is_active, created_at, avatar_url', { count: 'exact' });
      
      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      if (role) {
        query = query.contains('roles', [role]);
      }
      
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }
      
      // Add pagination
      query = query
        .order(sort_by as string, { ascending: sort_order === 'asc' })
        .range(offset, offset + limitNumber - 1);
      
      const { data, count, error } = await query;
      
      if (error) {
        return throwApiError(error.message, 400, error.code);
      }
      
      res.json({
        success: true,
        data,
        pagination: {
          total: count,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil((count || 0) / limitNumber)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/users/:userId
 * @desc Get user details by ID
 * @access Admin
 */
router.get('/:userId',
  requireAuth,
  requireRole(['admin']),
  validateParams(userIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          appointments:appointments!client_id(count),
          course_progress:course_progress(count)
        `)
        .eq('id', userId)
        .single();
      
      if (error) {
        return throwApiError(error.message, 400, error.code);
      }
      
      if (!data) {
        return throwApiError('User not found', 404, 'NOT_FOUND');
      }
      
      // Remove sensitive fields
      const { password_hash, ...userDetails } = data;
      
      res.json({
        success: true,
        data: userDetails
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/admin/users
 * @desc Create a new user
 * @access Admin
 */
router.post('/',
  requireAuth,
  requireRole(['admin']),
  validateBody(createUserSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userData = req.body;
      
      // First check if user with this email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();
      
      if (existingUser) {
        return throwApiError('User with this email already exists', 400, 'EMAIL_EXISTS');
      }
      
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });
      
      if (authError) {
        return throwApiError(authError.message, 400, authError.code);
      }
      
      if (!authData.user) {
        return throwApiError('Failed to create auth user', 500, 'AUTH_CREATE_FAILED');
      }
      
      // Now create the user record
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          roles: userData.roles,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        // If there's an error creating the user record, try to clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        return throwApiError(error.message, 400, error.code);
      }
      
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/admin/users/:userId
 * @desc Update user details
 * @access Admin
 */
router.put('/:userId',
  requireAuth,
  requireRole(['admin']),
  validateParams(userIdSchema),
  validateBody(updateUserSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (checkError || !existingUser) {
        return throwApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      // Update email in auth if it's being changed
      if (updateData.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          { email: updateData.email }
        );
        
        if (authError) {
          return throwApiError(authError.message, 400, authError.code);
        }
      }
      
      // Update user record
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        return throwApiError(error.message, 400, error.code);
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/admin/users/:userId/password
 * @desc Reset a user's password
 * @access Admin
 */
router.put('/:userId/password',
  requireAuth,
  requireRole(['admin']),
  validateParams(userIdSchema),
  validateBody(updatePasswordSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      // Update the password in auth
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );
      
      if (error) {
        return throwApiError(error.message, 400, error.code);
      }
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/admin/users/:userId
 * @desc Deactivate a user (soft delete)
 * @access Admin
 */
router.delete('/:userId',
  requireAuth,
  requireRole(['admin']),
  validateParams(userIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      
      // Don't allow deactivating yourself
      if (userId === currentUserId) {
        return throwApiError('Cannot deactivate your own account', 400, 'SELF_DEACTIVATION');
      }
      
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('id', userId)
        .single();
      
      if (checkError || !existingUser) {
        return throwApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      // If already inactive, nothing to do
      if (existingUser.is_active === false) {
        return res.json({
          success: true,
          message: 'User is already inactive'
        });
      }
      
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        return throwApiError(error.message, 400, error.code);
      }
      
      // Disable user in auth system
      await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      
      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/admin/users/:userId/activate
 * @desc Reactivate a deactivated user
 * @access Admin
 */
router.put('/:userId/activate',
  requireAuth,
  requireRole(['admin']),
  validateParams(userIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('id', userId)
        .single();
      
      if (checkError || !existingUser) {
        return throwApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      // If already active, nothing to do
      if (existingUser.is_active === true) {
        return res.json({
          success: true,
          message: 'User is already active'
        });
      }
      
      // Reactivate by setting is_active to true
      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        return throwApiError(error.message, 400, error.code);
      }
      
      // Re-enable user in auth system
      await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      
      res.json({
        success: true,
        message: 'User activated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/users/stats
 * @desc Get user statistics
 * @access Admin
 */
router.get('/stats', 
  requireAuth,
  requireRole(['admin']),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) {
        return throwApiError(usersError.message, 400, usersError.code);
      }
      
      // Get active users count
      const { count: activeUsers, error: activeError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (activeError) {
        return throwApiError(activeError.message, 400, activeError.code);
      }
      
      // Get new users this month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      
      const { count: newUsers, error: newUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth);
      
      if (newUsersError) {
        return throwApiError(newUsersError.message, 400, newUsersError.code);
      }
      
      // Compile stats
      const stats = {
        total: totalUsers || 0,
        active: activeUsers || 0,
        inactive: (totalUsers || 0) - (activeUsers || 0),
        new_this_month: newUsers || 0
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 