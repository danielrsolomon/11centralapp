import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';
import { lessonService } from '../../../services/lessonService';

const router = Router();

// Validation schemas
const lessonIdSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID format')
});

const createLessonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_id: z.string().uuid('Invalid course ID'),
  thumbnail_url: z.string().url('Invalid thumbnail URL').optional(),
  published: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
  duration_minutes: z.number().int().positive().optional(),
  prerequisites: z.array(z.string().uuid()).optional()
});

const updateLessonSchema = createLessonSchema.partial();

/**
 * @route GET /api/university/lessons
 * @desc Get all lessons or lessons for a specific course
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', 
  requireAuth, 
  validateQuery(z.object({
    courseId: z.string().uuid('Invalid course ID').optional()
  }).partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Filter by course if specified in query
      const courseId = req.query.courseId as string | undefined;
      
      let result;
      
      if (courseId) {
        console.log(`Fetching lessons for course: ${courseId}`);
        result = await lessonService.getLessonsByCourse(courseId);
      } else {
        console.log('Fetching all lessons');
        result = await lessonService.getAllLessons();
      }
      
      // Handle database errors
      if (result.error) {
        console.error("Lessons API error (GET):", result.error);
        next(new ApiError(result.error.message, 400, result.error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error("Lessons API error (GET):", error);
      next(error);
    }
  }
);

/**
 * @route GET /api/university/lessons/:lessonId
 * @desc Get a single lesson by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:lessonId', 
  requireAuth, 
  validateParams(lessonIdSchema),
  async (req: AuthenticatedRequest<{ lessonId: string }>, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      console.log(`Fetching lesson with ID: ${lessonId}`);
      
      // Use lessonService to get lesson by ID
      const { data, error } = await lessonService.getLessonById(lessonId);
      
      // Handle database errors
      if (error) {
        console.error(`Lesson API error (GET ${lessonId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Handle not found case
      if (!data) {
        console.error(`Lesson not found: ${lessonId}`);
        next(new ApiError('Lesson not found', 404, 'LESSON_NOT_FOUND'));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Lesson API error (GET ${req.params.lessonId}):`, error);
      next(error);
    }
  }
);

/**
 * @route POST /api/university/lessons
 * @desc Create a new lesson
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateBody(createLessonSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const lessonData = req.body;
      console.log('Creating new lesson:', lessonData.title);
      
      // Use lessonService to create lesson
      const { data, error } = await lessonService.createLesson(lessonData);
      
      // Handle database errors
      if (error) {
        console.error('Lesson API error (POST):', error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Lesson API error (POST):', error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/lessons/:lessonId
 * @desc Update an existing lesson
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/:lessonId',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateParams(lessonIdSchema),
  validateBody(updateLessonSchema),
  async (req: AuthenticatedRequest<{ lessonId: string }>, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      const lessonData = req.body;
      console.log(`Updating lesson ${lessonId}:`, lessonData);
      
      // Use lessonService to update lesson
      const { data, error } = await lessonService.updateLesson(lessonId, lessonData);
      
      // Handle database errors
      if (error) {
        console.error(`Lesson API error (PUT ${lessonId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Lesson API error (PUT ${req.params.lessonId}):`, error);
      next(error);
    }
  }
);

/**
 * @route DELETE /api/university/lessons/:lessonId
 * @desc Delete a lesson
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:lessonId',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateParams(lessonIdSchema),
  async (req: AuthenticatedRequest<{ lessonId: string }>, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      console.log(`Deleting lesson: ${lessonId}`);
      
      // Use lessonService to delete lesson
      const { data, error } = await lessonService.deleteLesson(lessonId);
      
      // Handle database errors
      if (error) {
        console.error(`Lesson API error (DELETE ${lessonId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        message: 'Lesson deleted successfully'
      });
    } catch (error) {
      console.error(`Lesson API error (DELETE ${req.params.lessonId}):`, error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/lessons/reorder
 * @desc Reorder lessons within a course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/reorder',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateBody(z.object({
    course_id: z.string().uuid('Invalid course ID'),
    lesson_ids: z.array(z.string().uuid('Invalid lesson ID'))
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { course_id, lesson_ids } = req.body;
      console.log(`Reordering ${lesson_ids.length} lessons for course: ${course_id}`);
      
      // Use lessonService to reorder lessons
      const { data, error } = await lessonService.reorderLessons(course_id, lesson_ids);
      
      // Handle database errors
      if (error) {
        console.error('Lesson API error (reorder):', error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Lesson API error (reorder):', error);
      next(error);
    }
  }
);

export default router;
