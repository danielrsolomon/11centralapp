import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Response, NextFunction } from 'express';
import { authHandler } from '../../types';
import { moduleService } from '../../../services/moduleService';

const router = Router();

// Validation schemas
const moduleIdSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID format')
});

const createModuleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_id: z.string().uuid('Invalid course ID'),
  lesson_id: z.string().uuid('Invalid lesson ID').optional(),
  type: z.enum(['content', 'quiz', 'video', 'document', 'interactive']),
  content: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  is_required: z.boolean().default(true),
  duration_minutes: z.number().int().positive().optional()
});

const updateModuleSchema = createModuleSchema.partial();

/**
 * @route GET /api/university/modules
 * @desc Get all modules or modules for a specific course
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', 
  requireAuth,
  validateQuery(z.object({
    courseId: z.string().uuid('Invalid course ID').optional(),
    lessonId: z.string().uuid('Invalid lesson ID').optional(),
    type: z.string().optional()
  }).partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get query parameters
      const courseId = req.query.courseId as string | undefined;
      const lessonId = req.query.lessonId as string | undefined;
      const moduleType = req.query.type as string | undefined;
      
      let result;
      
      // Determine which service method to call based on query parameters
      if (courseId) {
        console.log(`Fetching modules for course: ${courseId}`);
        result = await moduleService.getModulesByCourse(courseId);
      } else if (lessonId) {
        console.log(`Fetching modules for lesson: ${lessonId}`);
        result = await moduleService.getModulesByLesson(lessonId);
      } else if (moduleType) {
        console.log(`Fetching modules of type: ${moduleType}`);
        result = await moduleService.getModulesByType(moduleType);
      } else {
        console.log('Fetching all modules');
        result = await moduleService.getAllModules();
      }
      
      // Handle database errors
      if (result.error) {
        console.error("Module API error (GET):", result.error);
        next(new ApiError(result.error.message, 400, result.error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error("Module API error (GET):", error);
      next(error);
    }
  }
);

/**
 * @route GET /api/university/modules/:moduleId
 * @desc Get a single module by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:moduleId', 
  requireAuth, 
  validateParams(moduleIdSchema),
  async (req: AuthenticatedRequest<{moduleId: string}>, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      console.log(`Fetching module with ID: ${moduleId}`);
      
      // Use moduleService to get module by ID
      const { data, error } = await moduleService.getModuleById(moduleId);
      
      // Handle database errors
      if (error) {
        console.error(`Module API error (GET ${moduleId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Handle not found case
      if (!data) {
        console.error(`Module not found: ${moduleId}`);
        next(new ApiError('Module not found', 404, 'MODULE_NOT_FOUND'));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Module API error (GET ${req.params.moduleId}):`, error);
      next(error);
    }
  }
);

/**
 * @route POST /api/university/modules
 * @desc Create a new module
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateBody(createModuleSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const moduleData = req.body;
      console.log('Creating new module:', moduleData.title);
      
      // Use moduleService to create module
      const { data, error } = await moduleService.createModule(moduleData);
      
      // Handle database errors
      if (error) {
        console.error('Module API error (POST):', error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Module API error (POST):', error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/modules/:moduleId
 * @desc Update an existing module
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/:moduleId',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateParams(moduleIdSchema),
  validateBody(updateModuleSchema),
  async (req: AuthenticatedRequest<{moduleId: string}>, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      const moduleData = req.body;
      console.log(`Updating module ${moduleId}:`, moduleData);
      
      // Use moduleService to update module
      const { data, error } = await moduleService.updateModule(moduleId, moduleData);
      
      // Handle database errors
      if (error) {
        console.error(`Module API error (PUT ${moduleId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Module API error (PUT ${req.params.moduleId}):`, error);
      next(error);
    }
  }
);

/**
 * @route DELETE /api/university/modules/:moduleId
 * @desc Delete a module
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:moduleId',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateParams(moduleIdSchema),
  async (req: AuthenticatedRequest<{moduleId: string}>, res: Response, next: NextFunction) => {
    try {
      const { moduleId } = req.params;
      console.log(`Deleting module: ${moduleId}`);
      
      // Use moduleService to delete module
      const { data, error } = await moduleService.deleteModule(moduleId);
      
      // Handle database errors
      if (error) {
        console.error(`Module API error (DELETE ${moduleId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        message: 'Module deleted successfully'
      });
    } catch (error) {
      console.error(`Module API error (DELETE ${req.params.moduleId}):`, error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/modules/reorder
 * @desc Reorder modules within a course
 * @access Admin or SuperAdmin
 */
// @ts-ignore: Express router type compatibility
router.put('/reorder',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  validateBody(z.object({
    course_id: z.string().uuid('Invalid course ID'),
    module_ids: z.array(z.string().uuid('Invalid module ID'))
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { course_id, module_ids } = req.body;
      console.log(`Reordering ${module_ids.length} modules for course: ${course_id}`);
      
      // Use moduleService to reorder modules
      const { data, error } = await moduleService.reorderModules(course_id, module_ids);
      
      // Handle database errors
      if (error) {
        console.error('Module API error (reorder):', error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Module API error (reorder):', error);
      next(error);
    }
  }
);

export default router;
