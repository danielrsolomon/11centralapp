import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabaseAdmin';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const availabilityIdSchema = z.object({
  availabilityId: z.string().uuid('Invalid availability ID format')
});

const availabilitySchema = z.object({
  provider_id: z.string().uuid('Invalid provider ID'),
  date: z.string().refine((val) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, {
    message: 'Date must be in format YYYY-MM-DD'
  }),
  start_time: z.string().refine((val) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
  }, {
    message: 'Start time must be in format HH:MM (24-hour)'
  }),
  end_time: z.string().refine((val) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
  }, {
    message: 'End time must be in format HH:MM (24-hour)'
  }),
  recurring: z.boolean().default(false),
  recurring_days: z.array(z.number().min(0).max(6)).optional(),
  recurring_until: z.string().optional()
});

const availabilityQuerySchema = z.object({
  providerId: z.string().uuid('Invalid provider ID').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in format YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in format YYYY-MM-DD').optional()
});

/**
 * @route GET /api/schedule/availability
 * @desc Get provider availability
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/',
  requireAuth,
  validateQuery(availabilityQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { providerId, startDate, endDate } = req.query;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Start building the query
      let query = supabaseAdmin
        .from('schedule_availability')
        .select(`
          *,
          provider:provider_id(id, first_name, last_name, avatar_url)
        `);
      
      // If providerId is specified, filter by that provider
      if (providerId) {
        query = query.eq('provider_id', providerId);
      } else {
        // If no provider is specified, only show the current user's availability
        // unless the user is an admin
        const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
        if (!isAdmin) {
          query = query.eq('provider_id', userId);
        }
      }
      
      // Apply date filters if provided
      if (startDate) {
        query = query.gte('date', startDate as string);
      }
      
      if (endDate) {
        query = query.lte('date', endDate as string);
      }
      
      // Execute the query with ordering
      const { data: availability, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data: availability || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/schedule/availability
 * @desc Set provider availability
 * @access Authenticated, Provider or Admin
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  validateBody(availabilitySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const availabilityData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // If setting availability for another provider, check if user is admin
      if (availabilityData.provider_id !== userId) {
        const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
        if (!isAdmin) {
          next(new ApiError('You can only set your own availability', 403, 'FORBIDDEN'));
          return;
        }
      }
      
      // Validate that end_time is after start_time
      const startParts = availabilityData.start_time.split(':');
      const endParts = availabilityData.end_time.split(':');
      
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      
      if (endMinutes <= startMinutes) {
        next(new ApiError('End time must be after start time', 400, 'INVALID_TIME_RANGE'));
        return;
      }
      
      // Check for overlapping availability
      const { data: existingAvailability, error: existingError } = await supabaseAdmin
        .from('schedule_availability')
        .select('*')
        .eq('provider_id', availabilityData.provider_id)
        .eq('date', availabilityData.date)
        .or(`start_time.lt.${availabilityData.end_time},end_time.gt.${availabilityData.start_time}`);
      
      if (existingError) {
        next(new ApiError(existingError.message, 400, existingError.code));
        return;
      }
      
      if (existingAvailability && existingAvailability.length > 0) {
        next(new ApiError('The new availability overlaps with existing availability', 400, 'AVAILABILITY_OVERLAP'));
        return;
      }
      
      // Create the availability record
      const { data: availability, error: createError } = await supabaseAdmin
        .from('schedule_availability')
        .insert({
          ...availabilityData,
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        next(new ApiError(createError.message, 400, createError.code));
        return;
      }
      
      // If recurring, create the recurring availability slots
      if (availabilityData.recurring && availabilityData.recurring_days && availabilityData.recurring_until) {
        const startDate = new Date(availabilityData.date);
        const endDate = new Date(availabilityData.recurring_until);
        const recurringDays: number[] = availabilityData.recurring_days;
        
        const recurringAvailability = [];
        
        // Start from the next day of the initial availability
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + 1);
        
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
          
          if (recurringDays.includes(dayOfWeek)) {
            recurringAvailability.push({
              provider_id: availabilityData.provider_id,
              date: currentDate.toISOString().split('T')[0],
              start_time: availabilityData.start_time,
              end_time: availabilityData.end_time,
              recurring: false,
              created_by: userId,
              created_at: new Date().toISOString()
            });
          }
          
          // Move to the next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Insert recurring availability if any
        if (recurringAvailability.length > 0) {
          const { error: recurringError } = await supabaseAdmin
            .from('schedule_availability')
            .insert(recurringAvailability);
          
          if (recurringError) {
            console.error('Error creating recurring availability:', recurringError);
          }
        }
      }
      
      res.status(201).json({
        success: true,
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/schedule/availability/:availabilityId
 * @desc Update provider availability
 * @access Authenticated, Provider or Admin
 */
