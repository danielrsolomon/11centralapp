import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { throwApiError } from '../../middleware/error-handler';
import { asyncHandler, authAsyncHandler } from '../../middleware/express-utils';

const router = Router();

// Example validation schema
const exampleSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  name: z.string().min(2, 'Name must be at least 2 characters')
});

/**
 * @route GET /api/admin/example
 * @desc Get all examples
 * @access Admin
 */
router.get('/', 
  requireAuth,
  requireRole(['admin']),
  authAsyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('examples')
      .select('*');
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    // Don't use return here - just call res.json()
    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route POST /api/admin/example
 * @desc Create a new example
 * @access Admin
 */
router.post('/',
  requireAuth,
  requireRole(['admin']),
  validateBody(exampleSchema),
  authAsyncHandler(async (req, res) => {
    const { id, name } = req.body;
    
    // Create new record
    const { data, error } = await supabase
      .from('examples')
      .insert({ id, name })
      .select()
      .single();
    
    if (error) {
      throwApiError(error.message, 400, error.code);
    }
    
    // Don't use return here - just call res.status().json()
    res.status(201).json({
      success: true,
      data
    });
  })
);

export default router; 