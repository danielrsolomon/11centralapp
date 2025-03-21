import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { throwApiError } from '../../middleware/error-handler';
import { authAsyncHandler } from '../../middleware/express-utils';

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
  authAsyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    res.json({
      success: true,
      data
    });
  })
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
  authAsyncHandler(async (req, res) => {
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
    
    res.json({
      success: true,
      data
    });
  })
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
  authAsyncHandler(async (req, res) => {
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
    
    res.status(201).json({
      success: true,
      data
    });
  })
);

/**
 * @route PUT /api/admin/roles/:roleId
 * @desc Update a role
 * @access Admin
 */
router.put('/:roleId',
  requireAuth,
  requireRole(['admin']),
  validateParams(roleIdSchema),
  validateBody(roleSchema.partial()),
  authAsyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const updateData = req.body;
    
    // Check if role exists
    const { data: existingRole, error: checkError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .single();
    
    if (!existingRole) {
      throwApiError('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    
    // Check for name uniqueness if name is being updated
    if (updateData.name && updateData.name !== existingRole.name) {
      const { data: nameCheck, error: nameError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', updateData.name)
        .neq('id', roleId)
        .single();
      
      if (nameCheck) {
        throwApiError('Role with this name already exists', 400, 'ROLE_NAME_EXISTS');
      }
    }
    
    // Don't allow modifying system roles (admin, user)
    if (['admin', 'user'].includes(existingRole.name)) {
      throwApiError('Cannot modify system roles', 403, 'MODIFY_SYSTEM_ROLE_FORBIDDEN');
    }
    
    // Update the role
    const { data, error } = await supabase
      .from('roles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single();
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route DELETE /api/admin/roles/:roleId
 * @desc Delete a role
 * @access Admin
 */
router.delete('/:roleId',
  requireAuth,
  requireRole(['admin']),
  validateParams(roleIdSchema),
  authAsyncHandler(async (req, res) => {
    const { roleId } = req.params;
    
    // Check if role exists
    const { data: existingRole, error: checkError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .single();
    
    if (!existingRole) {
      throwApiError('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    
    // Don't allow deleting system roles (admin, user)
    if (['admin', 'user'].includes(existingRole.name)) {
      throwApiError('Cannot delete system roles', 403, 'DELETE_SYSTEM_ROLE_FORBIDDEN');
    }
    
    // Check if any users have this role
    const { count, error: countError } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);
    
    if (countError) {
      throwApiError(countError.message, 400, countError.code);
    }
    
    if (count && count > 0) {
      throwApiError('Cannot delete role that is assigned to users', 400, 'ROLE_IN_USE');
    }
    
    // Delete the role
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  })
);

/**
 * @route GET /api/admin/roles/users/:roleId
 * @desc Get users with a specific role
 * @access Admin
 */
router.get('/users/:roleId',
  requireAuth,
  requireRole(['admin']),
  validateParams(roleIdSchema),
  validateQuery(z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })),
  authAsyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;
    
    // Check if role exists
    const { data: roleExists, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .single();
    
    if (roleError || !roleExists) {
      throwApiError('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    
    // Get users with this role
    const { data, count, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users:user_id(id, email, first_name, last_name, is_active)
      `, { count: 'exact' })
      .eq('role_id', roleId)
      .range(offset, offset + limitNumber - 1);
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    // Format the data to return just the user objects
    const usersWithRole = data.map(item => item.users);
    
    res.json({
      success: true,
      data: usersWithRole,
      pagination: {
        total: count || 0,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil((count || 0) / limitNumber)
      }
    });
  })
);

/**
 * @route POST /api/admin/roles/assign
 * @desc Assign a role to a user
 * @access Admin
 */
router.post('/assign',
  requireAuth,
  requireRole(['admin']),
  validateBody(userRoleSchema),
  authAsyncHandler(async (req, res) => {
    const { userId, roleId } = req.body;
    
    // Check if user exists
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError || !userExists) {
      throwApiError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    // Check if role exists
    const { data: roleExists, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .single();
    
    if (roleError || !roleExists) {
      throwApiError('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    
    // Check if user already has this role
    const { data: existingAssignment, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .single();
    
    if (existingAssignment) {
      throwApiError('User already has this role', 400, 'ROLE_ALREADY_ASSIGNED');
    }
    
    // Assign the role to the user
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    // Update the user's roles array
    await updateUserRolesArray(userId);
    
    res.status(201).json({
      success: true,
      data
    });
  })
);

/**
 * @route DELETE /api/admin/roles/revoke
 * @desc Revoke a role from a user
 * @access Admin
 */
router.delete('/revoke',
  requireAuth,
  requireRole(['admin']),
  validateBody(userRoleSchema),
  authAsyncHandler(async (req, res) => {
    const { userId, roleId } = req.body;
    
    // Don't allow removing the last admin role
    if (roleId === 'admin') {
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role_id', 'admin');
      
      if (adminError) {
        throwApiError(adminError.message, 400, adminError.code);
      }
      
      if (adminUsers && adminUsers.length === 1 && adminUsers[0].user_id === userId) {
        throwApiError('Cannot remove the last admin user', 400, 'LAST_ADMIN_REMOVAL');
      }
    }
    
    // Delete the role assignment
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    // Update the user's roles array
    await updateUserRolesArray(userId);
    
    res.json({
      success: true,
      message: 'Role revoked successfully'
    });
  })
);

/**
 * Helper function to update the roles array in the users table
 */
async function updateUserRolesArray(userId: string) {
  try {
    // Get all roles for the user
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
      } else {
        // User has no roles, set empty array
        await supabase
          .from('users')
          .update({ roles: [] })
          .eq('id', userId);
      }
    }
  } catch (error) {
    console.error('Error updating user roles array:', error);
  }
}

export default router; 