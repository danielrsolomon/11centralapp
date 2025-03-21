"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const supabase_1 = require("../../services/supabase");
const error_handler_1 = require("./error-handler");
/**
 * Middleware to require authentication
 * Verifies the JWT token and loads user data with roles
 */
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return (0, error_handler_1.throwApiError)('Authentication required', 401, 'UNAUTHORIZED');
        }
        const token = authHeader.split(' ')[1];
        // Verify the token with Supabase
        const { data, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !data.user) {
            return (0, error_handler_1.throwApiError)('Invalid or expired token', 401, 'INVALID_TOKEN');
        }
        // Get user data from our users table
        const { data: userData, error: userError } = await supabase_1.supabase
            .from('users')
            .select('id, email, roles, is_active')
            .eq('id', data.user.id)
            .single();
        if (userError || !userData) {
            return (0, error_handler_1.throwApiError)('User not found', 401, 'USER_NOT_FOUND');
        }
        // Check if user is active
        if (!userData.is_active) {
            return (0, error_handler_1.throwApiError)('Account is inactive', 403, 'ACCOUNT_INACTIVE');
        }
        // Add user data to request (properly typed thanks to our global interface extension)
        req.user = {
            id: userData.id,
            email: userData.email,
            roles: userData.roles || ['user'],
            // Add the primary role as a convenience property
            role: userData.roles && userData.roles.length > 0 ? userData.roles[0] : 'user'
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAuth = requireAuth;
/**
 * Middleware to require specific role(s)
 * @param allowedRoles Array of roles that are allowed to access the route
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return (0, error_handler_1.throwApiError)('Authentication required', 401, 'UNAUTHORIZED');
        }
        const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
        if (!hasRole) {
            return (0, error_handler_1.throwApiError)('Insufficient permissions', 403, 'FORBIDDEN');
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map