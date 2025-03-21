import { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users, Building2, Sparkles } from 'lucide-react';
import scheduleService from '../../services/scheduleService';
import { useAuth } from '../../providers/auth-provider';

// Define types for our data
interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  position: string;
  location: string;
  notes?: string;
}

interface DayShift {
  date: Date;
  day: string;
  shifts: Shift[];
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Schedule() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [weekShifts, setWeekShifts] = useState<DayShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Function to fetch appointments
  const fetchAppointments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate date range for the current week
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + (7 * currentWeek)); // Adjust for current week offset
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      // Format dates for API
      const startDateStr = startOfWeek.toISOString().split('T')[0];
      const endDateStr = endOfWeek.toISOString().split('T')[0];
      
      // Fetch appointments for the date range
      const { appointments, error: appointmentsError } = await scheduleService.getAppointments({
        startDate: startDateStr,
        endDate: endDateStr
      });
      
      if (appointmentsError) {
        setError(appointmentsError);
        // Generate mock data as fallback
        setWeekShifts(generateMockWeekShifts(startOfWeek));
        return;
      }
      
      if (!appointments || appointments.length === 0) {
        // If no appointments, create empty week structure
        const emptyWeek = createEmptyWeek(startOfWeek);
        setWeekShifts(emptyWeek);
      } else {
        // Process appointments into our week structure
        const processedWeek = processAppointmentsIntoWeek(appointments, startOfWeek);
        setWeekShifts(processedWeek);
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule. Please try again later.');
      // Generate mock data as fallback
      const mockWeek = generateMockWeekShifts(new Date());
      setWeekShifts(mockWeek);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process API appointments into our week structure
  const processAppointmentsIntoWeek = (appointments: any[], startOfWeek: Date) => {
    // Create an empty week structure
    const week: DayShift[] = [];
    
    // Fill in with appointment data
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.date);
      const dayIndex = appointmentDate.getDay(); // 0-6
      
      // Create a shift object from the appointment
      const shift: Shift = {
        id: appointment.id,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        position: appointment.service?.name || 'Shift',
        location: appointment.location || 'Main Location',
        notes: appointment.notes
      };
      
      // Add the shift to the correct day
      week[dayIndex].shifts.push(shift);
    });
    
    return week;
  };
  
  // Create an empty week structure
  const createEmptyWeek = (startOfWeek: Date) => {
    const week: DayShift[] = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      week.push({
        date: day,
        day: weekDays[day.getDay()],
        shifts: []
      });
    }
    
    return week;
  };
  
  // Generate mock week shifts (used as fallback)
  const generateMockWeekShifts = (startDate: Date) => {
    const shifts: DayShift[] = [];
    const startOfWeek = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      // Random shift assignment (some days off)
      const hasShift = Math.random() > 0.3;
      
      shifts.push({
        date: day,
        day: weekDays[day.getDay()],
        shifts: hasShift ? [
          {
            id: `mock-shift-${i}-1`,
            startTime: '18:00',
            endTime: '02:00',
            position: 'Bartender',
            location: 'Main Bar',
            notes: i === 2 ? 'VIP event tonight' : ''
          }
        ] : []
      });
    }
    
    return shifts;
  };
  
  // Fetch appointments when the week changes or on initial load
  useEffect(() => {
    fetchAppointments();
  }, [currentWeek, user]);
  
  const navigateWeek = (direction: number) => {
    setCurrentWeek(currentWeek + direction);
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIRecommendations(!showAIRecommendations)}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20"
          >
            <Sparkles className="h-4 w-4" />
            {showAIRecommendations ? 'Hide AI Suggestions' : 'Show AI Suggestions'}
          </button>
        </div>
      </div>
      
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium ${
              viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium ${
              viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Month
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {currentWeek === 0 ? 'Current Week' : `Week of ${weekShifts.length > 0 ? formatDate(weekShifts[0].date) : 'Loading...'}`}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Loading and Error States */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="rounded-md bg-destructive/10 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
              <button 
                onClick={fetchAppointments}
                className="mt-2 text-sm font-medium text-destructive hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Week View */}
      {viewMode === 'week' && !isLoading && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {weekShifts.map((day, index) => (
              <div 
                key={index} 
                className={`p-2 text-center border-r last:border-r-0 ${
                  day.date.getDate() === new Date().getDate() && 
                  day.date.getMonth() === new Date().getMonth() &&
                  day.date.getFullYear() === new Date().getFullYear() && 
                  currentWeek === 0 
                    ? 'bg-primary/10' 
                    : ''
                }`}
              >
                <div className="font-medium">{day.day}</div>
                <div className="text-sm text-muted-foreground">{formatDate(day.date)}</div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 min-h-[300px]">
            {weekShifts.map((day, index) => (
              <div 
                key={index} 
                className={`p-3 border-r last:border-r-0 ${
                  day.date.getDate() === new Date().getDate() && 
                  day.date.getMonth() === new Date().getMonth() &&
                  day.date.getFullYear() === new Date().getFullYear() && 
                  currentWeek === 0 
                    ? 'bg-primary/5' 
                    : ''
                }`}
              >
                {day.shifts.length > 0 ? (
                  day.shifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className="rounded-md bg-primary/10 p-2 mb-2 cursor-pointer hover:bg-primary/20 transition-colors"
                    >
                      <div className="flex items-center gap-1 text-sm font-medium text-primary">
                        <Clock className="h-4 w-4" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm mt-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{shift.position}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm mt-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{shift.location}</span>
                      </div>
                      {shift.notes && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {shift.notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Off
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Month view would go here */}
      {viewMode === 'month' && !isLoading && (
        <div className="p-4 border rounded-md bg-muted/20">
          <div className="text-center text-sm text-muted-foreground">
            Month view is coming soon. Please use week view for now.
          </div>
        </div>
      )}
      
      {/* AI Recommendations Section */}
      {showAIRecommendations && (
        <div className="mt-8 rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-medium">AI Schedule Recommendations</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Based on your availability, skills, and team needs, here are some personalized recommendations.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-background p-4">
              <h3 className="font-medium">Optimal Schedule Suggestion</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Consider requesting Tuesday evening shifts - they align well with your availability and have higher tip potential.
              </p>
            </div>
            
            <div className="rounded-md border bg-background p-4">
              <h3 className="font-medium">Team Coverage Analysis</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The bar is currently understaffed on Monday evenings. Picking up a Monday shift could help the team.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 