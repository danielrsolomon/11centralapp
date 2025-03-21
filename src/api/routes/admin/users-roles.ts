import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabaseAdmin';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { throwApiError } from '../../middleware/error-handler';

const router = Router();

// Validation schemas
const userIdSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

// Define role interface for proper typing
interface Role {
  id: string;
  name: string;
  description?: string;
}

/**
 * @route GET /api/admin/users-roles/:userId
 * @desc Get roles for a specific user
 * @access Authenticated, Admin
 */
router.get('/:userId',
  requireAuth,
  validateParams(userIdSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // First check if the user exists
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError) {
        throwApiError(userError.message, 400, userError.code);
      }
      
      if (!userData) {
        throwApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      // Get user roles from the database
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select('roles!fk_role(id, name, description)')
        .eq('user_id', userId);

      if (error) {
        throwApiError(error.message, 400, error.code);
      }
      
      // Extract role names from the response
      const roles: Role[] = [];
      if (data && Array.isArray(data)) {
        data.forEach(item => {
          if (item.roles && typeof item.roles === 'object') {
            roles.push(item.roles as Role);
          }
        });
      }
      
      res.json({
        success: true,
        data: roles
      });
    } catch (err) {
      if (err instanceof Error) {
        res.status(500).json({
          success: false,
          error: err.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'An unknown error occurred'
        });
      }
    }
  }
);

/**
 * @route GET /api/admin/users-roles/check/:userId/superadmin
 * @desc Check if a user is a SuperAdmin and assign the role if they have it in the users table
 * @access Authenticated
 */
router.get('/check/:userId/superadmin',
  requireAuth,
  validateParams(userIdSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Fetch the SuperAdmin role
      const { data: superAdminRole, error: superAdminError } = await supabaseAdmin
        .from('roles')
        .select('*')
        .eq('name', 'SuperAdmin')
        .single();
        
      if (superAdminError) {
        throwApiError(superAdminError.message, 400, superAdminError.code);
      }
      
      // Check if the user exists and has SuperAdmin in users table
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (userDataError) {
        throwApiError(userDataError.message, 400, userDataError.code);
      }
      
      // Get user roles from the database
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select('roles!fk_role(name)')
        .eq('user_id', userId);

      if (error) {
        throwApiError(error.message, 400, error.code);
      }
      
      // Extract role names from the response
      const roles: string[] = [];
      if (data && Array.isArray(data)) {
        data.forEach(item => {
          if (item.roles && typeof item.roles === 'object' && 'name' in item.roles) {
            const roleName = item.roles.name;
            if (typeof roleName === 'string') {
              roles.push(roleName);
            }
          }
        });
      }
      
      // If no roles were found but the user is listed as SuperAdmin in the users table, 
      // try to automatically assign the role
      let roleAssigned = false;
      
      if (roles.length === 0 && userData && userData.role === 'SuperAdmin' && superAdminRole) {
        // Insert the SuperAdmin role assignment
        const { data: insertResult, error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert([
            { 
              user_id: userId,
              role_id: superAdminRole.id
            }
          ])
          .select();
          
        if (insertError) {
          throwApiError(insertError.message, 400, insertError.code);
        }
        
        roleAssigned = true;
        roles.push('SuperAdmin');
      }
      
      res.json({
        success: true,
        data: {
          roles,
          hadSuperAdmin: roles.includes('SuperAdmin'),
          wasSuperAdminAssigned: roleAssigned
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        res.status(500).json({
          success: false,
          error: err.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'An unknown error occurred'
        });
      }
    }
  }
);

export default router; 