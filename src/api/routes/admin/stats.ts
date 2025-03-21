import { Router, Response, NextFunction } from 'express';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { throwApiError } from '../../middleware/error-handler';

const router = Router();

/**
 * @route GET /api/admin/stats
 * @desc Get system statistics for admin dashboard
 * @access Admin
 */
router.get('/', 
  requireAuth,
  requireRole(['admin']),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // User Statistics
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) {
        return throwApiError(usersError.message, 400, usersError.code);
      }
      
      // Get active users count
      const { count: activeUsers, error: activeError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (activeError) {
        return throwApiError(activeError.message, 400, activeError.code);
      }
      
      // University Statistics
      // Get total courses
      const { count: totalCourses, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      if (coursesError) {
        return throwApiError(coursesError.message, 400, coursesError.code);
      }
      
      // Get total lessons
      const { count: totalLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });
      
      if (lessonsError) {
        return throwApiError(lessonsError.message, 400, lessonsError.code);
      }
      
      // Get total modules
      const { count: totalModules, error: modulesError } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true });
      
      if (modulesError) {
        return throwApiError(modulesError.message, 400, modulesError.code);
      }
      
      // Schedule Statistics
      // Get current month dates
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
      
      // Get appointments this month
      const { count: monthlyAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('date', firstDayOfMonth)
        .lte('date', lastDayOfMonth);
      
      if (appointmentsError) {
        return throwApiError(appointmentsError.message, 400, appointmentsError.code);
      }
      
      // Chat Statistics
      // Get total chat rooms
      const { count: totalChatRooms, error: chatRoomsError } = await supabase
        .from('chat_rooms')
        .select('*', { count: 'exact', head: true });
      
      if (chatRoomsError) {
        return throwApiError(chatRoomsError.message, 400, chatRoomsError.code);
      }
      
      // Get messages from this month
      const { count: monthlyMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth);
      
      if (messagesError) {
        return throwApiError(messagesError.message, 400, messagesError.code);
      }
      
      // Gratuity Statistics
      // Get tips from this month
      const { count: monthlyTips, error: tipsError } = await supabase
        .from('tips')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth);
      
      if (tipsError) {
        return throwApiError(tipsError.message, 400, tipsError.code);
      }
      
      // Get total tip amount for this month
      const { data: tipData, error: tipAmountError } = await supabase
        .from('tips')
        .select('amount')
        .gte('created_at', firstDayOfMonth);
      
      if (tipAmountError) {
        return throwApiError(tipAmountError.message, 400, tipAmountError.code);
      }
      
      const monthlyTipTotal = tipData?.reduce((sum, tip) => sum + (Number(tip.amount) || 0), 0) || 0;
      
      // Compile all statistics
      const stats = {
        users: {
          total: totalUsers || 0,
          active: activeUsers || 0,
          inactive: (totalUsers || 0) - (activeUsers || 0)
        },
        university: {
          courses: totalCourses || 0,
          modules: totalModules || 0,
          lessons: totalLessons || 0
        },
        schedule: {
          monthly_appointments: monthlyAppointments || 0
        },
        chat: {
          rooms: totalChatRooms || 0,
          monthly_messages: monthlyMessages || 0
        },
        gratuity: {
          monthly_tips: monthlyTips || 0,
          monthly_tip_total: monthlyTipTotal
        }
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/stats/activity
 * @desc Get recent user activity data for admin dashboard charts
 * @access Admin
 */
router.get('/activity',
  requireAuth,
  requireRole(['admin']),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get today's date and dates for previous periods
      const today = new Date();
      const pastDays = 30; // Get data for last 30 days
      
      // Start date for our data range
      const startDate = new Date();
      startDate.setDate(today.getDate() - pastDays);
      const startDateStr = startDate.toISOString();
      
      // User signups by day
      const { data: userSignups, error: userError } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: true });
      
      if (userError) {
        return throwApiError(userError.message, 400, userError.code);
      }
      
      // Appointments by day
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select('date')
        .gte('date', startDateStr)
        .order('date', { ascending: true });
      
      if (appointmentError) {
        return throwApiError(appointmentError.message, 400, appointmentError.code);
      }
      
      // Chat messages by day
      const { data: messages, error: messageError } = await supabase
        .from('chat_messages')
        .select('created_at')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: true });
      
      if (messageError) {
        return throwApiError(messageError.message, 400, messageError.code);
      }
      
      // Course progress entries by day
      const { data: progressEntries, error: progressError } = await supabase
        .from('course_progress')
        .select('updated_at')
        .gte('updated_at', startDateStr)
        .order('updated_at', { ascending: true });
      
      if (progressError) {
        return throwApiError(progressError.message, 400, progressError.code);
      }
      
      // Process data to get counts per day
      const dailyData: Record<string, { users: number, appointments: number, messages: number, progress: number }> = {};
      
      // Initialize all days in our range with zeros
      for (let i = 0; i <= pastDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (pastDays - i));
        const dateKey = date.toISOString().split('T')[0];
        
        dailyData[dateKey] = {
          users: 0,
          appointments: 0, 
          messages: 0,
          progress: 0
        };
      }
      
      // Fill in user signups
      userSignups?.forEach(user => {
        const dateKey = new Date(user.created_at).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].users += 1;
        }
      });
      
      // Fill in appointments
      appointments?.forEach(appointment => {
        const dateKey = new Date(appointment.date).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].appointments += 1;
        }
      });
      
      // Fill in chat messages
      messages?.forEach(message => {
        const dateKey = new Date(message.created_at).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].messages += 1;
        }
      });
      
      // Fill in course progress
      progressEntries?.forEach(entry => {
        const dateKey = new Date(entry.updated_at).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].progress += 1;
        }
      });
      
      // Convert to array format for easier charting on the frontend
      const activityData = Object.entries(dailyData).map(([date, counts]) => ({
        date,
        ...counts
      }));
      
      res.json({
        success: true,
        data: activityData
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 