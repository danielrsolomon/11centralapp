/**
 * Schedule Module - API-First Integration Example
 * 
 * This file demonstrates the correct pattern for interacting with the Scheduling
 * module using the API-first approach.
 */

// CORRECT USAGE: Use the scheduleService which makes API calls
import { scheduleService } from '../../../src/services/scheduleService';
import { useState, useEffect } from 'react';

// ----- Example React component using the API-first approach -----
export const AppointmentBookingComponent: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Load services when component mounts
  useEffect(() => {
    loadServices();
  }, []);

  // Load available slots when service, provider, and date are selected
  useEffect(() => {
    if (selectedService && selectedProvider && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedService, selectedProvider, selectedDate]);

  const loadServices = async () => {
    setLoading(true);
    try {
      // Use the scheduleService to fetch services through the API
      const response = await scheduleService.getServices({ active: true });
      
      if (response.success) {
        setServices(response.data);
        setError(null);
      } else {
        console.error('Failed to load services:', response.error);
        setError(response.error.message || 'Failed to load services');
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async (serviceId: string) => {
    setLoading(true);
    try {
      // This would be a custom API endpoint to get providers for a service
      // Implement in scheduleService if needed
      const response = await fetch(`/api/schedule/services/${serviceId}/providers`);
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.data);
        setError(null);
      } else {
        console.error('Failed to load providers:', data.error);
        setError(data.error.message || 'Failed to load providers');
      }
    } catch (err) {
      console.error('Error loading providers:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      // Use the scheduleService to fetch provider availability through the API
      const response = await scheduleService.getProviderAvailability(selectedProvider, selectedDate);
      
      if (response.success) {
        setAvailableSlots(response.data);
        setError(null);
      } else {
        console.error('Failed to load availability:', response.error);
        setError(response.error.message || 'Failed to load availability');
      }
    } catch (err) {
      console.error('Error loading availability:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    loadProviders(serviceId);
    // Reset dependent selections
    setSelectedProvider('');
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    // Reset dependent selections
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    // Reset slot selection
    setSelectedSlot('');
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
  };

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedProvider || !selectedSlot) {
      setError('Please select a service, provider, and time slot');
      return;
    }

    setLoading(true);
    try {
      // Parse the selected slot to get start and end times
      const [startTime, endTime] = selectedSlot.split('|');
      
      // Get the current user ID (would come from auth context in a real app)
      const userId = 'current-user-id';
      
      // Use the scheduleService to book the appointment through the API
      const response = await scheduleService.createAppointment({
        service_id: selectedService,
        provider_id: selectedProvider,
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        notes: 'Booked via the appointment booking widget',
      });
      
      if (response.success) {
        setBookingSuccess(true);
        setError(null);
        
        // Reset selections
        setSelectedService('');
        setSelectedProvider('');
        setSelectedDate('');
        setAvailableSlots([]);
        setSelectedSlot('');
      } else {
        console.error('Failed to book appointment:', response.error);
        setError(response.error.message || 'Failed to book appointment');
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appointment-booking">
      <h1>Book an Appointment</h1>
      
      {bookingSuccess && (
        <div className="success-message">
          Your appointment has been booked successfully!
        </div>
      )}
      
      {error && <div className="error-message">Error: {error}</div>}
      
      <div className="booking-form">
        <div className="form-group">
          <label htmlFor="service">Select a Service:</label>
          <select
            id="service"
            value={selectedService}
            onChange={(e) => handleServiceSelect(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Select a Service --</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} (${service.price})
              </option>
            ))}
          </select>
        </div>
        
        {selectedService && (
          <div className="form-group">
            <label htmlFor="provider">Select a Provider:</label>
            <select
              id="provider"
              value={selectedProvider}
              onChange={(e) => handleProviderSelect(e.target.value)}
              disabled={loading || !selectedService}
            >
              <option value="">-- Select a Provider --</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.first_name} {provider.last_name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {selectedProvider && (
          <div className="form-group">
            <label htmlFor="date">Select a Date:</label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              disabled={loading || !selectedProvider}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
        
        {selectedDate && availableSlots.length > 0 && (
          <div className="form-group">
            <label>Select a Time Slot:</label>
            <div className="time-slots">
              {availableSlots.map((slot) => (
                <button
                  key={`${slot.start_time}|${slot.end_time}`}
                  className={`slot-button ${
                    selectedSlot === `${slot.start_time}|${slot.end_time}`
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    handleSlotSelect(`${slot.start_time}|${slot.end_time}`)
                  }
                  disabled={loading}
                >
                  {new Date(slot.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {selectedSlot && (
          <button
            className="book-button"
            onClick={handleBookAppointment}
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ANTI-PATTERN: This is the INCORRECT way to access Supabase directly
 * DO NOT USE this approach in the E11EVEN Central application
 */
/*
// ❌ INCORRECT: Direct Supabase client usage
import { supabase } from '../../../src/services/supabase';

// ❌ INCORRECT: This function makes direct Supabase calls from the client
export const incorrectCreateAppointment = async (appointmentData) => {
  // Direct database call without going through the API
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      ...appointmentData,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating appointment:', error);
    return { error: error.message, appointment: null };
  }
  
  return { appointment: data };
};
*/ 