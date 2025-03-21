"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const error_handler_1 = require("../../middleware/error-handler");
const express_utils_1 = require("../../middleware/express-utils");
const router = (0, express_1.Router)();
/**
 * Schema for the fix-order-columns request
 * Currently doesn't require any input parameters
 */
const fixOrderColumnsSchema = zod_1.z.object({
// Empty schema for now, might add options later if needed
}).optional();
/**
 * @route POST /api/admin/schema/fix-order-columns
 * @desc Add 'order' columns to content tables if they don't exist
 * @access Admin, SuperAdmin
 *
 * This replaces the functionality in the legacy fix-order-columns.ts utility
 * It adds 'order' columns to programs, courses, lessons, and modules tables if they don't exist
 */
router.post('/fix-order-columns', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'SuperAdmin']), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    try {
        console.log('API: Attempting to fix order columns for all content tables...');
        // Add order column to programs table
        await executeOrderColumnFix('programs');
        // Add order column to courses table
        await executeOrderColumnFix('courses');
        // Add order column to lessons table
        await executeOrderColumnFix('lessons');
        // Add order column to modules table
        await executeOrderColumnFix('modules');
        console.log('API: Order column fix completed successfully');
        // Send successful response
        res.json({
            success: true,
            message: 'Order columns fixed successfully',
            data: {
                tables: ['programs', 'courses', 'lessons', 'modules'],
                status: 'completed'
            }
        });
    }
    catch (error) {
        console.error('API: Error fixing order columns:', error);
        (0, error_handler_1.throwApiError)('Failed to fix order columns', 500, 'SCHEMA_ERROR', { error: String(error) });
    }
}));
/**
 * Helper function to execute the order column fix for a specific table
 */
async function executeOrderColumnFix(tableName) {
    try {
        console.log(`API: Checking if order column exists in ${tableName} table...`);
        // First check if the order column already exists by attempting a query
        const testQuery = await supabase_1.supabase.from(tableName).select('id').limit(1);
        // If we got a specific error about the column not existing, add it
        if (testQuery.error?.message.includes(`column "${tableName}.order" does not exist`)) {
            console.log(`API: Adding order column to ${tableName} table...`);
            // Execute the ALTER TABLE statement using RPC
            const { error: alterError } = await supabase_1.supabase.rpc('execute_sql', {
                query: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;`
            });
            if (alterError) {
                console.error(`API: Failed to add order column to ${tableName}:`, alterError);
                throw new Error(`Failed to add order column to ${tableName}: ${alterError.message}`);
            }
            console.log(`API: Successfully added order column to ${tableName} table`);
        }
        else {
            console.log(`API: Order column already exists in ${tableName} table`);
        }
    }
    catch (error) {
        console.error(`API: Error adding order column to ${tableName}:`, error);
        throw error;
    }
}
exports.default = router;
//# sourceMappingURL=schema.js.map