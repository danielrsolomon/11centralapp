"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const progressService_1 = require("../../../services/progressService");
const router = (0, express_1.Router)();
// Validation schemas
const userProgressIdSchema = zod_1.z.object({
    progressId: zod_1.z.string().uuid('Invalid progress ID')
});
const userProgressSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid('Invalid user ID'),
    program_id: zod_1.z.string().uuid('Invalid program ID'),
    module_id: zod_1.z.string().uuid('Invalid module ID'),
    status: zod_1.z.enum(['not_started', 'in_progress', 'completed']),
    score: zod_1.z.number().min(0).max(100).optional(),
    completed_at: zod_1.z.string().optional(),
    last_accessed_at: zod_1.z.string()
});
const updateProgressSchema = zod_1.z.object({
    status: zod_1.z.enum(['not_started', 'in_progress', 'completed']).optional(),
    score: zod_1.z.number().min(0).max(100).optional(),
    completed_at: zod_1.z.string().optional(),
    last_accessed_at: zod_1.z.string().optional()
});
/**
 * @route GET /api/university/progress
 * @desc Get the current user's progress
 * @access Authenticated
 */
router.get('/', auth_1.requireAuth, (0, validation_1.validateQuery)(zod_1.z.object({
    programId: zod_1.z.string().uuid('Invalid program ID').optional(),
    moduleId: zod_1.z.string().uuid('Invalid module ID').optional()
}).partial()), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const programId = req.query.programId;
        const moduleId = req.query.moduleId;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
            return;
        }
        console.log(`Fetching progress for user: ${userId}`);
        let result;
        // Get user progress based on query parameters
        if (programId) {
            console.log(`Fetching program progress: ${programId}`);
            result = await progressService_1.progressService.getUserProgramProgress(userId, programId);
        }
        else if (moduleId) {
            console.log(`Fetching module progress: ${moduleId}`);
            result = await progressService_1.progressService.getModuleProgress(userId, moduleId);
        }
        else {
            console.log(`Fetching all progress for user: ${userId}`);
            result = await progressService_1.progressService.getAllUserProgress(userId);
        }
        // Handle database errors
        if (result.error) {
            console.error("Progress API error (GET):", result.error);
            next(new error_handler_1.ApiError(result.error.message, 400, result.error.code));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            data: result.data
        });
    }
    catch (error) {
        console.error("Progress API error (GET):", error);
        next(error);
    }
});
/**
 * @route GET /api/university/progress/:progressId
 * @desc Get a specific progress entry
 * @access Authenticated (own progress only)
 */
