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
const settingSchema = zod_1.z.object({
    key: zod_1.z.string().min(2, 'Key must be at least 2 characters').regex(/^[a-zA-Z0-9_\.]+$/, 'Key must contain only alphanumeric characters, underscores, and dots'),
    value: zod_1.z.any(),
    description: zod_1.z.string().optional()
});
const settingKeySchema = zod_1.z.object({
    key: zod_1.z.string().min(1, 'Key is required')
});
const bulkSettingsSchema = zod_1.z.array(settingSchema);
/**
 * @route GET /api/admin/settings
 * @desc Get all system settings
 * @access Admin
 */
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), async (_req, res, next) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('system_settings')
            .select('*')
            .order('key');
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
 * @route GET /api/admin/settings/:key
 * @desc Get a specific system setting
 * @access Admin
 */
router.get('/:key', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(settingKeySchema), async (req, res, next) => {
    try {
        const { key } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('system_settings')
            .select('*')
            .eq('key', key)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return (0, error_handler_1.throwApiError)('Setting not found', 404, 'SETTING_NOT_FOUND');
            }
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
 * @route POST /api/admin/settings
 * @desc Create or update a system setting
 * @access Admin
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(settingSchema), async (req, res, next) => {
    try {
        const { key, value, description } = req.body;
        // Check if setting already exists
        const { data: existingSetting, error: checkError } = await supabase_1.supabase
            .from('system_settings')
            .select('key')
            .eq('key', key)
            .maybeSingle();
        // Prepare the data to insert/update
        const settingData = {
            key,
            value,
            description: description || null,
            updated_at: new Date().toISOString()
        };
        let result;
        if (existingSetting) {
            // Update existing setting
            const { data, error } = await supabase_1.supabase
                .from('system_settings')
                .update(settingData)
                .eq('key', key)
                .select()
                .single();
            if (error) {
                return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
            }
            result = {
                data,
                message: 'Setting updated successfully',
                status: 200
            };
        }
        else {
            // Create new setting
            const { data, error } = await supabase_1.supabase
                .from('system_settings')
                .insert({
                ...settingData,
                created_at: new Date().toISOString()
            })
                .select()
                .single();
            if (error) {
                return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
            }
            result = {
                data,
                message: 'Setting created successfully',
                status: 201
            };
        }
        res.status(result.status).json({
            success: true,
            data: result.data,
            message: result.message
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/admin/settings/bulk
 * @desc Create or update multiple settings at once
 * @access Admin
 */
router.post('/bulk', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateBody)(bulkSettingsSchema), async (req, res, next) => {
    try {
        const settings = req.body;
        if (!settings.length) {
            return (0, error_handler_1.throwApiError)('No settings provided', 400, 'NO_SETTINGS');
        }
        // Get current timestamp for all updates
        const timestamp = new Date().toISOString();
        // Get existing settings
        const { data: existingSettings, error: fetchError } = await supabase_1.supabase
            .from('system_settings')
            .select('key')
            .in('key', settings.map((s) => s.key));
        if (fetchError) {
            return (0, error_handler_1.throwApiError)(fetchError.message, 400, fetchError.code);
        }
        // Determine which settings to insert vs update
        const existingKeys = new Set(existingSettings?.map(s => s.key) || []);
        const toInsert = settings
            .filter((s) => !existingKeys.has(s.key))
            .map((s) => ({
            key: s.key,
            value: s.value,
            description: s.description || null,
            created_at: timestamp,
            updated_at: timestamp
        }));
        const toUpdate = settings
            .filter((s) => existingKeys.has(s.key))
            .map((s) => ({
            key: s.key,
            value: s.value,
            description: s.description || null,
            updated_at: timestamp
        }));
        // Perform inserts if needed
        let insertResults = null;
        if (toInsert.length > 0) {
            const { data: inserted, error: insertError } = await supabase_1.supabase
                .from('system_settings')
                .insert(toInsert)
                .select();
            if (insertError) {
                return (0, error_handler_1.throwApiError)(insertError.message, 400, insertError.code);
            }
            insertResults = inserted;
        }
        // Perform updates
        let updateResults = [];
        for (const setting of toUpdate) {
            const { data, error } = await supabase_1.supabase
                .from('system_settings')
                .update({
                value: setting.value,
                description: setting.description,
                updated_at: setting.updated_at
            })
                .eq('key', setting.key)
                .select()
                .single();
            if (error) {
                return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
            }
            updateResults.push(data);
        }
        // Combine results
        const allResults = [
            ...(insertResults || []),
            ...updateResults
        ];
        res.json({
            success: true,
            data: allResults,
            inserted: toInsert.length,
            updated: toUpdate.length
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route DELETE /api/admin/settings/:key
 * @desc Delete a system setting
 * @access Admin
 */
router.delete('/:key', auth_1.requireAuth, (0, auth_1.requireRole)(['admin']), (0, validation_1.validateParams)(settingKeySchema), async (req, res, next) => {
    try {
        const { key } = req.params;
        // Check if setting exists
        const { data: existingSetting, error: checkError } = await supabase_1.supabase
            .from('system_settings')
            .select('key')
            .eq('key', key)
            .single();
        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return (0, error_handler_1.throwApiError)('Setting not found', 404, 'SETTING_NOT_FOUND');
            }
            return (0, error_handler_1.throwApiError)(checkError.message, 400, checkError.code);
        }
        // Check if this is a protected system setting
        const protectedSettings = ['app_version', 'maintenance_mode', 'system_email'];
        if (protectedSettings.includes(key)) {
            return (0, error_handler_1.throwApiError)('Cannot delete protected system setting', 403, 'PROTECTED_SETTING');
        }
        // Delete the setting
        const { error } = await supabase_1.supabase
            .from('system_settings')
            .delete()
            .eq('key', key);
        if (error) {
            return (0, error_handler_1.throwApiError)(error.message, 400, error.code);
        }
        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map