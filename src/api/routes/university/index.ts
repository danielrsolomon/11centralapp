import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import programsRoutes from './programs.js';
import coursesRoutes from './courses.js';
import modulesRoutes from './modules.js';
import lessonsRoutes from './lessons.js';
import progressRoutes from './progress.js';
import contentRoutes from './content.js';
import { ApiError, createErrorResponse } from '../../middleware/error-handler.js';
import { backendContentService } from '../../services/backendContentService.js';
import { PostgrestError } from '@supabase/supabase-js';

const router = Router();

/**
 * Helper to get a safe error code from any error object
 */
const getErrorCode = (error: any): string => {
  if (error && typeof error === 'object') {
    // Check if it's a PostgrestError with a code property
    if ('code' in error) {
      return error.code as string;
    }
    
    // Check if error has a name that can be used as code
    if ('name' in error && typeof error.name === 'string') {
      return error.name;
    }
  }
  
  return 'UNKNOWN_ERROR';
};

// Root route with module information
router.get('/', (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'University Module',
      description: 'Learning management system for E11EVEN Central',
      endpoints: [
        '/api/university/programs',
        '/api/university/courses',
        '/api/university/modules',
        '/api/university/lessons',
        '/api/university/progress',
        '/api/university/content/hierarchy',
        '/api/university/content/archive',
        '/api/university/content/restore',
        '/api/university/content/archived'
      ]
    }
  });
});

// Content hierarchy endpoint - refactored to use backend service layer
// @ts-ignore: Express router type compatibility
router.get('/content/hierarchy', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('API: Fetching content hierarchy');
    
    // Use the backend content service to get hierarchy data
    const { data, error } = await backendContentService.getContentHierarchy();
    
    if (error) {
      console.error('API: Error fetching content hierarchy:', error);
      
      // Special handling for missing column error
      if (typeof error === 'object' && 
          error !== null && 
          'code' in error && 
          error.code === '42703' && 
          'message' in error && 
          typeof error.message === 'string' && 
          error.message.includes('order does not exist')) {
        // Return an empty but valid response to avoid frontend errors
        console.log('API: Missing order column in modules table, returning empty hierarchy');
        const emptySuccessResponse = {
          success: true,
          data: []
        };
        
        res.setHeader('Content-Type', 'application/json');
        return res.json(emptySuccessResponse);
      }
      
      // Create standardized error response
      const errorResponse = createErrorResponse(
        500,
        error.message || 'Failed to fetch content hierarchy',
        getErrorCode(error) || 'CONTENT_HIERARCHY_ERROR',
        error
      );
      
      // Enhanced debugging - log the exact error response being sent
      console.log('DEBUG - Content Hierarchy Error Response [EXACT]:', JSON.stringify(errorResponse, null, 2));
      
      // Explicitly set content type
      res.setHeader('Content-Type', 'application/json');
      
      // Log response headers
      console.log('DEBUG - Content Hierarchy Error Response Headers:', res.getHeaders());
      
      return res.status(500).json(errorResponse);
    }
    
    // Create standardized success response
    const successResponse = {
      success: true,
      data: data || []
    };
    
    // Enhanced debugging - log the exact success response being sent
    console.log('DEBUG - Content Hierarchy Success Response [EXACT]:', JSON.stringify(successResponse, null, 2));
    console.log('DEBUG - Content Hierarchy Response Structure:', {
      success: successResponse.success,
      dataIsArray: Array.isArray(successResponse.data),
      dataLength: Array.isArray(successResponse.data) ? successResponse.data.length : 'not an array',
      firstItem: Array.isArray(successResponse.data) && successResponse.data.length > 0 ? 
        JSON.stringify(successResponse.data[0]).substring(0, 100) + '...' : 'no items',
      responseKeys: Object.keys(successResponse)
    });
    
    // Explicitly set content type
    res.setHeader('Content-Type', 'application/json');
    
    // Log response headers
    console.log('DEBUG - Content Hierarchy Success Response Headers:', res.getHeaders());
    
    // Return the hierarchical tree with consistent format
    return res.json(successResponse);
  } catch (error) {
    console.error('API: Unexpected error fetching content hierarchy:', error);
    // Return a valid JSON response with error information using helper
    const errorResponse = createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Unexpected error fetching content hierarchy',
      'UNEXPECTED_ERROR',
      error instanceof Error ? error.stack : String(error)
    );
    
    // Enhanced debugging - log the exact catch error response being sent
    console.log('DEBUG - Content Hierarchy Catch Error Response [EXACT]:', JSON.stringify(errorResponse, null, 2));
    
    // Explicitly set content type
    res.setHeader('Content-Type', 'application/json');
    
    // Log response headers
    console.log('DEBUG - Content Hierarchy Catch Error Response Headers:', res.getHeaders());
    
    return res.status(500).json(errorResponse);
  }
});

// Mount sub-routes
router.use('/programs', programsRoutes);
router.use('/courses', coursesRoutes);
router.use('/modules', modulesRoutes);
router.use('/lessons', lessonsRoutes);
router.use('/progress', progressRoutes);
router.use('/content', contentRoutes);

export default router; 