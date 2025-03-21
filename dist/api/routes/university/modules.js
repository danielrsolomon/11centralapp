"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const moduleService_1 = require("../../../services/moduleService");
const router = (0, express_1.Router)();
// Validation schemas
const moduleIdSchema = zod_1.z.object({
    moduleId: zod_1.z.string().uuid('Invalid module ID format')
});
const createModuleSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    course_id: zod_1.z.string().uuid('Invalid course ID'),
    lesson_id: zod_1.z.string().uuid('Invalid lesson ID').optional(),
    type: zod_1.z.enum(['content', 'quiz', 'video', 'document', 'interactive']),
    content: zod_1.z.string().optional(),
    order: zod_1.z.number().int().nonnegative().optional(),
    is_required: zod_1.z.boolean().default(true),
    duration_minutes: zod_1.z.number().int().positive().optional()
});
const updateModuleSchema = createModuleSchema.partial();
/**
 * @route GET /api/university/modules
 * @desc Get all modules or modules for a specific course
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', auth_1.requireAuth, (0, validation_1.validateQuery)(zod_1.z.object({
    courseId: zod_1.z.string().uuid('Invalid course ID').optional(),
    lessonId: zod_1.z.string().uuid('Invalid lesson ID').optional(),
    type: zod_1.z.string().optional()
}).partial()), async (req, res, next) => {
    try {
        // Get query parameters
        const courseId = req.query.courseId;
        const lessonId = req.query.lessonId;
        const moduleType = req.query.type;
        let result;
        // Determine which service method to call based on query parameters
        if (courseId) {
            console.log(`Fetching modules for course: ${courseId}`);
            result = await moduleService_1.moduleService.getModulesByCourse(courseId);
        }
        else if (lessonId) {
            console.log(`Fetching modules for lesson: ${lessonId}`);
            result = await moduleService_1.moduleService.getModulesByLesson(lessonId);
        }
        else if (moduleType) {
            console.log(`Fetching modules of type: ${moduleType}`);
            result = await moduleService_1.moduleService.getModulesByType(moduleType);
        }
        else {
            console.log('Fetching all modules');
            result = await moduleService_1.moduleService.getAllModules();
        }
        // Handle database errors
        if (result.error) {
            console.error("Module API error (GET):", result.error);
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
        console.error("Module API error (GET):", error);
        next(error);
    }
});
/**
 * @route GET /api/university/modules/:moduleId
 * @desc Get a single module by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:moduleId', auth_1.requireAuth, (0, validation_1.validateParams)(moduleIdSchema), async (req, res, next) => {
    try {
        const { moduleId } = req.params;
        console.log(`Fetching module with ID: ${moduleId}`);
        // Use moduleService to get module by ID
        const { data, error } = await moduleService_1.moduleService.getModuleById(moduleId);
        // Handle database errors
        if (error) {
            console.error(`Module API error (GET ${moduleId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Handle not found case
        if (!data) {
            console.error(`Module not found: ${moduleId}`);
            next(new error_handler_1.ApiError('Module not found', 404, 'MODULE_NOT_FOUND'));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error(`Module API error (GET ${req.params.moduleId}):`, error);
        next(error);
    }
});
/**
 * @route POST /api/university/modules
 * @desc Create a new module
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateBody)(createModuleSchema), async (req, res, next) => {
    try {
        const moduleData = req.body;
        console.log('Creating new module:', moduleData.title);
        // Use moduleService to create module
        const { data, error } = await moduleService_1.moduleService.createModule(moduleData);
        // Handle database errors
        if (error) {
            console.error('Module API error (POST):', error);
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
        console.error('Module API error (POST):', error);
        next(error);
    }
});
/**
 * @route PUT /api/university/modules/:moduleId
 * @desc Update an existing module
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/:moduleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateParams)(moduleIdSchema), (0, validation_1.validateBody)(updateModuleSchema), async (req, res, next) => {
    try {
        const { moduleId } = req.params;
        const moduleData = req.body;
        console.log(`Updating module ${moduleId}:`, moduleData);
        // Use moduleService to update module
        const { data, error } = await moduleService_1.moduleService.updateModule(moduleId, moduleData);
        // Handle database errors
        if (error) {
            console.error(`Module API error (PUT ${moduleId}):`, error);
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
        console.error(`Module API error (PUT ${req.params.moduleId}):`, error);
        next(error);
    }
});
/**
 * @route DELETE /api/university/modules/:moduleId
 * @desc Delete a module
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:moduleId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateParams)(moduleIdSchema), async (req, res, next) => {
    try {
        const { moduleId } = req.params;
        console.log(`Deleting module: ${moduleId}`);
        // Use moduleService to delete module
        const { data, error } = await moduleService_1.moduleService.deleteModule(moduleId);
        // Handle database errors
        if (error) {
            console.error(`Module API error (DELETE ${moduleId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            message: 'Module deleted successfully'
        });
    }
    catch (error) {
        console.error(`Module API error (DELETE ${req.params.moduleId}):`, error);
        next(error);
    }
});
/**
 * @route PUT /api/university/modules/reorder
 * @desc Reorder modules within a course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/reorder', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateBody)(zod_1.z.object({
    course_id: zod_1.z.string().uuid('Invalid course ID'),
    module_ids: zod_1.z.array(zod_1.z.string().uuid('Invalid module ID'))
})), async (req, res, next) => {
    try {
        const { course_id, module_ids } = req.body;
        console.log(`Reordering ${module_ids.length} modules for course: ${course_id}`);
        // Use moduleService to reorder modules
        const { data, error } = await moduleService_1.moduleService.reorderModules(course_id, module_ids);
        // Handle database errors
        if (error) {
            console.error('Module API error (reorder):', error);
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
        console.error('Module API error (reorder):', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=modules.js.map