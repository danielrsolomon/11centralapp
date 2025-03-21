"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const router = (0, express_1.Router)();
/**
 * @route GET /api/admin/logs
 * @desc Get system logs with filtering and pagination
 * @access Admin
 */
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateQuery)(zod_1.z.object({
    page: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    user_id: zod_1.z.string().uuid('Invalid user ID').optional(),
    sort_order: zod_1.z.enum(['asc', 'desc']).optional()
})), async (req, res, next) => {
    try {
        const { page = '1', limit = '50', type, start_date, end_date, user_id, sort_order = 'desc' } = req.query;
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const offset = (pageNumber - 1) * limitNumber;
        // Start building the query
        let query = supabase_1.supabase
            .from('system_logs')
            .select('*, user:user_id(id, email, first_name, last_name)', { count: 'exact' });
        // Apply filters
        if (type) {
            query = query.eq('log_type', type);
        }
        if (start_date) {
            query = query.gte('created_at', start_date);
        }
        if (end_date) {
            // Add a day to end_date to include the full day
            const nextDay = new Date(end_date);
            nextDay.setDate(nextDay.getDate() + 1);
            query = query.lt('created_at', nextDay.toISOString());
        }
        if (user_id) {
            query = query.eq('user_id', user_id);
        }
        // Add pagination and ordering
        query = query
            .order('created_at', { ascending: sort_order === 'asc' })
            .range(offset, offset + limitNumber - 1);
        const { data, count, error } = await query;
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        res.json({
            success: true,
            data,
            pagination: {
                total: count || 0,
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
 * @route GET /api/admin/logs/types
 * @desc Get all log types for filtering
 * @access Admin
 */
router.get('/types', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), async (_req, res, next) => {
    try {
        // Get distinct log types
        const { data, error } = await supabase_1.supabase
            .from('system_logs')
            .select('log_type')
            .order('log_type')
            .limit(1000);
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        // Extract unique types
        const logTypes = [...new Set(data?.map(log => log.log_type))];
        res.json({
            success: true,
            data: logTypes
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/admin/logs/summary
 * @desc Get summary statistics for logs
 * @access Admin
 */
router.get('/summary', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), async (_req, res, next) => {
    try {
        // Get counts by log type for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: typeCounts, error: typeError } = await supabase_1.supabase.rpc('count_logs_by_type', {
            start_date: thirtyDaysAgo.toISOString()
        });
        if (typeError) {
            return (0, error_handler_1.throwApiError)(typeError.message, 400, typeError.code);
        }
        // Get counts by day for the last 30 days
        const { data: dailyCounts, error: dailyError } = await supabase_1.supabase.rpc('count_logs_by_day', {
            start_date: thirtyDaysAgo.toISOString()
        });
        if (dailyError) {
            return (0, error_handler_1.throwApiError)(dailyError.message, 400, dailyError.code);
        }
        // Get error counts
        const { data: errorCounts, error: errorError } = await supabase_1.supabase.rpc('count_logs_by_error', {
            start_date: thirtyDaysAgo.toISOString()
        });
        if (errorError) {
            return (0, error_handler_1.throwApiError)(errorError.message, 400, errorError.code);
        }
        // Get top users with most log entries
        const { data: userCounts, error: userError } = await supabase_1.supabase.rpc('count_logs_by_user', {
            start_date: thirtyDaysAgo.toISOString(),
            limit_num: 10
        });
        if (userError) {
            return (0, error_handler_1.throwApiError)(userError.message, 400, userError.code);
        }
        // Combine all statistics
        const summary = {
            by_type: typeCounts || [],
            by_day: dailyCounts || [],
            by_error: errorCounts || [],
            by_user: userCounts || [],
            total_last_30_days: (typeCounts || []).reduce((sum, item) => sum + item.count, 0)
        };
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=logs.js.map