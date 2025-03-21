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
// Example validation schema
const exampleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid ID format'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters')
});
/**
 * @route GET /api/admin/example
 * @desc Get all examples
 * @access Admin
 */
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    // Fetch data from database
    const { data, error } = await supabase_1.supabase
        .from('examples')
        .select('*');
    // Handle errors
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    // Send successful response - note we're not returning the result
    res.json({
        success: true,
        data
    });
}));
/**
 * @route POST /api/admin/example
 * @desc Create a new example
 * @access Admin
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(exampleSchema), (0, express_utils_1.authAsyncHandler)(async (req, res, next) => {
    const { id, name } = req.body;
    // Create new record
    const { data, error } = await supabase_1.supabase
        .from('examples')
        .insert({ id, name })
        .select()
        .single();
    // Handle errors
    if (error) {
        (0, error_handler_1.throwApiError)(error.message, 400, error.code);
    }
    // Send successful response - note we're not returning the result
    res.status(201).json({
        success: true,
        data
    });
}));
exports.default = router;
//# sourceMappingURL=route-template.js.map