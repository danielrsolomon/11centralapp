"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const express_utils_1 = require("../../middleware/express-utils");
const router = (0, express_1.Router)();
// Validation schemas
const roleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Role name must be at least 2 characters'),
    description: zod_1.z.string().min(2, 'Description must be at least 2 characters'),
    permissions: zod_1.z.array(zod_1.z.string()).default([])
});
const roleIdSchema = zod_1.z.object({
    roleId: zod_1.z.string().uuid('Invalid role ID format')
});
const userRoleSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID format'),
    roleId: zod_1.z.string().uuid('Invalid role ID format')
});
/**
 * @route GET /api/admin/roles
 * @desc Get all available roles
 * @access Admin
 */
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, express_utils_1.authAsyncHandler)(async (_req, res, next) => {
    const { data, error } = await supabase_1.supabase
        .from('roles')
        .select('*')
        .order('name');
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    res.json({
        success: true,
        data
    });
}));
/**
 * @route GET /api/admin/roles/:roleId
 * @desc Get role details by ID
 * @access Admin
 */
router.get('/:roleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(roleIdSchema), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { roleId } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    if (!data) {
        (0, error_handler_1.throwApiError)('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    res.json({
        success: true,
        data
    });
}));
/**
 * @route POST /api/admin/roles
 * @desc Create a new role
 * @access Admin
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(roleSchema), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { name, description, permissions } = req.body;
    // Check if role with this name already exists
    const { data: existingRole, error: checkError } = await supabase_1.supabase
        .from('roles')
        .select('id')
        .eq('name', name)
        .single();
    if (existingRole) {
        (0, error_handler_1.throwApiError)('Role with this name already exists', 400, 'ROLE_NAME_EXISTS');
    }
    // Create the role
    const { data, error } = await supabase_1.supabase
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
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    res.status(201).json({
        success: true,
        data
    });
}));
/**
 * @route PUT /api/admin/roles/:roleId
 * @desc Update a role
 * @access Admin
 */
router.put('/:roleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(roleIdSchema), (0, validation_1.validateBody)(roleSchema.partial()), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { roleId } = req.params;
    const updateData = req.body;
    // Check if role exists
    const { data: existingRole, error: checkError } = await supabase_1.supabase
        .from('roles')
        .select('id, name')
        .eq('id', roleId)
        .single();
    if (!existingRole) {
        (0, error_handler_1.throwApiError)('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    // Check for name uniqueness if name is being updated
    if (updateData.name && updateData.name !== existingRole.name) {
        const { data: nameCheck, error: nameError } = await supabase_1.supabase
            .from('roles')
            .select('id')
            .eq('name', updateData.name)
            .neq('id', roleId)
            .single();
        if (nameCheck) {
            (0, error_handler_1.throwApiError)('Role with this name already exists', 400, 'ROLE_NAME_EXISTS');
        }
    }
    // Don't allow modifying system roles (admin, user)
    if (['admin', 'user'].includes(existingRole.name)) {
        (0, error_handler_1.throwApiError)('Cannot modify system roles', 403, 'MODIFY_SYSTEM_ROLE_FORBIDDEN');
    }
    // Update the role
    const { data, error } = await supabase_1.supabase
        .from('roles')
        .update({
        ...updateData,
        updated_at: new Date().toISOString()
    })
        .eq('id', roleId)
        .select()
        .single();
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    res.json({
        success: true,
        data
    });
}));
/**
 * @route DELETE /api/admin/roles/:roleId
 * @desc Delete a role
 * @access Admin
 */
router.delete('/:roleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(roleIdSchema), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { roleId } = req.params;
    // Check if role exists
    const { data: existingRole, error: checkError } = await supabase_1.supabase
        .from('roles')
        .select('id, name')
        .eq('id', roleId)
        .single();
    if (!existingRole) {
        (0, error_handler_1.throwApiError)('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    // Don't allow deleting system roles (admin, user)
    if (['admin', 'user'].includes(existingRole.name)) {
        (0, error_handler_1.throwApiError)('Cannot delete system roles', 403, 'DELETE_SYSTEM_ROLE_FORBIDDEN');
    }
    // Check if any users have this role
    const { count, error: countError } = await supabase_1.supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId);
    if (countError) {
        (0, error_handler_1.throwApiError)(countError.message, 400, countError.code);
    }
    if (count && count > 0) {
        (0, error_handler_1.throwApiError)('Cannot delete role that is assigned to users', 400, 'ROLE_IN_USE');
    }
    // Delete the role
    const { error } = await supabase_1.supabase
        .from('roles')
        .delete()
        .eq('id', roleId);
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    res.json({
        success: true,
        message: 'Role deleted successfully'
    });
}));
/**
 * @route GET /api/admin/roles/users/:roleId
 * @desc Get users with a specific role
 * @access Admin
 */
