"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const lessonService_1 = require("../../../services/lessonService");
const router = (0, express_1.Router)();
// Validation schemas
const lessonIdSchema = zod_1.z.object({
    lessonId: zod_1.z.string().uuid('Invalid lesson ID format')
});
const createLessonSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    course_id: zod_1.z.string().uuid('Invalid course ID'),
    thumbnail_url: zod_1.z.string().url('Invalid thumbnail URL').optional(),
    published: zod_1.z.boolean().default(false),
    order: zod_1.z.number().int().nonnegative().optional(),
    duration_minutes: zod_1.z.number().int().positive().optional(),
    prerequisites: zod_1.z.array(zod_1.z.string().uuid()).optional()
});
const updateLessonSchema = createLessonSchema.partial();
/**
 * @route GET /api/university/lessons
 * @desc Get all lessons or lessons for a specific course
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', auth_1.requireAuth, (0, validation_1.validateQuery)(zod_1.z.object({
    courseId: zod_1.z.string().uuid('Invalid course ID').optional()
}).partial()), async (req, res, next) => {
    try {
        // Filter by course if specified in query
        const courseId = req.query.courseId;
        let result;
        if (courseId) {
            console.log(`Fetching lessons for course: ${courseId}`);
            result = await lessonService_1.lessonService.getLessonsByCourse(courseId);
        }
        else {
            console.log('Fetching all lessons');
            result = await lessonService_1.lessonService.getAllLessons();
        }
        // Handle database errors
        if (result.error) {
            console.error("Lessons API error (GET):", result.error);
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
        console.error("Lessons API error (GET):", error);
        next(error);
    }
});
/**
 * @route GET /api/university/lessons/:lessonId
 * @desc Get a single lesson by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:lessonId', auth_1.requireAuth, (0, validation_1.validateParams)(lessonIdSchema), async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        console.log(`Fetching lesson with ID: ${lessonId}`);
        // Use lessonService to get lesson by ID
        const { data, error } = await lessonService_1.lessonService.getLessonById(lessonId);
        // Handle database errors
        if (error) {
            console.error(`Lesson API error (GET ${lessonId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Handle not found case
        if (!data) {
            console.error(`Lesson not found: ${lessonId}`);
            next(new error_handler_1.ApiError('Lesson not found', 404, 'LESSON_NOT_FOUND'));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error(`Lesson API error (GET ${req.params.lessonId}):`, error);
        next(error);
    }
});
/**
 * @route POST /api/university/lessons
 * @desc Create a new lesson
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateBody)(createLessonSchema), async (req, res, next) => {
    try {
        const lessonData = req.body;
        console.log('Creating new lesson:', lessonData.title);
        // Use lessonService to create lesson
        const { data, error } = await lessonService_1.lessonService.createLesson(lessonData);
        // Handle database errors
        if (error) {
            console.error('Lesson API error (POST):', error);
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
        console.error('Lesson API error (POST):', error);
        next(error);
    }
});
/**
 * @route PUT /api/university/lessons/:lessonId
 * @desc Update an existing lesson
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/:lessonId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateParams)(lessonIdSchema), (0, validation_1.validateBody)(updateLessonSchema), async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const lessonData = req.body;
        console.log(`Updating lesson ${lessonId}:`, lessonData);
        // Use lessonService to update lesson
        const { data, error } = await lessonService_1.lessonService.updateLesson(lessonId, lessonData);
        // Handle database errors
        if (error) {
            console.error(`Lesson API error (PUT ${lessonId}):`, error);
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
        console.error(`Lesson API error (PUT ${req.params.lessonId}):`, error);
        next(error);
    }
});
/**
 * @route DELETE /api/university/lessons/:lessonId
 * @desc Delete a lesson
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:lessonId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateParams)(lessonIdSchema), async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        console.log(`Deleting lesson: ${lessonId}`);
        // Use lessonService to delete lesson
        const { data, error } = await lessonService_1.lessonService.deleteLesson(lessonId);
        // Handle database errors
        if (error) {
            console.error(`Lesson API error (DELETE ${lessonId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            message: 'Lesson deleted successfully'
        });
    }
    catch (error) {
        console.error(`Lesson API error (DELETE ${req.params.lessonId}):`, error);
        next(error);
    }
});
/**
 * @route PUT /api/university/lessons/reorder
 * @desc Reorder lessons within a course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/reorder', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateBody)(zod_1.z.object({
    course_id: zod_1.z.string().uuid('Invalid course ID'),
    lesson_ids: zod_1.z.array(zod_1.z.string().uuid('Invalid lesson ID'))
})), async (req, res, next) => {
    try {
        const { course_id, lesson_ids } = req.body;
        console.log(`Reordering ${lesson_ids.length} lessons for course: ${course_id}`);
        // Use lessonService to reorder lessons
        const { data, error } = await lessonService_1.lessonService.reorderLessons(course_id, lesson_ids);
        // Handle database errors
        if (error) {
            console.error('Lesson API error (reorder):', error);
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
        console.error('Lesson API error (reorder):', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=lessons.js.map