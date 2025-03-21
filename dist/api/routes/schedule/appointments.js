"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const router = (0, express_1.Router)();
// Validation schemas
const appointmentIdSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid('Invalid appointment ID format')
});
const createAppointmentSchema = zod_1.z.object({
    provider_id: zod_1.z.string().uuid('Invalid provider ID'),
    service_id: zod_1.z.string().uuid('Invalid service ID'),
    date: zod_1.z.string().refine((val) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(val);
    }, {
        message: 'Date must be in format YYYY-MM-DD'
    }),
    start_time: zod_1.z.string().refine((val) => {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
    }, {
        message: 'Start time must be in format HH:MM (24-hour)'
    }),
    end_time: zod_1.z.string().refine((val) => {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
    }, {
        message: 'End time must be in format HH:MM (24-hour)'
    }),
    notes: zod_1.z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
    location: zod_1.z.string().max(100, 'Location cannot exceed 100 characters').optional(),
    status: zod_1.z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).default('scheduled')
});
const updateAppointmentSchema = createAppointmentSchema.partial().extend({
    status: zod_1.z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional()
});
const appointmentQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in format YYYY-MM-DD').optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in format YYYY-MM-DD').optional(),
    providerId: zod_1.z.string().uuid('Invalid provider ID').optional(),
    status: zod_1.z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional()
});
/**
 * @route GET /api/schedule/appointments
 * @desc List appointments with optional filtering
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/', auth_1.requireAuth, (0, validation_1.validateQuery)(appointmentQuerySchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { startDate, endDate, providerId, status } = req.query;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Start building the query
        let query = supabase_1.supabase
            .from('schedule_appointments')
            .select(`
          *,
          provider:provider_id(id, first_name, last_name, avatar_url),
          service:service_id(id, name, description, duration_minutes, price)
        `);
        // Add filters based on query parameters
        if (startDate) {
            query = query.gte('date', startDate);
        }
        if (endDate) {
            query = query.lte('date', endDate);
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
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        res.json({
            success: true,
            data: appointments || []
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/schedule/appointments/:appointmentId
 * @desc Get appointment details
 * @access Authenticated, Appointment Participant
 */
