import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const tipIdSchema = z.object({
  tipId: z.string().uuid('Invalid tip ID format')
});

const createTipSchema = z.object({
  provider_id: z.string().uuid('Invalid provider ID'),
  amount: z.number().positive('Tip amount must be positive'),
  appointment_id: z.string().uuid('Invalid appointment ID').optional(),
  service_date: z.string().optional(),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
  payment_method: z.enum(['credit_card', 'mobile_payment', 'cash', 'other']),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending')
});

const updateTipSchema = z.object({
  amount: z.number().positive('Tip amount must be positive').optional(),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
  payment_method: z.enum(['credit_card', 'mobile_payment', 'cash', 'other']).optional(),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional()
});

const tipQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  as_provider: z.boolean().optional()
}).partial();

/**
 * @route GET /api/gratuity/tips
 * @desc Get all tips (received or given depending on user role)
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/',
  requireAuth,
  validateQuery(tipQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { status, start_date, end_date, as_provider = false } = req.query as {
        status?: 'pending' | 'completed' | 'failed' | 'refunded';
        start_date?: string;
        end_date?: string;
        as_provider?: boolean | string;
      };
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      let query = supabase
        .from('gratuity_tips')
        .select(`
          *,
          provider:provider_id(id, first_name, last_name, profile_image),
          tipper:tipper_id(id, first_name, last_name, profile_image),
          appointment:appointment_id(id, date, start_time, end_time, service_id)
        `);
      
      // Filter by user role (provider receiving tips or tipper giving tips)
      if (as_provider === true || as_provider === 'true') {
        query = query.eq('provider_id', userId);
      } else {
        query = query.eq('tipper_id', userId);
      }
      
      // Apply additional filters if provided
      if (status) {
        query = query.eq('payment_status', status);
      }
      
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      
      if (end_date) {
        // Add one day to include the full end date
        const nextDay = new Date(end_date);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString());
      }
      
      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/gratuity/tips/:tipId
 * @desc Get details of a specific tip
 * @access Authenticated (tip provider or tipper)
 */
// @ts-ignore: Express router type compatibility
router.get('/:tipId',
  requireAuth,
  validateParams(tipIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { tipId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      const { data, error } = await supabase
        .from('gratuity_tips')
        .select(`
          *,
          provider:provider_id(id, first_name, last_name, profile_image, email, phone),
          tipper:tipper_id(id, first_name, last_name, profile_image, email),
          appointment:appointment_id(
            id, 
            date, 
            start_time, 
            end_time, 
            service:service_id(id, name, price)
          )
        `)
        .eq('id', tipId)
        .single();
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      if (!data) {
        next(new ApiError('Tip not found', 404, 'NOT_FOUND'));
        return;
      }
      
      // Check access - only provider or tipper can view
      if (data.provider_id !== userId && data.tipper_id !== userId) {
        next(new ApiError('You do not have permission to view this tip', 403, 'FORBIDDEN'));
        return;
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/gratuity/tips
 * @desc Create a new tip
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  validateBody(createTipSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const tipData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Verify provider exists
      const { data: provider, error: providerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', tipData.provider_id)
        .single();
      
      if (providerError || !provider) {
        next(new ApiError('Provider not found', 404, 'PROVIDER_NOT_FOUND'));
        return;
      }
      
      // Check if appointment exists if provided
      if (tipData.appointment_id) {
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('id, provider_id')
          .eq('id', tipData.appointment_id)
          .single();
        
        if (appointmentError || !appointment) {
          next(new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
          return;
        }
        
        // Verify the appointment belongs to the specified provider
        if (appointment.provider_id !== tipData.provider_id) {
          next(new ApiError('Appointment does not belong to the specified provider', 400, 'INVALID_APPOINTMENT_PROVIDER'));
          return;
        }
      }
      
      // If payment method is cash, mark as completed immediately
      if (tipData.payment_method === 'cash') {
        tipData.payment_status = 'completed';
      }
      
      // Create the tip
      const { data, error } = await supabase
        .from('gratuity_tips')
        .insert({
          ...tipData,
          tipper_id: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/gratuity/tips/:tipId
 * @desc Update a tip
 * @access Authenticated (tip creator only)
 */
// @ts-ignore: Express router type compatibility
router.put('/:tipId',
  requireAuth,
  validateParams(tipIdSchema),
  validateBody(updateTipSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { tipId } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if user is the creator of the tip
      const { data: tip, error: fetchError } = await supabase
        .from('gratuity_tips')
        .select('tipper_id, payment_status')
        .eq('id', tipId)
        .single();
      
      if (fetchError || !tip) {
        next(new ApiError('Tip not found', 404, 'NOT_FOUND'));
        return;
      }
      
      if (tip.tipper_id !== userId) {
        next(new ApiError('You can only update tips you created', 403, 'FORBIDDEN'));
        return;
      }
      
      // Don't allow updates to completed tips
      if (tip.payment_status === 'completed' || tip.payment_status === 'refunded') {
        next(new ApiError('Cannot update a completed or refunded tip', 400, 'TIP_COMPLETED'));
        return;
      }
      
      // Update the tip
      const { data, error } = await supabase
        .from('gratuity_tips')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tipId)
        .select()
        .single();
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/gratuity/tips/:tipId
 * @desc Cancel a pending tip
 * @access Authenticated (tip creator only)
 */
// @ts-ignore: Express router type compatibility
router.delete('/:tipId',
  requireAuth,
  validateParams(tipIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { tipId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if user is the creator of the tip and tip is pending
      const { data: tip, error: fetchError } = await supabase
        .from('gratuity_tips')
        .select('tipper_id, payment_status')
        .eq('id', tipId)
        .single();
      
      if (fetchError || !tip) {
        next(new ApiError('Tip not found', 404, 'NOT_FOUND'));
        return;
      }
      
      if (tip.tipper_id !== userId) {
        next(new ApiError('You can only cancel tips you created', 403, 'FORBIDDEN'));
        return;
      }
      
      if (tip.payment_status !== 'pending') {
        next(new ApiError('Only pending tips can be cancelled', 400, 'INVALID_STATUS'));
        return;
      }
      
      // Delete the tip
      const { error } = await supabase
        .from('gratuity_tips')
        .delete()
        .eq('id', tipId);
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Tip cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 