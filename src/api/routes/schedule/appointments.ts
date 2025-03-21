import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabaseAdmin';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const appointmentIdSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID format')
});

const createAppointmentSchema = z.object({
  provider_id: z.string().uuid('Invalid provider ID'),
  service_id: z.string().uuid('Invalid service ID'),
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
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).default('scheduled')
});

const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional()
});

const appointmentQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in format YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in format YYYY-MM-DD').optional(),
  providerId: z.string().uuid('Invalid provider ID').optional(),
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional()
});

// Appointment schema for validation
const appointmentSchema = z.object({
  service_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  user_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  notes: z.string().optional(),
});

/**
 * @route GET /api/schedule/appointments
 * @desc List appointments with optional filtering
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/',
  requireAuth,
  validateQuery(appointmentQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, providerId, status } = req.query;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Start building the query
      let query = supabaseAdmin
        .from('schedule_appointments')
        .select(`
          *,
          provider:provider_id(id, first_name, last_name, avatar_url),
          service:service_id(id, name, description, duration_minutes, price)
        `);
      
      // Add filters based on query parameters
      if (startDate) {
        query = query.gte('date', startDate as string);
      }
      
      if (endDate) {
        query = query.lte('date', endDate as string);
      }
      
      if (providerId) {
        query = query.eq('provider_id', providerId);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      // If user is not admin, only show appointments they're involved in
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
      if (!isAdmin) {
        query = query.or(`client_id.eq.${userId},provider_id.eq.${userId}`);
      }
      
      // Execute the query with ordering
      const { data: appointments, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      res.json({
        success: true,
        data: appointments || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/schedule/appointments/:appointmentId
 * @desc Get appointment details
 * @access Authenticated, Appointment Participant
 */