// @ts-ignore: Express router type compatibility
router.get('/:appointmentId', auth_1.requireAuth, (0, validation_1.validateParams)(appointmentIdSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { appointmentId } = req.params;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Get the appointment with related data
        const { data: appointment, error } = await supabase_1.supabase
            .from('schedule_appointments')
            .select(`
          *,
          provider:provider_id(id, first_name, last_name, avatar_url, email, phone),
          service:service_id(id, name, description, duration_minutes, price)
        `)
            .eq('id', appointmentId)
            .single();
        if (error) {
            next(new error_handler_1.ApiError(error.message, 400, error.code));
            return;
        }
        if (!appointment) {
            next(new error_handler_1.ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
            return;
        }
        // Check if user is involved in this appointment or is an admin
        const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
        const isInvolved = appointment.client_id === userId || appointment.provider_id === userId;
        if (!isAdmin && !isInvolved) {
            next(new error_handler_1.ApiError('You do not have permission to view this appointment', 403, 'FORBIDDEN'));
            return;
        }
        res.json({
            success: true,
            data: appointment
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/schedule/appointments
 * @desc Book a new appointment
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/', auth_1.requireAuth, (0, validation_1.validateBody)(createAppointmentSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const appointmentData = req.body;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Check if provider exists
        const { data: provider, error: providerError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', appointmentData.provider_id)
            .single();
        if (providerError || !provider) {
            next(new error_handler_1.ApiError('Provider not found', 404, 'PROVIDER_NOT_FOUND'));
            return;
        }
        // Check if service exists
        const { data: service, error: serviceError } = await supabase_1.supabase
            .from('schedule_services')
            .select('id, duration_minutes')
            .eq('id', appointmentData.service_id)
            .single();
        if (serviceError || !service) {
            next(new error_handler_1.ApiError('Service not found', 404, 'SERVICE_NOT_FOUND'));
            return;
        }
        // Check provider availability
        const { data: availability, error: availabilityError } = await supabase_1.supabase
            .from('schedule_availability')
            .select('*')
            .eq('provider_id', appointmentData.provider_id)
            .eq('date', appointmentData.date)
            .lte('start_time', appointmentData.start_time)
            .gte('end_time', appointmentData.end_time);
        if (availabilityError) {
            next(new error_handler_1.ApiError(availabilityError.message, 400, availabilityError.code));
            return;
        }
        if (!availability || availability.length === 0) {
            next(new error_handler_1.ApiError('Provider is not available at the selected time', 400, 'PROVIDER_UNAVAILABLE'));
            return;
        }
        // Check for conflicting appointments
        const { data: conflictingAppointments, error: conflictError } = await supabase_1.supabase
            .from('schedule_appointments')
            .select('*')
            .eq('provider_id', appointmentData.provider_id)
            .eq('date', appointmentData.date)
            .not('status', 'eq', 'cancelled')
            .or(`start_time.lte.${appointmentData.end_time},end_time.gte.${appointmentData.start_time}`);
        if (conflictError) {
            next(new error_handler_1.ApiError(conflictError.message, 400, conflictError.code));
            return;
        }
        if (conflictingAppointments && conflictingAppointments.length > 0) {
            next(new error_handler_1.ApiError('There is a conflicting appointment at the selected time', 400, 'APPOINTMENT_CONFLICT'));
            return;
        }
        // Create the appointment
        const { data: appointment, error: createError } = await supabase_1.supabase
            .from('schedule_appointments')
            .insert({
            ...appointmentData,
            client_id: userId,
            created_at: new Date().toISOString()
        })
            .select()
            .single();
        if (createError) {
            next(new error_handler_1.ApiError(createError.message, 400, createError.code));
            return;
        }
        res.status(201).json({
            success: true,
            data: appointment
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route PUT /api/schedule/appointments/:appointmentId
 * @desc Update an appointment
 * @access Authenticated, Appointment Participant
 */
// @ts-ignore: Express router type compatibility
router.put('/:appointmentId', auth_1.requireAuth, (0, validation_1.validateParams)(appointmentIdSchema), (0, validation_1.validateBody)(updateAppointmentSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { appointmentId } = req.params;
        const updateData = req.body;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Check if appointment exists and user is involved
        const { data: appointment, error: appointmentError } = await supabase_1.supabase
            .from('schedule_appointments')
            .select('*')
            .eq('id', appointmentId)
            .single();
        if (appointmentError) {
            next(new error_handler_1.ApiError(appointmentError.message, 400, appointmentError.code));
            return;
        }
        if (!appointment) {
            next(new error_handler_1.ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
            return;
        }
        // Check if user is involved in this appointment or is an admin
        const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
        const isInvolved = appointment.client_id === userId || appointment.provider_id === userId;
        if (!isAdmin && !isInvolved) {
            next(new error_handler_1.ApiError('You do not have permission to update this appointment', 403, 'FORBIDDEN'));
            return;
        }
        // If there are timing changes, check for availability and conflicts
        if (updateData.date || updateData.start_time || updateData.end_time) {
            const appointmentDate = updateData.date || appointment.date;
            const appointmentStartTime = updateData.start_time || appointment.start_time;
            const appointmentEndTime = updateData.end_time || appointment.end_time;
            const providerId = updateData.provider_id || appointment.provider_id;
            // Check provider availability
            const { data: availability, error: availabilityError } = await supabase_1.supabase
                .from('schedule_availability')
                .select('*')
                .eq('provider_id', providerId)
                .eq('date', appointmentDate)
                .lte('start_time', appointmentStartTime)
                .gte('end_time', appointmentEndTime);
            if (availabilityError) {
                next(new error_handler_1.ApiError(availabilityError.message, 400, availabilityError.code));
                return;
            }
            if (!availability || availability.length === 0) {
                next(new error_handler_1.ApiError('Provider is not available at the selected time', 400, 'PROVIDER_UNAVAILABLE'));
                return;
            }
            // Check for conflicting appointments
            const { data: conflictingAppointments, error: conflictError } = await supabase_1.supabase
                .from('schedule_appointments')
                .select('*')
                .eq('provider_id', providerId)
                .eq('date', appointmentDate)
                .not('id', 'eq', appointmentId) // Exclude current appointment
                .not('status', 'eq', 'cancelled')
                .or(`start_time.lte.${appointmentEndTime},end_time.gte.${appointmentStartTime}`);
            if (conflictError) {
                next(new error_handler_1.ApiError(conflictError.message, 400, conflictError.code));
                return;
            }
            if (conflictingAppointments && conflictingAppointments.length > 0) {
                next(new error_handler_1.ApiError('There is a conflicting appointment at the selected time', 400, 'APPOINTMENT_CONFLICT'));
                return;
            }
        }
        // Update the appointment
        const { data: updatedAppointment, error: updateError } = await supabase_1.supabase
            .from('schedule_appointments')
            .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
            .eq('id', appointmentId)
            .select()
            .single();
        if (updateError) {
            next(new error_handler_1.ApiError(updateError.message, 400, updateError.code));
            return;
        }
        res.json({
            success: true,
            data: updatedAppointment
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route DELETE /api/schedule/appointments/:appointmentId
 * @desc Cancel an appointment
 * @access Authenticated, Appointment Participant
 */
// @ts-ignore: Express router type compatibility
router.delete('/:appointmentId', auth_1.requireAuth, (0, validation_1.validateParams)(appointmentIdSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { appointmentId } = req.params;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Check if appointment exists and user is involved
        const { data: appointment, error: appointmentError } = await supabase_1.supabase
            .from('schedule_appointments')
            .select('*')
            .eq('id', appointmentId)
            .single();
        if (appointmentError) {
            next(new error_handler_1.ApiError(appointmentError.message, 400, appointmentError.code));
            return;
        }
        if (!appointment) {
            next(new error_handler_1.ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
            return;
        }
        // Check if user is involved in this appointment or is an admin
        const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('manager');
        const isInvolved = appointment.client_id === userId || appointment.provider_id === userId;
        if (!isAdmin && !isInvolved) {
            next(new error_handler_1.ApiError('You do not have permission to cancel this appointment', 403, 'FORBIDDEN'));
            return;
        }
        // Instead of deleting, mark as cancelled
        const { data: updatedAppointment, error: updateError } = await supabase_1.supabase
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
            next(new error_handler_1.ApiError(updateError.message, 400, updateError.code));
            return;
        }
        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: updatedAppointment
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=appointments.js.map