router.get('/users/:roleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(roleIdSchema), (0, validation_1.validateQuery)(zod_1.z.object({
    page: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional()
})), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { roleId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;
    // Check if role exists
    const { data: roleExists, error: roleError } = await supabase_1.supabase
        .from('roles')
        .select('id')
        .eq('id', roleId)
        .single();
    if (roleError || !roleExists) {
        (0, error_handler_1.throwApiError)('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    // Get users with this role
    const { data, count, error } = await supabase_1.supabase
        .from('user_roles')
        .select(`
        user_id,
        users:user_id(id, email, first_name, last_name, is_active)
      `, { count: 'exact' })
        .eq('role_id', roleId)
        .range(offset, offset + limitNumber - 1);
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
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
}));
/**
 * @route POST /api/admin/roles/assign
 * @desc Assign a role to a user
 * @access Admin
 */
router.post('/assign', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(userRoleSchema), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { userId, roleId } = req.body;
    // Check if user exists
    const { data: userExists, error: userError } = await supabase_1.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
    if (userError || !userExists) {
        (0, error_handler_1.throwApiError)('User not found', 404, 'USER_NOT_FOUND');
    }
    // Check if role exists
    const { data: roleExists, error: roleError } = await supabase_1.supabase
        .from('roles')
        .select('id')
        .eq('id', roleId)
        .single();
    if (roleError || !roleExists) {
        (0, error_handler_1.throwApiError)('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    // Check if user already has this role
    const { data: existingAssignment, error: checkError } = await supabase_1.supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single();
    if (existingAssignment) {
        (0, error_handler_1.throwApiError)('User already has this role', 400, 'ROLE_ALREADY_ASSIGNED');
    }
    // Assign the role to the user
    const { data, error } = await supabase_1.supabase
        .from('user_roles')
        .insert({
        user_id: userId,
        role_id: roleId,
        created_at: new Date().toISOString()
    })
        .select()
        .single();
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    // Update the user's roles array
    await updateUserRolesArray(userId);
    res.status(201).json({
        success: true,
        data
    });
}));
/**
 * @route DELETE /api/admin/roles/revoke
 * @desc Revoke a role from a user
 * @access Admin
 */
router.delete('/revoke', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(userRoleSchema), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { userId, roleId } = req.body;
    // Don't allow removing the last admin role
    if (roleId === 'admin') {
        const { data: adminUsers, error: adminError } = await supabase_1.supabase
            .from('user_roles')
            .select('user_id')
            .eq('role_id', 'admin');
        if (adminError) {
            (0, error_handler_1.throwApiError)(adminError.message, 400, adminError.code);
        }
        if (adminUsers.length === 1 && adminUsers[0].user_id === userId) {
            (0, error_handler_1.throwApiError)('Cannot remove the last admin user', 400, 'LAST_ADMIN_REMOVAL');
        }
    }
    // Delete the role assignment
    const { error } = await supabase_1.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    // Update the user's roles array
    await updateUserRolesArray(userId);
    res.json({
        success: true,
        message: 'Role revoked successfully'
    });
}));
/**
 * Helper function to update the roles array in the users table
 */
async function updateUserRolesArray(userId) {
    try {
        // Get user roles
        const { data: userRoles, error: rolesError } = await supabase_1.supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', userId);
        if (!rolesError && userRoles) {
            // Get the role names separately to avoid type issues
            const roleIds = userRoles.map(ur => ur.role_id);
            if (roleIds.length > 0) {
                const { data: roles } = await supabase_1.supabase
                    .from('roles')
                    .select('name')
                    .in('id', roleIds);
                const roleNames = roles?.map(role => role.name) || [];
                // Update the user's roles array
                await supabase_1.supabase
                    .from('users')
                    .update({ roles: roleNames })
                    .eq('id', userId);
            }
        }
    }
    catch (error) {
        console.error('Error updating user roles array:', error);
    }
}
exports.default = router;
//# sourceMappingURL=roles-fixed.js.map