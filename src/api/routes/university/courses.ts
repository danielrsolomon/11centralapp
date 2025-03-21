import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Response, NextFunction } from 'express';
import { courseService } from '../../../services/courseService';

const router = Router();

// Validation schemas
const courseIdSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format')
});

const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  thumbnail_url: z.string().url('Invalid thumbnail URL').optional(),
  published: z.boolean().default(false),
  program_id: z.string().uuid('Invalid program ID'),
  department_ids: z.array(z.string().uuid('Invalid department ID')).optional(),
  order: z.number().int().nonnegative().optional(),
  duration_minutes: z.number().int().positive().optional(),
  required_for_roles: z.array(z.string()).optional()
});

const updateCourseSchema = createCourseSchema.partial();

/**
 * @route GET /api/university/courses
 * @desc Get all courses or courses for a specific program
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', 
  requireAuth, 
  validateQuery(z.object({
    programId: z.string().uuid('Invalid program ID').optional(),
    departmentId: z.string().uuid('Invalid department ID').optional()
  }).partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Filter by program if specified in query
      const programId = req.query.programId as string | undefined;
      const departmentId = req.query.departmentId as string | undefined;
      
      let result;
      
      if (programId) {
        console.log(`Fetching courses for program: ${programId}`);
        result = await courseService.getCoursesByProgram(programId);
      } else if (departmentId) {
        console.log(`Fetching courses for department: ${departmentId}`);
        result = await courseService.getCoursesByDepartment(departmentId);
      } else {
        console.log('Fetching all courses');
        result = await courseService.getAllCourses();
      }
      
      // Handle database errors
      if (result.error) {
        console.error("Courses API error (GET):", result.error);
        next(new ApiError(result.error.message, 400, result.error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error("Courses API error (GET):", error);
      next(error);
    }
  }
);

/**
 * @route GET /api/university/courses/:courseId
 * @desc Get a single course by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:courseId', 
  requireAuth, 
  validateParams(courseIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      console.log(`Fetching course with ID: ${courseId}`);
      
      // Use courseService to get course by ID
      const { data, error } = await courseService.getCourseById(courseId, true);
      
      // Handle database errors
      if (error) {
        console.error(`Course API error (GET ${courseId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Handle not found case
      if (!data) {
        console.error(`Course not found: ${courseId}`);
        next(new ApiError('Course not found', 404, 'COURSE_NOT_FOUND'));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Course API error (GET ${req.params.courseId}):`, error);
      next(error);
    }
  }
);

/**
 * @route GET /api/university/courses/:courseId/modules
 * @desc Get all modules for a specific course
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:courseId/modules', 
  requireAuth, 
  validateParams(courseIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      console.log(`Fetching modules for course: ${courseId}`);
      
      // Use courseService to get modules for a course
      const { data, error } = await courseService.getCourseModules(courseId);
      
      // Handle database errors
      if (error) {
        console.error(`Course API error (GET ${courseId}/modules):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Course API error (GET ${req.params.courseId}/modules):`, error);
      next(error);
    }
  }
);

/**
 * @route POST /api/university/courses
 * @desc Create a new course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateBody(createCourseSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const courseData = req.body;
      console.log('Creating new course:', courseData.title);
      
      // Use courseService to create course
      const { data, error } = await courseService.createCourse(courseData);
      
      // Handle database errors
      if (error) {
        console.error('Course API error (POST):', error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Course API error (POST):', error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/courses/:courseId
 * @desc Update an existing course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/:courseId',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateParams(courseIdSchema),
  validateBody(updateCourseSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const courseData = req.body;
      console.log(`Updating course ${courseId}:`, courseData);
      
      // Use courseService to update course
      const { data, error } = await courseService.updateCourse(courseId, courseData);
      
      // Handle database errors
      if (error) {
        console.error(`Course API error (PUT ${courseId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Course API error (PUT ${req.params.courseId}):`, error);
      next(error);
    }
  }
);

/**
 * @route DELETE /api/university/courses/:courseId
 * @desc Delete a course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:courseId',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateParams(courseIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      console.log(`Deleting course: ${courseId}`);
      
      // Use courseService to delete course
      const { data, error } = await courseService.deleteCourse(courseId);
      
      // Handle database errors
      if (error) {
        console.error(`Course API error (DELETE ${courseId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      console.error(`Course API error (DELETE ${req.params.courseId}):`, error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/courses/reorder
 * @desc Reorder courses within a program
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/reorder',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateBody(z.object({
    program_id: z.string().uuid('Invalid program ID'),
    course_ids: z.array(z.string().uuid('Invalid course ID'))
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { program_id, course_ids } = req.body;
      console.log(`Reordering ${course_ids.length} courses for program: ${program_id}`);
      
      // Use courseService to reorder courses
      const { data, error } = await courseService.reorderCourses(program_id, course_ids);
      
      // Handle database errors
      if (error) {
        console.error('Course API error (reorder):', error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Course API error (reorder):', error);
      next(error);
    }
  }
);

export default router;
