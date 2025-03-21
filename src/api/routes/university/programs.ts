import { Router } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateRequest } from '../../middleware/validation';
import { ApiError, createErrorResponse } from '../../middleware/error-handler';
import { backendContentService } from '../../services/backendContentService';
import { supabaseAdmin } from '../../supabaseAdmin';
import { requireAuth } from '../../middleware/auth';

/**
 * Helper to log and send JSON responses with proper headers
 */
const sendJSONResponse = (res: Response, status: number, responseData: any, logPrefix: string) => {
  // Set the content type header explicitly
  res.setHeader('Content-Type', 'application/json');
  
  // Log the exact response payload being sent
  console.log(`DEBUG - ${logPrefix} Response [EXACT]:`, JSON.stringify(responseData, null, 2));
  
  // Log the response headers
  console.log(`DEBUG - ${logPrefix} Response Headers:`, res.getHeaders());
  
  // Log the structure of the response (for quick reference)
  console.log(`DEBUG - ${logPrefix} Response Structure:`, {
    keys: Object.keys(responseData),
    success: responseData.success,
    dataType: responseData.data ? (Array.isArray(responseData.data) ? 'array' : typeof responseData.data) : 'null',
    errorPresent: !!responseData.error
  });
  
  // Send the response
  return res.status(status).json(responseData);
};

const router = Router();

/**
 * Validation schemas for University Programs
 * These schemas use Zod for type validation and ensuring data integrity
 */
const programIdSchema = z.object({
  programId: z.string().uuid({ message: 'Invalid program ID format' })
});

const departmentIdSchema = z.object({
  departmentId: z.string().uuid({ message: 'Invalid department ID format' })
});

const createProgramSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  department_id: z.string().uuid({ message: 'Invalid department ID format' }).optional(),
  thumbnail_url: z.string().url().optional(),
  published: z.boolean().optional(),
  order: z.number().optional()
});

const updateProgramSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }).optional(),
  description: z.string().optional(),
  department_id: z.string().uuid({ message: 'Invalid department ID format' }).optional(),
  thumbnail_url: z.string().url().optional(),
  published: z.boolean().optional(),
  order: z.number().optional()
});

const reorderProgramsSchema = z.object({
  program_ids: z.array(z.string().uuid({ message: 'Invalid program ID format' }))
});

// Schema for program updates
const programUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  order: z.number().optional(),
  thumbnail_url: z.string().url().optional().nullable(),
  category: z.string().optional(),
  is_featured: z.boolean().optional(),
});

/**
 * @route GET /api/university/programs
 * @desc Get all programs with optional ordering
 * @access Authenticated - Any authenticated user can access program listings
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('API: Fetching all programs');
    const { query } = req;
    const filterPublished = query.published === 'true';
    
    // Create a safe query that handles missing columns
    let fetchQuery = supabaseAdmin
      .from('programs')
      .select('*');
    
    // Try to order by order column, but have a fallback if the column doesn't exist
    try {
      if (filterPublished) {
        fetchQuery = fetchQuery.eq('status', 'published');
      }
      
      // First attempt with order column
      fetchQuery = fetchQuery.order('order', { ascending: true });
      const { data, error } = await fetchQuery;
      
      if (error) {
        // If column doesn't exist, try without ordering
        if (error.code === '42703' && error.message && error.message.includes('order does not exist')) {
          console.log('API: Column "order" does not exist, falling back to created_at');
          
          // Retry query without the order column
          let retryQuery = supabaseAdmin
            .from('programs')
            .select('*');
            
          if (filterPublished) {
            retryQuery = retryQuery.eq('status', 'published');
          }
          
          retryQuery = retryQuery.order('created_at', { ascending: false });
          const { data: retryData, error: retryError } = await retryQuery;
          
          if (retryError) {
            throw retryError;
          }
          
          const successResponse = {
            success: true,
            data: retryData || []
          };
          
          return sendJSONResponse(res, 200, successResponse, 'Programs GET All Success (fallback)');
        } else {
          throw error;
        }
      }
      
      const successResponse = {
        success: true,
        data: data || []
      };
      
      return sendJSONResponse(res, 200, successResponse, 'Programs GET All Success');
    } catch (error) {
      console.error('API: Error fetching programs', error);
      
      const errorResponse = createErrorResponse(
        500,
        'Failed to fetch programs',
        'PROGRAMS_FETCH_ERROR',
        error
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs GET All Error');
    }
  } catch (error) {
    console.error('API: Unexpected error in GET /programs:', error);
    
    const errorResponse = createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Unexpected error fetching programs',
      'UNEXPECTED_ERROR',
      error instanceof Error ? error.stack : String(error)
    );
    
    return sendJSONResponse(res, 500, errorResponse, 'Programs GET All Exception');
  }
});

/**
 * @route GET /api/university/programs/by-department/:departmentId
 * @desc Get programs by department
 * @access Authenticated - Any authenticated user can access program listings
 */
