"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const helper_1 = require("../../utils/helper");
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
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), async (req, res, next) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('roles')
            .select('*')
            .order('name');
        if (error) {
            (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        // Use noReturn to explicitly indicate we're not returning this value
        (0, helper_1.noReturn)(res.json({
            success: true,
            data
        }));
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/admin/roles/:roleId
 * @desc Get role details by ID
 * @access Admin
 */
router.get('/:roleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(roleIdSchema), async (req, res, next) => {
    try {
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
        // Use noReturn to explicitly indicate we're not returning this value
        (0, helper_1.noReturn)(res.json({
            success: true,
            data
        }));
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/admin/roles
 * @desc Create a new role
 * @access Admin
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(roleSchema), async (req, res, next) => {
    try {
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
        // Use noReturn to explicitly indicate we're not returning this value
        (0, helper_1.noReturn)(res.status(201).json({
            success: true,
            data
        }));
    }
    catch (error) {
        next(error);
    }
});
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
//# sourceMappingURL=roles-fixed-example.js.map