// @ts-ignore: Express router type compatibility
router.get('/:appointmentId',
  requireAuth,
  validateParams(appointmentIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { appointmentId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Get the appointment with related data
      const { data: appointment, error } = await supabaseAdmin
        .from('schedule_appointments')
        .select(`
          *,
          provider:provider_id(id, first_name, last_name, avatar_url, email, phone),
          service:service_id(id, name, description, duration_minutes, price)
        `)
        .eq('id', appointmentId)
        .single();
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      if (!appointment) {
        next(new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
        return;
      }
      
      // Check if user is involved in this appointment or is an admin
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
      const isInvolved = appointment.client_id === userId || appointment.provider_id === userId;
      
      if (!isAdmin && !isInvolved) {
        next(new ApiError('You do not have permission to view this appointment', 403, 'FORBIDDEN'));
        return;
      }
      
      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/schedule/appointments
 * @desc Book a new appointment
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  validateBody(createAppointmentSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const appointmentData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if provider exists
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', appointmentData.provider_id)
        .single();
      
      if (providerError || !provider) {
        next(new ApiError('Provider not found', 404, 'PROVIDER_NOT_FOUND'));
        return;
      }
      
      // Check if service exists
      const { data: service, error: serviceError } = await supabaseAdmin
        .from('schedule_services')
        .select('id, duration_minutes')
        .eq('id', appointmentData.service_id)
        .single();
      
      if (serviceError || !service) {
        next(new ApiError('Service not found', 404, 'SERVICE_NOT_FOUND'));
        return;
      }
      
      // Check provider availability
      const { data: availability, error: availabilityError } = await supabaseAdmin
        .from('schedule_availability')
        .select('*')
        .eq('provider_id', appointmentData.provider_id)
        .eq('date', appointmentData.date)
        .lte('start_time', appointmentData.start_time)
        .gte('end_time', appointmentData.end_time);
      
      if (availabilityError) {
        next(new ApiError(availabilityError.message, 400, availabilityError.code));
        return;
      }
      
      if (!availability || availability.length === 0) {
        next(new ApiError('Provider is not available at the selected time', 400, 'PROVIDER_UNAVAILABLE'));
        return;
      }
      
      // Check for conflicting appointments
      const { data: conflictingAppointments, error: conflictError } = await supabaseAdmin
        .from('schedule_appointments')
        .select('*')
        .eq('provider_id', appointmentData.provider_id)
        .eq('date', appointmentData.date)
        .not('status', 'eq', 'cancelled')
        .or(`start_time.lte.${appointmentData.end_time},end_time.gte.${appointmentData.start_time}`);
      
      if (conflictError) {
        next(new ApiError(conflictError.message, 400, conflictError.code));
        return;
      }
      
      if (conflictingAppointments && conflictingAppointments.length > 0) {
        next(new ApiError('There is a conflicting appointment at the selected time', 400, 'APPOINTMENT_CONFLICT'));
        return;
      }
      
      // Create the appointment
      const { data: appointment, error: createError } = await supabaseAdmin
        .from('schedule_appointments')
        .insert({
          ...appointmentData,
          client_id: userId,
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
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/schedule/appointments/:appointmentId
 * @desc Update an appointment
 * @access Authenticated, Appointment Participant
 */
// @ts-ignore: Express router type compatibility
router.put('/:appointmentId',
  requireAuth,
  validateParams(appointmentIdSchema),
  validateBody(updateAppointmentSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { appointmentId } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if appointment exists and user is involved
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('schedule_appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      if (appointmentError) {
        next(new ApiError(appointmentError.message, 400, appointmentError.code));
        return;
      }
      
      if (!appointment) {
        next(new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
        return;
      }
      
      // Check if user is involved in this appointment or is an admin
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
      const isInvolved = appointment.client_id === userId || appointment.provider_id === userId;
      
      if (!isAdmin && !isInvolved) {
        next(new ApiError('You do not have permission to update this appointment', 403, 'FORBIDDEN'));
        return;
      }
      
      // If there are timing changes, check for availability and conflicts
      if (updateData.date || updateData.start_time || updateData.end_time) {
        const appointmentDate = updateData.date || appointment.date;
        const appointmentStartTime = updateData.start_time || appointment.start_time;
        const appointmentEndTime = updateData.end_time || appointment.end_time;
        const providerId = updateData.provider_id || appointment.provider_id;
        
        // Check provider availability
        const { data: availability, error: availabilityError } = await supabaseAdmin
          .from('schedule_availability')
          .select('*')
          .eq('provider_id', providerId)
          .eq('date', appointmentDate)
          .lte('start_time', appointmentStartTime)
          .gte('end_time', appointmentEndTime);
        
        if (availabilityError) {
          next(new ApiError(availabilityError.message, 400, availabilityError.code));
          return;
        }
        
        if (!availability || availability.length === 0) {
          next(new ApiError('Provider is not available at the selected time', 400, 'PROVIDER_UNAVAILABLE'));
          return;
        }
        
        // Check for conflicting appointments
        const { data: conflictingAppointments, error: conflictError } = await supabaseAdmin
          .from('schedule_appointments')
          .select('*')
          .eq('provider_id', providerId)
          .eq('date', appointmentDate)
          .not('id', 'eq', appointmentId) // Exclude current appointment
          .not('status', 'eq', 'cancelled')
          .or(`start_time.lte.${appointmentEndTime},end_time.gte.${appointmentStartTime}`);
        
        if (conflictError) {
          next(new ApiError(conflictError.message, 400, conflictError.code));
          return;
        }
        
        if (conflictingAppointments && conflictingAppointments.length > 0) {
          next(new ApiError('There is a conflicting appointment at the selected time', 400, 'APPOINTMENT_CONFLICT'));
          return;
        }
      }
      
      // Update the appointment
      const { data: updatedAppointment, error: updateError } = await supabaseAdmin
        .from('schedule_appointments')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (updateError) {
        next(new ApiError(updateError.message, 400, updateError.code));
        return;
      }
      
      res.json({
        success: true,
        data: updatedAppointment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/schedule/appointments/:appointmentId
 * @desc Cancel an appointment
 * @access Authenticated, Appointment Participant
 */
// @ts-ignore: Express router type compatibility
router.delete('/:appointmentId',
  requireAuth,
  validateParams(appointmentIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { appointmentId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if appointment exists and user is involved
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('schedule_appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      if (appointmentError) {
        next(new ApiError(appointmentError.message, 400, appointmentError.code));
        return;
      }
      
      if (!appointment) {
        next(new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
        return;
      }
      
      // Check if user is involved in this appointment or is an admin
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
      const isInvolved = appointment.client_id === userId || appointment.provider_id === userId;
      
      if (!isAdmin && !isInvolved) {
        next(new ApiError('You do not have permission to cancel this appointment', 403, 'FORBIDDEN'));
        return;
      }
      
      // Instead of deleting, mark as cancelled
      const { data: updatedAppointment, error: updateError } = await supabaseAdmin
        .from('schedule_appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          cancelled_by: userId
        })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (updateError) {
        next(new ApiError(updateError.message, 400, updateError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: updatedAppointment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get appointments with filtering options
 */
router.get('/filter', requireAuth, async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { user_id, provider_id, status, start_date, end_date } = req.query;
    
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        services:service_id(*),
        providers:provider_id(*),
        users:user_id(*)
      `);
    
    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (start_date) {
      query = query.gte('start_time', start_date);
    }
    
    if (end_date) {
      query = query.lte('end_time', end_date);
    }
    
    // Order by start time
    query = query.order('start_time', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) throw new ApiError(error.message, 400, error.code);
    
    return res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        data: [],
        error: {
          message: error.message,
          code: error.code
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      data: [],
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      }
    });
  }
});

/**
 * Get appointment by ID
 */
router.get('/:appointmentId', requireAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        services:service_id(*),
        providers:provider_id(*),
        users:user_id(*)
      `)
      .eq('id', appointmentId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError('Appointment not found', 404, 'NOT_FOUND');
      }
      throw new ApiError(error.message, 400, error.code);
    }
    
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        data: [],
        error: {
          message: error.message,
          code: error.code
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      data: [],
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      }
    });
  }
});

/**
 * Create a new appointment
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const appointmentData = req.body;
    
    // Validate the appointment data
    const validatedData = appointmentSchema.parse(appointmentData);
    
    // Check for availability
    const { data: existingAppointments, error: availabilityError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('provider_id', validatedData.provider_id)
      .or(`start_time.lte.${validatedData.end_time},end_time.gte.${validatedData.start_time}`)
      .neq('status', 'cancelled');
    
    if (availabilityError) throw new ApiError(availabilityError.message, 400, availabilityError.code);
    
    if (existingAppointments && existingAppointments.length > 0) {
      throw new ApiError('Provider is not available during the requested time slot', 400, 'AVAILABILITY_CONFLICT');
    }
    
    // Create the appointment
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw new ApiError(error.message, 400, error.code);
    
    return res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        data: [],
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        data: [],
        error: {
          message: error.message,
          code: error.code
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      data: [],
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      }
    });
  }
});

/**
 * Update an appointment
 */
router.put('/:appointmentId', requireAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;
    
    // Validate the appointment data
    const validatedData = appointmentSchema.partial().parse(updateData);
    
    // Check if the appointment exists
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new ApiError('Appointment not found', 404, 'NOT_FOUND');
      }
      throw new ApiError(fetchError.message, 400, fetchError.code);
    }
    
    // If changing time, check for availability
    if (validatedData.start_time || validatedData.end_time) {
      const startTime = validatedData.start_time || existingAppointment.start_time;
      const endTime = validatedData.end_time || existingAppointment.end_time;
      const providerId = validatedData.provider_id || existingAppointment.provider_id;
      
      const { data: conflictingAppointments, error: availabilityError } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('provider_id', providerId)
        .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)
        .neq('id', appointmentId)
        .neq('status', 'cancelled');
      
      if (availabilityError) throw new ApiError(availabilityError.message, 400, availabilityError.code);
      
      if (conflictingAppointments && conflictingAppointments.length > 0) {
        throw new ApiError('Provider is not available during the requested time slot', 400, 'AVAILABILITY_CONFLICT');
      }
    }
    
    // Update the appointment
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();
    
    if (error) throw new ApiError(error.message, 400, error.code);
    
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        data: [],
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        data: [],
        error: {
          message: error.message,
          code: error.code
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      data: [],
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      }
    });
  }
});

/**
 * Cancel an appointment
 */
router.put('/:appointmentId/cancel', requireAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    
    // Check if the appointment exists
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new ApiError('Appointment not found', 404, 'NOT_FOUND');
      }
      throw new ApiError(fetchError.message, 400, fetchError.code);
    }
    
    // Cannot cancel completed appointments
    if (existingAppointment.status === 'completed') {
      throw new ApiError('Cannot cancel a completed appointment', 400, 'INVALID_STATUS_CHANGE');
    }
    
    // Update the appointment
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();
    
    if (error) throw new ApiError(error.message, 400, error.code);
    
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        data: [],
        error: {
          message: error.message,
          code: error.code
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      data: [],
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      }
    });
  }
});

export default router; 