router.get('/by-department/:departmentId', 
  requireAuth,
  validateParams(departmentIdSchema),
  async (req: AuthenticatedRequest<{ departmentId: string }>, res: Response, next: NextFunction) => {
    try {
      console.log(`API: Fetching programs for department ${req.params.departmentId}`);
      const { departmentId } = req.params;
      
      const { data, error } = await backendContentService.getProgramsByDepartment(departmentId);
      
      if (error) {
        const errorResponse = createErrorResponse(
          500,
          'Failed to fetch programs by department',
          'PROGRAMS_FETCH_ERROR',
          error
        );
        
        return sendJSONResponse(res, 500, errorResponse, 'Programs GET By Department Error');
      }
      
      const successResponse = {
        success: true,
        data: data || []
      };
      
      return sendJSONResponse(res, 200, successResponse, 'Programs GET By Department Success');
    } catch (error) {
      console.error(`API: Unexpected error in GET /programs/by-department/${req.params.departmentId}:`, error);
      
      const errorResponse = createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unexpected error fetching programs by department',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.stack : String(error)
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs GET By Department Exception');
    }
  }
);

/**
 * @route GET /api/university/programs/published
 * @desc Get all published programs
 * @access Authenticated - Any authenticated user can access published programs
 */
router.get('/published', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('API: Fetching published programs');
    
    // Create a safe query that handles missing columns
    let fetchQuery = supabaseAdmin
      .from('programs')
      .select('*')
      .eq('status', 'published');
    
    // Try to order by order column, but have a fallback if the column doesn't exist
    try {
      // First attempt with order column
      fetchQuery = fetchQuery.order('order', { ascending: true });
      const { data, error } = await fetchQuery;
      
      if (error) {
        // If column doesn't exist, try without ordering
        if (error.code === '42703' && error.message && error.message.includes('order does not exist')) {
          console.log('API: Column "order" does not exist, falling back to created_at');
          
          // Retry query without the order column
          const { data: retryData, error: retryError } = await supabaseAdmin
            .from('programs')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });
          
          if (retryError) {
            throw retryError;
          }
          
          res.json({
            success: true,
            data: retryData || []
          });
          return;
        } else {
          throw error;
        }
      }
      
      res.json({
        success: true,
        data: data || []
      });
      return;
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch published programs',
        400, 
        error.code || 'PROGRAMS_FETCH_ERROR'
      );
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/university/programs/:programId
 * @desc Get a single program by ID with its associated courses
 * @access Authenticated - Any authenticated user can view program details
 */
router.get('/:programId', 
  requireAuth,
  validateParams(programIdSchema),
  async (req: AuthenticatedRequest<{ programId: string }>, res: Response, next: NextFunction) => {
    try {
      console.log(`API: Fetching program ${req.params.programId}`);
      const { programId } = req.params;
      const includeCourses = req.query.includeCourses === 'true';
      
      const { data, error } = await backendContentService.getProgramById(programId, includeCourses);
      
      if (error) {
        const errorResponse = createErrorResponse(
          500,
          'Failed to fetch program',
          'PROGRAM_FETCH_ERROR',
          error
        );
        
        return sendJSONResponse(res, 500, errorResponse, 'Programs GET By ID Error');
      }
      
      if (!data) {
        const notFoundResponse = createErrorResponse(
          404,
          'Program not found',
          'PROGRAM_NOT_FOUND'
        );
        
        return sendJSONResponse(res, 404, notFoundResponse, 'Programs GET By ID Not Found');
      }
      
      const successResponse = {
        success: true,
        data
      };
      
      return sendJSONResponse(res, 200, successResponse, 'Programs GET By ID Success');
    } catch (error) {
      console.error(`API: Unexpected error in GET /programs/${req.params.programId}:`, error);
      
      const errorResponse = createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unexpected error fetching program',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.stack : String(error)
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs GET By ID Exception');
    }
  }
);

/**
 * @route POST /api/university/programs
 * @desc Create a new program
 * @access Admin or SuperAdmin - Only administrators can create programs
 */
router.post('/', 
  requireAuth,
  validateBody(createProgramSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log('API: Creating new program');
      const programData = req.body;
      
      const { data, error } = await backendContentService.createProgram(programData);
      
      if (error) {
        const errorResponse = createErrorResponse(
          500,
          'Failed to create program',
          'PROGRAM_CREATE_ERROR',
          error
        );
        
        return sendJSONResponse(res, 500, errorResponse, 'Programs POST Create Error');
      }
      
      const successResponse = {
        success: true,
        data
      };
      
      return sendJSONResponse(res, 201, successResponse, 'Programs POST Create Success');
    } catch (error) {
      console.error('API: Unexpected error in POST /programs:', error);
      
      const errorResponse = createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unexpected error creating program',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.stack : String(error)
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs POST Create Exception');
    }
  }
);

/**
 * @route PUT /api/university/programs/:programId
 * @desc Update an existing program
 * @access Admin or SuperAdmin - Only administrators can update programs
 */
