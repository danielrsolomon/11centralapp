"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const courseService_1 = require("../../../services/courseService");
const router = (0, express_1.Router)();
// Validation schemas
const courseIdSchema = zod_1.z.object({
    courseId: zod_1.z.string().uuid('Invalid course ID format')
});
const createCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    thumbnail_url: zod_1.z.string().url('Invalid thumbnail URL').optional(),
    published: zod_1.z.boolean().default(false),
    program_id: zod_1.z.string().uuid('Invalid program ID'),
    department_ids: zod_1.z.array(zod_1.z.string().uuid('Invalid department ID')).optional(),
    order: zod_1.z.number().int().nonnegative().optional(),
    duration_minutes: zod_1.z.number().int().positive().optional(),
    required_for_roles: zod_1.z.array(zod_1.z.string()).optional()
});
const updateCourseSchema = createCourseSchema.partial();
/**
 * @route GET /api/university/courses
 * @desc Get all courses or courses for a specific program
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', auth_1.requireAuth, (0, validation_1.validateQuery)(zod_1.z.object({
    programId: zod_1.z.string().uuid('Invalid program ID').optional(),
    departmentId: zod_1.z.string().uuid('Invalid department ID').optional()
}).partial()), async (req, res, next) => {
    try {
        // Filter by program if specified in query
        const programId = req.query.programId;
        const departmentId = req.query.departmentId;
        let result;
        if (programId) {
            console.log(`Fetching courses for program: ${programId}`);
            result = await courseService_1.courseService.getCoursesByProgram(programId);
        }
        else if (departmentId) {
            console.log(`Fetching courses for department: ${departmentId}`);
            result = await courseService_1.courseService.getCoursesByDepartment(departmentId);
        }
        else {
            console.log('Fetching all courses');
            result = await courseService_1.courseService.getAllCourses();
        }
        // Handle database errors
        if (result.error) {
            console.error("Courses API error (GET):", result.error);
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
        console.error("Courses API error (GET):", error);
        next(error);
    }
});
/**
 * @route GET /api/university/courses/:courseId
 * @desc Get a single course by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:courseId', auth_1.requireAuth, (0, validation_1.validateParams)(courseIdSchema), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        console.log(`Fetching course with ID: ${courseId}`);
        // Use courseService to get course by ID
        const { data, error } = await courseService_1.courseService.getCourseById(courseId, true);
        // Handle database errors
        if (error) {
            console.error(`Course API error (GET ${courseId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Handle not found case
        if (!data) {
            console.error(`Course not found: ${courseId}`);
            next(new error_handler_1.ApiError('Course not found', 404, 'COURSE_NOT_FOUND'));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error(`Course API error (GET ${req.params.courseId}):`, error);
        next(error);
    }
});
/**
 * @route GET /api/university/courses/:courseId/modules
 * @desc Get all modules for a specific course
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:courseId/modules', auth_1.requireAuth, (0, validation_1.validateParams)(courseIdSchema), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        console.log(`Fetching modules for course: ${courseId}`);
        // Use courseService to get modules for a course
        const { data, error } = await courseService_1.courseService.getCourseModules(courseId);
        // Handle database errors
        if (error) {
            console.error(`Course API error (GET ${courseId}/modules):`, error);
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
        console.error(`Course API error (GET ${req.params.courseId}/modules):`, error);
        next(error);
    }
});
/**
 * @route POST /api/university/courses
 * @desc Create a new course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateBody)(createCourseSchema), async (req, res, next) => {
    try {
        const courseData = req.body;
        console.log('Creating new course:', courseData.title);
        // Use courseService to create course
        const { data, error } = await courseService_1.courseService.createCourse(courseData);
        // Handle database errors
        if (error) {
            console.error('Course API error (POST):', error);
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
        console.error('Course API error (POST):', error);
        next(error);
    }
});
/**
 * @route PUT /api/university/courses/:courseId
 * @desc Update an existing course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/:courseId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateParams)(courseIdSchema), (0, validation_1.validateBody)(updateCourseSchema), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const courseData = req.body;
        console.log(`Updating course ${courseId}:`, courseData);
        // Use courseService to update course
        const { data, error } = await courseService_1.courseService.updateCourse(courseId, courseData);
        // Handle database errors
        if (error) {
            console.error(`Course API error (PUT ${courseId}):`, error);
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
        console.error(`Course API error (PUT ${req.params.courseId}):`, error);
        next(error);
    }
});
/**
 * @route DELETE /api/university/courses/:courseId
 * @desc Delete a course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:courseId', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateParams)(courseIdSchema), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        console.log(`Deleting course: ${courseId}`);
        // Use courseService to delete course
        const { data, error } = await courseService_1.courseService.deleteCourse(courseId);
        // Handle database errors
        if (error) {
            console.error(`Course API error (DELETE ${courseId}):`, error);
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        // Return standardized success response
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    }
    catch (error) {
        console.error(`Course API error (DELETE ${req.params.courseId}):`, error);
        next(error);
    }
});
/**
 * @route PUT /api/university/courses/reorder
 * @desc Reorder courses within a program
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/reorder', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'superadmin']), (0, validation_1.validateBody)(zod_1.z.object({
    program_id: zod_1.z.string().uuid('Invalid program ID'),
    course_ids: zod_1.z.array(zod_1.z.string().uuid('Invalid course ID'))
})), async (req, res, next) => {
    try {
        const { program_id, course_ids } = req.body;
        console.log(`Reordering ${course_ids.length} courses for program: ${program_id}`);
        // Use courseService to reorder courses
        const { data, error } = await courseService_1.courseService.reorderCourses(program_id, course_ids);
        // Handle database errors
        if (error) {
            console.error('Course API error (reorder):', error);
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
        console.error('Course API error (reorder):', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=courses.js.map