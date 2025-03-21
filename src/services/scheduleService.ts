import { z } from 'zod';
import { api } from './apiService';

// Schema for appointment creation/update
export const appointmentSchema = z.object({
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
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional()
});

// Type for appointment queries
export type AppointmentQuery = {
  startDate?: string;
  endDate?: string;
  providerId?: string;
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
};

/**
 * Service for interacting with scheduling endpoints through API
 */
export const scheduleService = {
  /**
   * Get appointments with optional filtering
   * @param filters - Optional filters like user_id, provider_id, status, etc.
   */
  async getAppointments(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Add any filters to the query string
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/schedule/appointments?${queryString}` : '/schedule/appointments';
    
    return api.get(endpoint);
  },

  /**
   * Get a specific appointment by ID
   * @param appointmentId - The ID of the appointment to fetch
   */
  async getAppointmentById(appointmentId: string) {
    return api.get(`/schedule/appointments/${appointmentId}`);
  },

  /**
   * Create a new appointment
   * @param appointmentData - The appointment data
   */
  async createAppointment(appointmentData: {
    service_id: string;
    provider_id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    notes?: string;
  }) {
    return api.post('/schedule/appointments', appointmentData);
  },

  /**
   * Update an existing appointment
   * @param appointmentId - The ID of the appointment to update
   * @param updateData - The data to update
   */
  async updateAppointment(appointmentId: string, updateData: {
    service_id?: string;
    provider_id?: string;
    user_id?: string;
    start_time?: string;
    end_time?: string;
    status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
  }) {
    return api.put(`/schedule/appointments/${appointmentId}`, updateData);
  },

  /**
   * Cancel an appointment
   * @param appointmentId - The ID of the appointment to cancel
   * @param reason - Optional reason for cancellation
   */
  async cancelAppointment(appointmentId: string, reason?: string) {
    return api.put(`/schedule/appointments/${appointmentId}/cancel`, { reason });
  },

  /**
   * Get available services
   * @param filters - Optional filters (category, active, etc.)
   */
  async getServices(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/schedule/services?${queryString}` : '/schedule/services';
    
    return api.get(endpoint);
  },

  /**
   * Get a specific service by ID
   * @param serviceId - The ID of the service to fetch
   */
  async getServiceById(serviceId: string) {
    return api.get(`/schedule/services/${serviceId}`);
  },

  /**
   * Get provider availability slots
   * @param providerId - The ID of the provider
   * @param date - The date to check availability for
   */
  async getProviderAvailability(providerId: string, date: string) {
    return api.get(`/schedule/availability/provider/${providerId}?date=${date}`);
  },

  /**
   * Get a user's upcoming appointments
   * @param userId - The ID of the user
   */
  async getUserUpcomingAppointments(userId: string) {
    const now = new Date().toISOString();
    return api.get(`/schedule/appointments?user_id=${userId}&start_date=${now}&status=scheduled,confirmed`);
  },

  /**
   * Get a user's past appointments
   * @param userId - The ID of the user
   * @param limit - Optional limit on number of results
   */
  async getUserPastAppointments(userId: string, limit = 10) {
    const now = new Date().toISOString();
    return api.get(`/schedule/appointments?user_id=${userId}&end_date=${now}&status=completed,cancelled,no_show&limit=${limit}`);
  },

  /**
   * Get a provider's schedule for a specific date range
   * @param providerId - The ID of the provider
   * @param startDate - Start date for the schedule
   * @param endDate - End date for the schedule
   */
  async getProviderSchedule(providerId: string, startDate: string, endDate: string) {
    return api.get(`/schedule/appointments?provider_id=${providerId}&start_date=${startDate}&end_date=${endDate}`);
  }
};

export default scheduleService; 