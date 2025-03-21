import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabaseAdmin';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const serviceIdSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format')
});

const createServiceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description cannot exceed 500 characters'),
  duration_minutes: z.number().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours'),
  price: z.number().min(0, 'Price cannot be negative'),
  is_active: z.boolean().default(true),
  category: z.string().optional(),
  thumbnail_url: z.string().url('Invalid URL format').optional()
});

const updateServiceSchema = createServiceSchema.partial();

/**
 * @route GET /api/schedule/services
 * @desc List all services
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/',
  requireAuth,
  validateQuery(z.object({
    category: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  }).partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { category, isActive } = req.query;
      
      // Start building the query
      let query = supabaseAdmin
        .from('schedule_services')
        .select('*');
      
      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true');
      }
      
      // Execute query
      const { data: services, error } = await query
        .order('name', { ascending: true });
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data: services || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/schedule/services/:serviceId
 * @desc Get a specific service by ID
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:serviceId',
  requireAuth,
  validateParams(serviceIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { serviceId } = req.params;
      
      const { data: service, error } = await supabaseAdmin
        .from('schedule_services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      if (!service) {
        next(new ApiError('Service not found', 404, 'SERVICE_NOT_FOUND'));
        return;
      }
      
      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/schedule/services
 * @desc Create a new service
 * @access Authenticated, Admin or Manager
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  requireRole(['admin', 'manager']),
  validateBody(createServiceSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const serviceData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if service with the same name already exists
      const { data: existingService, error: checkError } = await supabaseAdmin
        .from('schedule_services')
        .select('id')
        .eq('name', serviceData.name)
        .maybeSingle();
      
      if (checkError) {
        next(new ApiError(checkError.message, 400, checkError.code));
        return;
      }
      
      if (existingService) {
        next(new ApiError('A service with this name already exists', 400, 'SERVICE_NAME_EXISTS'));
        return;
      }
      
      // Create the service
      const { data: service, error: createError } = await supabaseAdmin
        .from('schedule_services')
        .insert({
          ...serviceData,
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        next(new ApiError(createError.message, 400, createError.code));
        return;
      }
      
      res.status(201).json({
        success: true,
        data: service
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/schedule/services/:serviceId
 * @desc Update a service
 * @access Authenticated, Admin or Manager
 */
// @ts-ignore: Express router type compatibility
router.put('/:serviceId',
  requireAuth,
  requireRole(['admin', 'manager']),
  validateParams(serviceIdSchema),
  validateBody(updateServiceSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { serviceId } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if service exists
      const { data: existingService, error: checkError } = await supabaseAdmin
        .from('schedule_services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (checkError) {
        next(new ApiError(checkError.message, 400, checkError.code));
        return;
      }
      
      if (!existingService) {
        next(new ApiError('Service not found', 404, 'SERVICE_NOT_FOUND'));
        return;
      }
      
      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name !== existingService.name) {
        const { data: nameCheck, error: nameError } = await supabaseAdmin
          .from('schedule_services')
          .select('id')
          .eq('name', updateData.name)
          .not('id', 'eq', serviceId)
          .maybeSingle();
        
        if (nameError) {
          next(new ApiError(nameError.message, 400, nameError.code));
          return;
        }
        
        if (nameCheck) {
          next(new ApiError('A service with this name already exists', 400, 'SERVICE_NAME_EXISTS'));
          return;
        }
      }
      
      // Update the service
      const { data: service, error: updateError } = await supabaseAdmin
        .from('schedule_services')
        .update({
          ...updateData,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();
      
      if (updateError) {
        next(new ApiError(updateError.message, 400, updateError.code));
        return;
      }
      
      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/schedule/services/:serviceId
 * @desc Delete a service or mark as inactive
 * @access Authenticated, Admin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:serviceId',
  requireAuth,
  requireRole(['admin']),
  validateParams(serviceIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { serviceId } = req.params;
      
      // Check if service exists
      const { data: existingService, error: checkError } = await supabaseAdmin
        .from('schedule_services')
        .select('id')
        .eq('id', serviceId)
        .single();
      
      if (checkError) {
        next(new ApiError(checkError.message, 400, checkError.code));
        return;
      }
      
      if (!existingService) {
        next(new ApiError('Service not found', 404, 'SERVICE_NOT_FOUND'));
        return;
      }
      
      // Check if there are any appointments using this service
      const { data: appointments, error: appointmentError } = await supabaseAdmin
        .from('schedule_appointments')
        .select('id')
        .eq('service_id', serviceId)
        .limit(1);
      
      if (appointmentError) {
        next(new ApiError(appointmentError.message, 400, appointmentError.code));
        return;
      }
      
      // If the service is used in appointments, just mark it as inactive instead of deleting
      if (appointments && appointments.length > 0) {
        const { data: service, error: updateError } = await supabaseAdmin
          .from('schedule_services')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
            updated_by: req.user?.id
          })
          .eq('id', serviceId)
          .select()
          .single();
        
        if (updateError) {
          next(new ApiError(updateError.message, 400, updateError.code));
          return;
        }
        
        res.json({
          success: true,
          message: 'Service has been marked as inactive because it is used in appointments',
          data: service
        });
        return;
      }
      
      // Delete the service if not used in appointments
      const { error: deleteError } = await supabaseAdmin
        .from('schedule_services')
        .delete()
        .eq('id', serviceId);
      
      if (deleteError) {
        next(new ApiError(deleteError.message, 400, deleteError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 