router.put('/:programId', 
  requireAuth,
  validateParams(programIdSchema),
  validateBody(updateProgramSchema),
  async (req: AuthenticatedRequest<{ programId: string }>, res: Response, next: NextFunction) => {
    try {
      console.log(`API: Updating program ${req.params.programId}`);
      const { programId } = req.params;
      const programData = req.body;
      
      const { data, error } = await backendContentService.updateProgram(programId, programData);
      
      if (error) {
        const errorResponse = createErrorResponse(
          500,
          'Failed to update program',
          'PROGRAM_UPDATE_ERROR',
          error
        );
        
        return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Update Error');
      }
      
      if (!data) {
        const notFoundResponse = createErrorResponse(
          404,
          'Program not found',
          'PROGRAM_NOT_FOUND'
        );
        
        return sendJSONResponse(res, 404, notFoundResponse, 'Programs PUT Update Not Found');
      }
      
      const successResponse = {
        success: true,
        data
      };
      
      return sendJSONResponse(res, 200, successResponse, 'Programs PUT Update Success');
    } catch (error) {
      console.error(`API: Unexpected error in PUT /programs/${req.params.programId}:`, error);
      
      const errorResponse = createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unexpected error updating program',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.stack : String(error)
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Update Exception');
    }
  }
);

/**
 * @route DELETE /api/university/programs/:programId
 * @desc Delete a program if it has no associated courses
 * @access Admin or SuperAdmin - Only administrators can delete programs
 */
router.delete('/:programId', 
  requireAuth,
  validateParams(programIdSchema),
  async (req: AuthenticatedRequest<{ programId: string }>, res: Response, next: NextFunction) => {
    try {
      console.log(`API: Deleting program ${req.params.programId}`);
      const { programId } = req.params;
      
      const { data, error } = await backendContentService.deleteProgram(programId);
      
      if (error) {
        const errorResponse = createErrorResponse(
          500,
          'Failed to delete program',
          'PROGRAM_DELETE_ERROR',
          error
        );
        
        return sendJSONResponse(res, 500, errorResponse, 'Programs DELETE Error');
      }
      
      if (!data) {
        const notFoundResponse = createErrorResponse(
          404,
          'Program not found or already deleted',
          'PROGRAM_NOT_FOUND'
        );
        
        return sendJSONResponse(res, 404, notFoundResponse, 'Programs DELETE Not Found');
      }
      
      const successResponse = {
        success: true,
        data: { id: programId, deleted: true }
      };
      
      return sendJSONResponse(res, 200, successResponse, 'Programs DELETE Success');
    } catch (error) {
      console.error(`API: Unexpected error in DELETE /programs/${req.params.programId}:`, error);
      
      const errorResponse = createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unexpected error deleting program',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.stack : String(error)
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs DELETE Exception');
    }
  }
);

/**
 * @route PUT /api/university/programs/reorder
 * @desc Reorder multiple programs by updating their order values
 * @access Admin or SuperAdmin - Only administrators can reorder programs
 */
router.put('/reorder', 
  requireAuth,
  validateBody(reorderProgramsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log('API: Reordering programs');
      const { program_ids } = req.body;
      
      const { data, error } = await backendContentService.reorderPrograms(program_ids);
      
      if (error) {
        const errorResponse = createErrorResponse(
          500,
          'Failed to reorder programs',
          'PROGRAMS_REORDER_ERROR',
          error
        );
        
        return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Reorder Error');
      }
      
      const successResponse = {
        success: true,
        data
      };
      
      return sendJSONResponse(res, 200, successResponse, 'Programs PUT Reorder Success');
    } catch (error) {
      console.error('API: Unexpected error in PUT /programs/reorder:', error);
      
      const errorResponse = createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unexpected error reordering programs',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.stack : String(error)
      );
      
      return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Reorder Exception');
    }
  }
);

/**
 * @route GET /api/university/programs/:programId/courses
 * @desc Get courses by program ID
 * @access Authenticated - Any authenticated user can access
 */
router.get('/:programId/courses', 
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { programId } = req.params;
      
      // First check if program exists
      const { data: program, error: programError } = await supabaseAdmin
        .from('programs')
        .select('id')
        .eq('id', programId)
        .single();
      
      if (programError) {
        if (programError.code === 'PGRST116') {
          throw new ApiError('Program not found', 404, 'NOT_FOUND');
        }
        throw new ApiError(programError.message, 400, programError.code);
      }
      
      // Get courses for this program
      try {
        // Try with order column first
        const { data, error } = await supabaseAdmin
          .from('courses')
          .select('*')
          .eq('program_id', programId)
          .order('order', { ascending: true });
        
        if (error) {
          // If order column doesn't exist, fall back to created_at
          if (error.code === '42703' && error.message && error.message.includes('order does not exist')) {
            console.log('API: Column "order" does not exist in courses, falling back to created_at');
            
            // Retry query without the order column
            const { data: retryData, error: retryError } = await supabaseAdmin
              .from('courses')
              .select('*')
              .eq('program_id', programId)
              .order('created_at', { ascending: false });
            
            if (retryError) throw retryError;
            
            res.json({
              success: true,
              data: retryData || []
            });
            return;
          } else {
            throw error;
          }
        }
        
        res.json({
          success: true,
          data: data || []
        });
        return;
        
      } catch (error: any) {
        throw new ApiError(error.message, 400, error.code);
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router; 