"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const router = (0, express_1.Router)();
// Validation schemas
const userIdSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID format')
});
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    first_name: zod_1.z.string().min(1, 'First name is required'),
    last_name: zod_1.z.string().min(1, 'Last name is required'),
    phone: zod_1.z.string().optional(),
    roles: zod_1.z.array(zod_1.z.string()).default(['user'])
});
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').optional(),
    first_name: zod_1.z.string().min(1, 'First name is required').optional(),
    last_name: zod_1.z.string().min(1, 'Last name is required').optional(),
    phone: zod_1.z.string().optional(),
    roles: zod_1.z.array(zod_1.z.string()).optional(),
    is_active: zod_1.z.boolean().optional()
});
const updatePasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters')
});
/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination and filters
 * @access Admin
 */
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateQuery)(zod_1.z.object({
    page: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    sort_by: zod_1.z.string().optional(),
    sort_order: zod_1.z.enum(['asc', 'desc']).optional()
})), async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, role, status, sort_by = 'created_at', sort_order = 'desc' } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const offset = (pageNumber - 1) * limitNumber;
        // Start building the query
        let query = supabase_1.supabase
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
        }
        else if (status === 'inactive') {
            query = query.eq('is_active', false);
        }
        // Add pagination
        query = query
            .order(sort_by, { ascending: sort_order === 'asc' })
            .range(offset, offset + limitNumber - 1);
        const { data, count, error } = await query;
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
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
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/admin/users/:userId
 * @desc Get user details by ID
 * @access Admin
 */
router.get('/:userId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(userIdSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select(`
          *,
          appointments:appointments!client_id(count),
          course_progress:course_progress(count)
        `)
            .eq('id', userId)
            .single();
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        if (!data) {
            return (0, error_handler_1.throwApiError)('User not found', 404, 'NOT_FOUND');
        }
        // Remove sensitive fields
        const { password_hash, ...userDetails } = data;
        res.json({
            success: true,
            data: userDetails
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/admin/users
 * @desc Create a new user
 * @access Admin
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(createUserSchema), async (req, res, next) => {
    try {
        const userData = req.body;
        // First check if user with this email already exists
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();
        if (existingUser) {
            return (0, error_handler_1.throwApiError)('User with this email already exists', 400, 'EMAIL_EXISTS');
        }
        // Create auth user first
        const { data: authData, error: authError } = await supabase_1.supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
        });
        if (authError) {
            return (0, error_handler_1.throwApiError)(authError.message, 400, authError.code);
        }
        if (!authData.user) {
            return (0, error_handler_1.throwApiError)('Failed to create auth user', 500, 'AUTH_CREATE_FAILED');
        }
        // Now create the user record
        const { data, error } = await supabase_1.supabase
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
            await supabase_1.supabase.auth.admin.deleteUser(authData.user.id);
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        res.status(201).json({
            success: true,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route PUT /api/admin/users/:userId
 * @desc Update user details
 * @access Admin
 */
router.put('/:userId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(userIdSchema), (0, validation_1.validateBody)(updateUserSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();
        if (checkError || !existingUser) {
            return (0, error_handler_1.throwApiError)('User not found', 404, 'USER_NOT_FOUND');
        }
        // Update email in auth if it's being changed
        if (updateData.email) {
            const { error: authError } = await supabase_1.supabase.auth.admin.updateUserById(userId, { email: updateData.email });
            if (authError) {
                return (0, error_handler_1.throwApiError)(authError.message, 400, authError.code);
            }
        }
        // Update user record
        const { data, error } = await supabase_1.supabase
            .from('users')
            .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route PUT /api/admin/users/:userId/password
 * @desc Reset a user's password
 * @access Admin
 */
router.put('/:userId/password', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(userIdSchema), (0, validation_1.validateBody)(updatePasswordSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;
        // Update the password in auth
        const { error } = await supabase_1.supabase.auth.admin.updateUserById(userId, { password });
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route DELETE /api/admin/users/:userId
 * @desc Deactivate a user (soft delete)
 * @access Admin
 */
router.delete('/:userId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(userIdSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        // Don't allow deactivating yourself
        if (userId === currentUserId) {
            return (0, error_handler_1.throwApiError)('Cannot deactivate your own account', 400, 'SELF_DEACTIVATION');
        }
        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from('users')
            .select('id, is_active')
            .eq('id', userId)
            .single();
        if (checkError || !existingUser) {
            return (0, error_handler_1.throwApiError)('User not found', 404, 'USER_NOT_FOUND');
        }
        // If already inactive, nothing to do
        if (existingUser.is_active === false) {
            return res.json({
                success: true,
                message: 'User is already inactive'
            });
        }
        // Soft delete by setting is_active to false
        const { error } = await supabase_1.supabase
            .from('users')
            .update({
            is_active: false,
            updated_at: new Date().toISOString()
        })
            .eq('id', userId);
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        // Disable user in auth system
        await supabase_1.supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' });
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route PUT /api/admin/users/:userId/activate
 * @desc Reactivate a deactivated user
 * @access Admin
 */
router.put('/:userId/activate', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(userIdSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from('users')
            .select('id, is_active')
            .eq('id', userId)
            .single();
        if (checkError || !existingUser) {
            return (0, error_handler_1.throwApiError)('User not found', 404, 'USER_NOT_FOUND');
        }
        // If already active, nothing to do
        if (existingUser.is_active === true) {
            return res.json({
                success: true,
                message: 'User is already active'
            });
        }
        // Reactivate by setting is_active to true
        const { error } = await supabase_1.supabase
            .from('users')
            .update({
            is_active: true,
            updated_at: new Date().toISOString()
        })
            .eq('id', userId);
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        // Re-enable user in auth system
        await supabase_1.supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' });
        res.json({
            success: true,
            message: 'User activated successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/admin/users/stats
 * @desc Get user statistics
 * @access Admin
 */
router.get('/stats', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), async (_req, res, next) => {
    try {
        // Get total users count
        const { count: totalUsers, error: usersError } = await supabase_1.supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        if (usersError) {
            return (0, error_handler_1.throwApiError)(usersError.message, 400, usersError.code);
        }
        // Get active users count
        const { count: activeUsers, error: activeError } = await supabase_1.supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        if (activeError) {
            return (0, error_handler_1.throwApiError)(activeError.message, 400, activeError.code);
        }
        // Get new users this month
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const { count: newUsers, error: newUsersError } = await supabase_1.supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth);
        if (newUsersError) {
            return (0, error_handler_1.throwApiError)(newUsersError.message, 400, newUsersError.code);
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map