// @ts-ignore: Express router type compatibility
router.put('/:availabilityId',
  requireAuth,
  validateParams(availabilityIdSchema),
  validateBody(availabilitySchema.partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { availabilityId } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if the availability exists
      const { data: existingAvailability, error: existingError } = await supabaseAdmin
        .from('schedule_availability')
        .select('provider_id, date, start_time, end_time')
        .eq('id', availabilityId)
        .single();
      
      if (existingError) {
        next(new ApiError(existingError.message, 400, existingError.code));
        return;
      }
      
      if (!existingAvailability) {
        next(new ApiError('Availability not found', 404, 'AVAILABILITY_NOT_FOUND'));
        return;
      }
      
      // Check permission to update
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
      if (existingAvailability.provider_id !== userId && !isAdmin) {
        next(new ApiError('You can only update your own availability', 403, 'FORBIDDEN'));
        return;
      }
      
      // Set up data for the check
      const date = updateData.date || existingAvailability.date;
      const startTime = updateData.start_time || existingAvailability.start_time;
      const endTime = updateData.end_time || existingAvailability.end_time;
      const providerId = updateData.provider_id || existingAvailability.provider_id;
      
      // If changing times, validate that end_time is after start_time
      if (updateData.start_time || updateData.end_time) {
        const startParts = startTime.split(':');
        const endParts = endTime.split(':');
        
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        
        if (endMinutes <= startMinutes) {
          next(new ApiError('End time must be after start time', 400, 'INVALID_TIME_RANGE'));
          return;
        }
      }
      
      // Check for overlapping availability with other records
      if (updateData.date || updateData.start_time || updateData.end_time || updateData.provider_id) {
        const { data: overlappingAvailability, error: overlapError } = await supabaseAdmin
          .from('schedule_availability')
          .select('*')
          .eq('provider_id', providerId)
          .eq('date', date)
          .not('id', 'eq', availabilityId)
          .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);
        
        if (overlapError) {
          next(new ApiError(overlapError.message, 400, overlapError.code));
          return;
        }
        
        if (overlappingAvailability && overlappingAvailability.length > 0) {
          next(new ApiError('The updated availability overlaps with existing availability', 400, 'AVAILABILITY_OVERLAP'));
          return;
        }
      }
      
      // Check for any appointments during this time
      if (updateData.date || updateData.start_time || updateData.end_time) {
        const { data: existingAppointments, error: appointmentError } = await supabaseAdmin
          .from('schedule_appointments')
          .select('*')
          .eq('provider_id', providerId)
          .eq('date', date)
          .not('status', 'eq', 'cancelled')
          .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);
        
        if (appointmentError) {
          next(new ApiError(appointmentError.message, 400, appointmentError.code));
          return;
        }
        
        if (existingAppointments && existingAppointments.length > 0) {
          next(new ApiError('Cannot update availability with existing appointments', 400, 'EXISTING_APPOINTMENTS'));
          return;
        }
      }
      
      // Update the availability
      const { data: updatedAvailability, error: updateError } = await supabaseAdmin
        .from('schedule_availability')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', availabilityId)
        .select()
        .single();
      
      if (updateError) {
        next(new ApiError(updateError.message, 400, updateError.code));
        return;
      }
      
      res.json({
        success: true,
        data: updatedAvailability
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/schedule/availability/:availabilityId
 * @desc Delete provider availability
 * @access Authenticated, Provider or Admin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:availabilityId',
  requireAuth,
  validateParams(availabilityIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { availabilityId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if the availability exists
      const { data: existingAvailability, error: existingError } = await supabaseAdmin
        .from('schedule_availability')
        .select('provider_id, date, start_time, end_time')
        .eq('id', availabilityId)
        .single();
      
      if (existingError) {
        next(new ApiError(existingError.message, 400, existingError.code));
        return;
      }
      
      if (!existingAvailability) {
        next(new ApiError('Availability not found', 404, 'AVAILABILITY_NOT_FOUND'));
        return;
      }
      
      // Check permission to delete
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
      if (existingAvailability.provider_id !== userId && !isAdmin) {
        next(new ApiError('You can only delete your own availability', 403, 'FORBIDDEN'));
        return;
      }
      
      // Check for any appointments during this time
      const { data: existingAppointments, error: appointmentError } = await supabaseAdmin
        .from('schedule_appointments')
        .select('*')
        .eq('provider_id', existingAvailability.provider_id)
        .eq('date', existingAvailability.date)
        .not('status', 'eq', 'cancelled')
        .or(`start_time.lt.${existingAvailability.end_time},end_time.gt.${existingAvailability.start_time}`);
      
      if (appointmentError) {
        next(new ApiError(appointmentError.message, 400, appointmentError.code));
        return;
      }
      
      if (existingAppointments && existingAppointments.length > 0) {
        next(new ApiError('Cannot delete availability with existing appointments', 400, 'EXISTING_APPOINTMENTS'));
        return;
      }
      
      // Delete the availability
      const { error: deleteError } = await supabaseAdmin
        .from('schedule_availability')
        .delete()
        .eq('id', availabilityId);
      
      if (deleteError) {
        next(new ApiError(deleteError.message, 400, deleteError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Availability deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 