import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabaseAdmin';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';

const router = Router();

// Validation schemas
const contentItemSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  type: z.enum(['program', 'course', 'lesson', 'module'])
});

/**
 * @route PUT /api/university/content/archive
 * @desc Archive a content item (program, course, lesson, or module)
 * @access Authenticated, University Admin
 */
router.put('/archive',
  requireAuth,
  requireRole(['SuperAdmin', 'Director', 'SeniorManager', 'TrainingManager']),
  validateBody(contentItemSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id, type } = req.body;
      
      // Determine the table name based on the content type
      let tableName = '';
      switch (type) {
        case 'program':
          tableName = 'programs';
          break;
        case 'course':
          tableName = 'courses';
          break;
        case 'lesson':
          tableName = 'lessons';
          break;
        case 'module':
          tableName = 'modules';
          break;
        default:
          next(new ApiError('Invalid content type', 400, 'INVALID_CONTENT_TYPE'));
          return;
      }
      
      // Update the item's status to 'archived'
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .update({ status: 'archived' })
        .eq('id', id)
        .select();
        
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data,
        message: `${type} archived successfully`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/content/restore
 * @desc Restore an archived content item
 * @access Authenticated, University Admin
 */
router.put('/restore',
  requireAuth,
  requireRole(['SuperAdmin', 'Director', 'SeniorManager', 'TrainingManager']),
  validateBody(contentItemSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id, type } = req.body;
      
      // Determine the table name based on the content type
      let tableName = '';
      switch (type) {
        case 'program':
          tableName = 'programs';
          break;
        case 'course':
          tableName = 'courses';
          break;
        case 'lesson':
          tableName = 'lessons';
          break;
        case 'module':
          tableName = 'modules';
          break;
        default:
          next(new ApiError('Invalid content type', 400, 'INVALID_CONTENT_TYPE'));
          return;
      }
      
      // Update the item's status to 'published'
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .update({ status: 'published' })
        .eq('id', id)
        .select();
        
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data,
        message: `${type} restored successfully`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/university/content/archived
 * @desc Get all archived content
 * @access Authenticated, University Admin
 */
router.get('/archived',
  requireAuth,
  requireRole(['SuperAdmin', 'Director', 'SeniorManager', 'TrainingManager']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get archived content from all tables
      const { data: programs, error: programsError } = await supabaseAdmin
        .from('programs')
        .select('id, title, description, status, created_at, updated_at')
        .eq('status', 'archived');
        
      if (programsError) {
        next(new ApiError(programsError.message, 400, programsError.code));
        return;
      }
      
      const { data: courses, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id, title, description, status, program_id, created_at, updated_at')
        .eq('status', 'archived');
        
      if (coursesError) {
        next(new ApiError(coursesError.message, 400, coursesError.code));
        return;
      }
      
      const { data: lessons, error: lessonsError } = await supabaseAdmin
        .from('lessons')
        .select('id, title, description, status, course_id, created_at, updated_at')
        .eq('status', 'archived');
        
      if (lessonsError) {
        next(new ApiError(lessonsError.message, 400, lessonsError.code));
        return;
      }
      
      const { data: modules, error: modulesError } = await supabaseAdmin
        .from('modules')
        .select('id, title, description, status, lesson_id, created_at, updated_at')
        .eq('status', 'archived');
        
      if (modulesError) {
        next(new ApiError(modulesError.message, 400, modulesError.code));
        return;
      }
      
      // Add type field to each item for easier frontend handling
      const formattedPrograms = programs?.map(p => ({ ...p, type: 'program' })) || [];
      const formattedCourses = courses?.map(c => ({ ...c, type: 'course' })) || [];
      const formattedLessons = lessons?.map(l => ({ ...l, type: 'lesson' })) || [];
      const formattedModules = modules?.map(m => ({ ...m, type: 'module' })) || [];
      
      res.json({
        success: true,
        data: {
          programs: formattedPrograms,
          courses: formattedCourses,
          lessons: formattedLessons,
          modules: formattedModules,
          all: [
            ...formattedPrograms,
            ...formattedCourses,
            ...formattedLessons,
            ...formattedModules
          ]
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 