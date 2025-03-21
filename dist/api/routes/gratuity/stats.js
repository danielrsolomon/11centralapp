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
const statsQuerySchema = zod_1.z.object({
    start_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
    end_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD').optional(),
    provider_id: zod_1.z.string().uuid('Invalid provider ID').optional(),
    tipper_id: zod_1.z.string().uuid('Invalid tipper ID').optional(),
    group_by: zod_1.z.enum(['day', 'week', 'month', 'year', 'provider']).optional().default('day')
});
/**
 * @route GET /api/gratuity/stats
 * @desc Get gratuity statistics with filtering and grouping options
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', auth_1.requireAuth, (0, validation_1.validateQuery)(statsQuerySchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { start_date, end_date, provider_id, tipper_id, group_by } = req.query;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Check if user is admin (has 'admin' in roles array)
        const isAdmin = req.user?.roles?.includes('admin') || false;
        // Set default end date to today if not provided
        const endDate = end_date || new Date().toISOString().split('T')[0];
        // Build query based on user role (provider or tipper)
        let query = supabase_1.supabase
            .from('gratuity_tips')
            .select('*')
            .gte('created_at', `${start_date}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`)
            .eq('payment_status', 'completed');
        // Apply filters
        if (provider_id) {
            query = query.eq('provider_id', provider_id);
        }
        if (tipper_id) {
            query = query.eq('tipper_id', tipper_id);
        }
        // User must be either the provider or tipper
        if (!provider_id && !tipper_id) {
            query = query.or(`provider_id.eq.${userId},tipper_id.eq.${userId}`);
        }
        else if (provider_id && provider_id !== userId && !isAdmin) {
            // If querying other provider's stats, user must be admin
            next(new error_handler_1.ApiError('You do not have permission to view these statistics', 403, 'FORBIDDEN'));
            return;
        }
        else if (tipper_id && tipper_id !== userId && !isAdmin) {
            // If querying other tipper's stats, user must be admin
            next(new error_handler_1.ApiError('You do not have permission to view these statistics', 403, 'FORBIDDEN'));
            return;
        }
        // Execute query
        const { data: tips, error } = await query;
        if (error) {
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        if (!tips || tips.length === 0) {
            // Return empty stats if no tips found
            res.json({
                success: true,
                data: {
                    total: 0,
                    count: 0,
                    average: 0,
                    min: 0,
                    max: 0,
                    groups: []
                }
            });
            return;
        }
        // Calculate statistics
        let total = 0;
        let min = Number.MAX_VALUE;
        let max = 0;
        tips.forEach(tip => {
            const amount = parseFloat(tip.amount);
            total += amount;
            min = Math.min(min, amount);
            max = Math.max(max, amount);
        });
        const count = tips.length;
        const average = total / count;
        // Group by provider if requested
        let groups = [];
        if (group_by === 'provider') {
            const providerGroups = {};
            // Group tips by provider
            tips.forEach(tip => {
                const providerId = tip.provider_id;
                if (!providerGroups[providerId]) {
                    providerGroups[providerId] = {
                        provider_id: providerId,
                        tips: [],
                        total: 0,
                        count: 0
                    };
                }
                providerGroups[providerId].tips.push(tip);
                providerGroups[providerId].total += parseFloat(tip.amount);
                providerGroups[providerId].count += 1;
            });
            // Convert to array and calculate averages
            groups = Object.values(providerGroups).map(group => ({
                provider_id: group.provider_id,
                total: group.total,
                count: group.count,
                average: group.total / group.count
            }));
            // Fetch provider details if we have groups
            if (groups.length > 0) {
                const providerIds = groups.map(g => g.provider_id);
                const { data: providers, error: providersError } = await supabase_1.supabase
                    .from('users')
                    .select('id, first_name, last_name, profile_image')
                    .in('id', providerIds);
                if (!providersError && providers) {
                    // Add provider details to groups
                    groups = groups.map(group => {
                        const provider = providers.find(p => p.id === group.provider_id);
                        return {
                            ...group,
                            provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Unknown',
                            profile_image: provider?.profile_image || null
                        };
                    });
                }
            }
        }
        else {
            // Group by time period
            const timeGroups = {};
            tips.forEach(tip => {
                const date = new Date(tip.created_at);
                let groupKey;
                // Format group key based on grouping option
                switch (group_by) {
                    case 'day':
                        groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
                        break;
                    case 'week':
                        // Get the week number
                        const weekNumber = getWeekNumber(date);
                        groupKey = `${date.getFullYear()}-W${weekNumber}`;
                        break;
                    case 'month':
                        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        break;
                    case 'year':
                        groupKey = `${date.getFullYear()}`;
                        break;
                    default:
                        groupKey = date.toISOString().split('T')[0]; // Default to day
                }
                if (!timeGroups[groupKey]) {
                    timeGroups[groupKey] = {
                        period: groupKey,
                        tips: [],
                        total: 0,
                        count: 0
                    };
                }
                timeGroups[groupKey].tips.push(tip);
                timeGroups[groupKey].total += parseFloat(tip.amount);
                timeGroups[groupKey].count += 1;
            });
            // Convert to array and calculate averages
            groups = Object.values(timeGroups).map(group => ({
                period: group.period,
                total: group.total,
                count: group.count,
                average: group.total / group.count
            }));
            // Sort by period
            groups.sort((a, b) => a.period.localeCompare(b.period));
        }
        // Respond with statistics
        res.json({
            success: true,
            data: {
                total,
                count,
                average,
                min,
                max,
                groups
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Helper function to get the week number of a date
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
}
exports.default = router;
//# sourceMappingURL=stats.js.map