router.get('/:progressId', auth_1.requireAuth, (0, validation_1.validateParams)(userProgressIdSchema), async (req, res, next) => {
    try {
        const { progressId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
            return;
        }
        console.log(`Fetching progress entry: ${progressId} for user: ${userId}`);
        // Get specific progress entry
        const { data, error } = await progressService_1.progressService.getProgressById(progressId, userId);
        // Handle database errors
        if (error) {
            console.error(`Progress API error (GET ${progressId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Handle not found case
        if (!data) {
            console.error(`Progress not found: ${progressId}`);
            next(new error_handler_1.ApiError('Progress entry not found', 404, 'PROGRESS_NOT_FOUND'));
            return;
        }
        // Only allow users to see their own progress
        if (data.user_id !== userId) {
            console.error(`Access denied: Progress belongs to user ${data.user_id}, not ${userId}`);
            next(new error_handler_1.ApiError('Access denied', 403, 'ACCESS_DENIED'));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error(`Progress API error (GET ${req.params.progressId}):`, error);
        next(error);
    }
});
/**
 * @route POST /api/university/progress
 * @desc Create a new progress entry
 * @access Authenticated (own progress only)
 */
router.post('/', auth_1.requireAuth, (0, validation_1.validateBody)(userProgressSchema), async (req, res, next) => {
    try {
        const progressData = req.body;
        const userId = req.user?.id;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
            return;
        }
        // Only allow users to create their own progress entries
        if (progressData.user_id !== userId) {
            console.error(`Access denied: Cannot create progress for user ${progressData.user_id}`);
            next(new error_handler_1.ApiError('You can only create progress entries for yourself', 403, 'ACCESS_DENIED'));
            return;
        }
        console.log(`Creating progress entry for module ${progressData.module_id}`);
        // Create progress entry
        const { data, error } = await progressService_1.progressService.createProgress(progressData);
        // Handle database errors
        if (error) {
            console.error("Progress API error (POST):", error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Return standardized success response
        res.status(201).json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error("Progress API error (POST):", error);
        next(error);
    }
});
/**
 * @route PUT /api/university/progress/:progressId
 * @desc Update a progress entry
 * @access Authenticated (own progress only)
 */
router.put('/:progressId', auth_1.requireAuth, (0, validation_1.validateParams)(userProgressIdSchema), (0, validation_1.validateBody)(updateProgressSchema), async (req, res, next) => {
    try {
        const { progressId } = req.params;
        const progressData = req.body;
        const userId = req.user?.id;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
            return;
        }
        console.log(`Updating progress entry: ${progressId}`);
        // Verify user owns this progress entry
        const { data: existingProgress, error: checkError } = await progressService_1.progressService.getProgressById(progressId, userId);
        // Handle database errors from the verification
        if (checkError) {
            console.error(`Progress API error (verification for PUT ${progressId}):`, checkError);
            next(new error_handler_1.ApiError(checkError.message, 400, checkError.code));
            return;
        }
        // Handle not found case
        if (!existingProgress) {
            console.error(`Progress not found: ${progressId}`);
            next(new error_handler_1.ApiError('Progress entry not found', 404, 'PROGRESS_NOT_FOUND'));
            return;
        }
        // Only allow users to update their own progress entries
        if (existingProgress.user_id !== userId) {
            console.error(`Access denied: Progress belongs to user ${existingProgress.user_id}, not ${userId}`);
            next(new error_handler_1.ApiError('You can only update your own progress entries', 403, 'ACCESS_DENIED'));
            return;
        }
        // Special case handling for completing a module
        if (progressData.status === 'completed' && existingProgress.status !== 'completed') {
            console.log(`Completing module: ${existingProgress.module_id}`);
            const result = await progressService_1.progressService.completeModule(progressId, progressData);
            // Handle database errors
            if (result.error) {
                console.error(`Progress API error (complete module ${progressId}):`, result.error);
                next(new error_handler_1.ApiError(result.error.message, 400, result.error.code));
                return;
            }
            // Calculate program progress after module completion if this entry is part of a program
            if (existingProgress.program_id) {
                console.log(`Calculating program progress for: ${existingProgress.program_id}`);
                await progressService_1.progressService.calculateProgramProgress(userId, existingProgress.program_id);
            }
            // Return standardized success response
            res.json({
                success: true,
                data: result.data
            });
            return;
        }
        // Regular update for progress entry
        const { data, error } = await progressService_1.progressService.updateModuleProgress(progressId, progressData);
        // Handle database errors
        if (error) {
            console.error(`Progress API error (PUT ${progressId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error(`Progress API error (PUT ${req.params.progressId}):`, error);
        next(error);
    }
});
/**
 * @route DELETE /api/university/progress/:progressId
 * @desc Delete a progress entry
 * @access Authenticated (own progress only)
 */
router.delete('/:progressId', auth_1.requireAuth, (0, validation_1.validateParams)(userProgressIdSchema), async (req, res, next) => {
    try {
        const { progressId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
            return;
        }
        console.log(`Deleting progress entry: ${progressId}`);
        // Verify user owns this progress entry
        const { data: existingProgress, error: checkError } = await progressService_1.progressService.getProgressById(progressId, userId);
        // Handle database errors from the verification
        if (checkError) {
            console.error(`Progress API error (verification for DELETE ${progressId}):`, checkError);
            next(new error_handler_1.ApiError(checkError.message, 400, checkError.code));
            return;
        }
        // Handle not found case
        if (!existingProgress) {
            console.error(`Progress not found: ${progressId}`);
            next(new error_handler_1.ApiError('Progress entry not found', 404, 'PROGRESS_NOT_FOUND'));
            return;
        }
        // Only allow users to delete their own progress entries
        if (existingProgress.user_id !== userId) {
            console.error(`Access denied: Progress belongs to user ${existingProgress.user_id}, not ${userId}`);
            next(new error_handler_1.ApiError('You can only delete your own progress entries', 403, 'ACCESS_DENIED'));
            return;
        }
        // Delete the progress entry
        const { data, error } = await progressService_1.progressService.deleteProgress(progressId);
        // Handle database errors
        if (error) {
            console.error(`Progress API error (DELETE ${progressId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            message: 'Progress entry deleted successfully'
        });
    }
    catch (error) {
        console.error(`Progress API error (DELETE ${req.params.progressId}):`, error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=progress.js.map