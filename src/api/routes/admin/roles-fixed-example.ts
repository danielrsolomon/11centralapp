import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { throwApiError } from '../../middleware/error-handler';
import { noReturn } from '../../utils/helper';

const router = Router();

// Validation schemas
const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  permissions: z.array(z.string()).default([])
});

const roleIdSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format')
});

const userRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  roleId: z.string().uuid('Invalid role ID format')
});

/**
 * @route GET /api/admin/roles
 * @desc Get all available roles
 * @access Admin
 */
router.get('/',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      
      if (error) {
        throwApiError(error.message, 400, error.code);
      }
      
      // Use noReturn to explicitly indicate we're not returning this value
      noReturn(res.json({
        success: true,
        data
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/roles/:roleId
 * @desc Get role details by ID
 * @access Admin
 */
router.get('/:roleId',
  requireAuth,
  requireRole(['admin']),
  validateParams(roleIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId } = req.params;
      
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();
      
      if (error) {
        throwApiError(error.message, 400, error.code);
      }
      
      if (!data) {
        throwApiError('Role not found', 404, 'ROLE_NOT_FOUND');
      }
      
      // Use noReturn to explicitly indicate we're not returning this value
      noReturn(res.json({
        success: true,
        data
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/admin/roles
 * @desc Create a new role
 * @access Admin
 */
router.post('/',
  requireAuth,
  requireRole(['admin']),
  validateBody(roleSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, permissions } = req.body;
      
      // Check if role with this name already exists
      const { data: existingRole, error: checkError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', name)
        .single();
      
      if (existingRole) {
        throwApiError('Role with this name already exists', 400, 'ROLE_NAME_EXISTS');
      }
      
      // Create the role
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name,
          description,
          permissions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throwApiError(error.message, 400, error.code);
      }
      
      // Use noReturn to explicitly indicate we're not returning this value
      noReturn(res.status(201).json({
        success: true,
        data
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Helper function to update the roles array in the users table
 */
async function updateUserRolesArray(userId: string) {
  try {
    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);
    
    if (!rolesError && userRoles) {
      // Get the role names separately to avoid type issues
      const roleIds = userRoles.map(ur => ur.role_id);
      
      if (roleIds.length > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('name')
          .in('id', roleIds);
          
        const roleNames = roles?.map(role => role.name) || [];
        
        // Update the user's roles array
        await supabase
          .from('users')
          .update({ roles: roleNames })
          .eq('id', userId);
      }
    }
  } catch (error) {
    console.error('Error updating user roles array:', error);
  }
}

export default router; 