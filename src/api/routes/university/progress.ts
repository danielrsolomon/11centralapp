import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Response, NextFunction } from 'express';
import { progressService } from '../../../services/progressService';

const router = Router();

// Validation schemas
const userProgressIdSchema = z.object({
  progressId: z.string().uuid('Invalid progress ID')
});

const userProgressSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  program_id: z.string().uuid('Invalid program ID'),
  module_id: z.string().uuid('Invalid module ID'),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  score: z.number().min(0).max(100).optional(),
  completed_at: z.string().optional(),
  last_accessed_at: z.string()
});

const updateProgressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  score: z.number().min(0).max(100).optional(),
  completed_at: z.string().optional(),
  last_accessed_at: z.string().optional()
});

/**
 * @route GET /api/university/progress
 * @desc Get the current user's progress
 * @access Authenticated
 */
router.get('/',
  requireAuth,
  validateQuery(z.object({
    programId: z.string().uuid('Invalid program ID').optional(),
    moduleId: z.string().uuid('Invalid module ID').optional()
  }).partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const programId = req.query.programId as string | undefined;
      const moduleId = req.query.moduleId as string | undefined;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
        return;
      }
      
      console.log(`Fetching progress for user: ${userId}`);
      
      let result;
      // Get user progress based on query parameters
      if (programId) {
        console.log(`Fetching program progress: ${programId}`);
        result = await progressService.getUserProgramProgress(userId, programId);
      } else if (moduleId) {
        console.log(`Fetching module progress: ${moduleId}`);
        result = await progressService.getModuleProgress(userId, moduleId);
      } else {
        console.log(`Fetching all progress for user: ${userId}`);
        result = await progressService.getAllUserProgress(userId);
      }
      
      // Handle database errors
      if (result.error) {
        console.error("Progress API error (GET):", result.error);
        next(new ApiError(result.error.message, 400, result.error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error("Progress API error (GET):", error);
      next(error);
    }
  }
);

/**
 * @route GET /api/university/progress/:progressId
 * @desc Get a specific progress entry
 * @access Authenticated (own progress only)
 */
router.get('/:progressId',
  requireAuth,
  validateParams(userProgressIdSchema),
  async (req: AuthenticatedRequest<{progressId: string}>, res: Response, next: NextFunction) => {
    try {
      const { progressId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
        return;
      }
      
      console.log(`Fetching progress entry: ${progressId} for user: ${userId}`);
      
      // Get specific progress entry
      const { data, error } = await progressService.getProgressById(progressId, userId);
      
      // Handle database errors
      if (error) {
        console.error(`Progress API error (GET ${progressId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Handle not found case
      if (!data) {
        console.error(`Progress not found: ${progressId}`);
        next(new ApiError('Progress entry not found', 404, 'PROGRESS_NOT_FOUND'));
        return;
      }
      
      // Only allow users to see their own progress
      if (data.user_id !== userId) {
        console.error(`Access denied: Progress belongs to user ${data.user_id}, not ${userId}`);
        next(new ApiError('Access denied', 403, 'ACCESS_DENIED'));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Progress API error (GET ${req.params.progressId}):`, error);
      next(error);
    }
  }
);

/**
 * @route POST /api/university/progress
 * @desc Create a new progress entry
 * @access Authenticated (own progress only)
 */
router.post('/',
  requireAuth,
  validateBody(userProgressSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const progressData = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
        return;
      }
      
      // Only allow users to create their own progress entries
      if (progressData.user_id !== userId) {
        console.error(`Access denied: Cannot create progress for user ${progressData.user_id}`);
        next(new ApiError('You can only create progress entries for yourself', 403, 'ACCESS_DENIED'));
        return;
      }
      
      console.log(`Creating progress entry for module ${progressData.module_id}`);
      
      // Create progress entry
      const { data, error } = await progressService.createProgress(progressData);
      
      // Handle database errors
      if (error) {
        console.error("Progress API error (POST):", error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      console.error("Progress API error (POST):", error);
      next(error);
    }
  }
);

/**
 * @route PUT /api/university/progress/:progressId
 * @desc Update a progress entry
 * @access Authenticated (own progress only)
 */
router.put('/:progressId',
  requireAuth,
  validateParams(userProgressIdSchema),
  validateBody(updateProgressSchema),
  async (req: AuthenticatedRequest<{progressId: string}>, res: Response, next: NextFunction) => {
    try {
      const { progressId } = req.params;
      const progressData = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
        return;
      }
      
      console.log(`Updating progress entry: ${progressId}`);
      
      // Verify user owns this progress entry
      const { data: existingProgress, error: checkError } = await progressService.getProgressById(progressId, userId);
      
      // Handle database errors from the verification
      if (checkError) {
        console.error(`Progress API error (verification for PUT ${progressId}):`, checkError);
        next(new ApiError(checkError.message, 400, checkError.code));
        return;
      }
      
      // Handle not found case
      if (!existingProgress) {
        console.error(`Progress not found: ${progressId}`);
        next(new ApiError('Progress entry not found', 404, 'PROGRESS_NOT_FOUND'));
        return;
      }
      
      // Only allow users to update their own progress entries
      if (existingProgress.user_id !== userId) {
        console.error(`Access denied: Progress belongs to user ${existingProgress.user_id}, not ${userId}`);
        next(new ApiError('You can only update your own progress entries', 403, 'ACCESS_DENIED'));
        return;
      }
      
      // Special case handling for completing a module
      if (progressData.status === 'completed' && existingProgress.status !== 'completed') {
        console.log(`Completing module: ${existingProgress.module_id}`);
        const result = await progressService.completeModule(progressId, progressData);
        
        // Handle database errors
        if (result.error) {
          console.error(`Progress API error (complete module ${progressId}):`, result.error);
          next(new ApiError(result.error.message, 400, result.error.code));
          return;
        }
        
        // Calculate program progress after module completion if this entry is part of a program
        if (existingProgress.program_id) {
          console.log(`Calculating program progress for: ${existingProgress.program_id}`);
          await progressService.calculateProgramProgress(userId, existingProgress.program_id);
        }
        
        // Return standardized success response
        res.json({
          success: true,
          data: result.data
        });
        return;
      }
      
      // Regular update for progress entry
      const { data, error } = await progressService.updateModuleProgress(progressId, progressData);
      
      // Handle database errors
      if (error) {
        console.error(`Progress API error (PUT ${progressId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(`Progress API error (PUT ${req.params.progressId}):`, error);
      next(error);
    }
  }
);

/**
 * @route DELETE /api/university/progress/:progressId
 * @desc Delete a progress entry
 * @access Authenticated (own progress only)
 */
router.delete('/:progressId',
  requireAuth,
  validateParams(userProgressIdSchema),
  async (req: AuthenticatedRequest<{progressId: string}>, res: Response, next: NextFunction) => {
    try {
      const { progressId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_ID_REQUIRED'));
        return;
      }
      
      console.log(`Deleting progress entry: ${progressId}`);
      
      // Verify user owns this progress entry
      const { data: existingProgress, error: checkError } = await progressService.getProgressById(progressId, userId);
      
      // Handle database errors from the verification
      if (checkError) {
        console.error(`Progress API error (verification for DELETE ${progressId}):`, checkError);
        next(new ApiError(checkError.message, 400, checkError.code));
        return;
      }
      
      // Handle not found case
      if (!existingProgress) {
        console.error(`Progress not found: ${progressId}`);
        next(new ApiError('Progress entry not found', 404, 'PROGRESS_NOT_FOUND'));
        return;
      }
      
      // Only allow users to delete their own progress entries
      if (existingProgress.user_id !== userId) {
        console.error(`Access denied: Progress belongs to user ${existingProgress.user_id}, not ${userId}`);
        next(new ApiError('You can only delete your own progress entries', 403, 'ACCESS_DENIED'));
        return;
      }
      
      // Delete the progress entry
      const { data, error } = await progressService.deleteProgress(progressId);
      
      // Handle database errors
      if (error) {
        console.error(`Progress API error (DELETE ${progressId}):`, error);
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Return standardized success response
      res.json({
        success: true,
        message: 'Progress entry deleted successfully'
      });
    } catch (error) {
      console.error(`Progress API error (DELETE ${req.params.progressId}):`, error);
      next(error);
    }
  }
);

export default router;
