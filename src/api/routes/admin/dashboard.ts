import { Router, Response, NextFunction } from 'express';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { throwApiError } from '../../middleware/error-handler';
import { validateQuery } from '../../middleware/validation';
import { z } from 'zod';

const router = Router();

/**
 * @route GET /api/admin/dashboard
 * @desc Get admin dashboard summary data
 * @access Admin
 */
router.get('/',
  requireAuth,
  requireRole(['admin']),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Calculate date ranges
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const firstDayOfLastMonth = lastMonth.toISOString();
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString();
      
      // Get counts for this month
      const { data: thisMonthData, error: thisMonthError } = await supabase.rpc('get_dashboard_metrics', { 
        start_date: firstDayOfMonth,
        end_date: today.toISOString()
      });
      
      if (thisMonthError) {
        return throwApiError(thisMonthError.message, 400, thisMonthError.code);
      }
      
      // Get counts for last month (for comparison)
      const { data: lastMonthData, error: lastMonthError } = await supabase.rpc('get_dashboard_metrics', { 
        start_date: firstDayOfLastMonth,
        end_date: lastDayOfLastMonth
      });
      
      if (lastMonthError) {
        return throwApiError(lastMonthError.message, 400, lastMonthError.code);
      }
      
      // Compile the data with percentage changes
      const dashboardData = {
        new_users: {
          current: thisMonthData?.new_users || 0,
          previous: lastMonthData?.new_users || 0,
          change: calculatePercentChange(thisMonthData?.new_users || 0, lastMonthData?.new_users || 0)
        },
        active_users: {
          current: thisMonthData?.active_users || 0,
          previous: lastMonthData?.active_users || 0,
          change: calculatePercentChange(thisMonthData?.active_users || 0, lastMonthData?.active_users || 0)
        },
        appointments: {
          current: thisMonthData?.appointments || 0,
          previous: lastMonthData?.appointments || 0,
          change: calculatePercentChange(thisMonthData?.appointments || 0, lastMonthData?.appointments || 0)
        },
        messages: {
          current: thisMonthData?.messages || 0,
          previous: lastMonthData?.messages || 0,
          change: calculatePercentChange(thisMonthData?.messages || 0, lastMonthData?.messages || 0)
        },
        tips: {
          current: thisMonthData?.tips || 0,
          previous: lastMonthData?.tips || 0,
          change: calculatePercentChange(thisMonthData?.tips || 0, lastMonthData?.tips || 0)
        },
        tip_amount: {
          current: thisMonthData?.tip_amount || 0,
          previous: lastMonthData?.tip_amount || 0,
          change: calculatePercentChange(thisMonthData?.tip_amount || 0, lastMonthData?.tip_amount || 0)
        },
        course_completions: {
          current: thisMonthData?.course_completions || 0,
          previous: lastMonthData?.course_completions || 0,
          change: calculatePercentChange(thisMonthData?.course_completions || 0, lastMonthData?.course_completions || 0)
        }
      };
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/dashboard/recent-activity
 * @desc Get recent activity for the admin dashboard
 * @access Admin
 */
router.get('/recent-activity',
  requireAuth,
  requireRole(['admin']),
  validateQuery(z.object({
    limit: z.string().optional()
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { limit = '10' } = req.query;
      const limitNumber = parseInt(limit as string, 10);
      
      // Get recent user registrations
      const { data: newUsers, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(limitNumber);
      
      if (usersError) {
        return throwApiError(usersError.message, 400, usersError.code);
      }
      
      // Get recent appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id, 
          date, 
          start_time, 
          end_time, 
          status,
          client:client_id(id, first_name, last_name),
          provider:provider_id(id, first_name, last_name),
          service:service_id(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limitNumber);
      
      if (appointmentsError) {
        return throwApiError(appointmentsError.message, 400, appointmentsError.code);
      }
      
      // Get recent course progress updates
      const { data: courseProgress, error: progressError } = await supabase
        .from('course_progress')
        .select(`
          id, 
          updated_at,
          user:user_id(id, first_name, last_name),
          course:course_id(id, title),
          progress_percentage
        `)
        .order('updated_at', { ascending: false })
        .limit(limitNumber);
      
      if (progressError) {
        return throwApiError(progressError.message, 400, progressError.code);
      }
      
      // Get recent tips
      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .select(`
          id,
          amount,
          created_at,
          sender:sender_id(id, first_name, last_name),
          recipient:recipient_id(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limitNumber);
      
      if (tipsError) {
        return throwApiError(tipsError.message, 400, tipsError.code);
      }
      
      // Format all activities into a unified timeline
      const activities = [
        ...newUsers.map(user => ({
          type: 'user_registration',
          id: user.id,
          timestamp: user.created_at,
          data: user
        })),
        ...appointments.map(appointment => ({
          type: 'appointment',
          id: appointment.id,
          timestamp: appointment.date, // Using the appointment date
          data: appointment
        })),
        ...courseProgress.map(progress => ({
          type: 'course_progress',
          id: progress.id,
          timestamp: progress.updated_at,
          data: progress
        })),
        ...tips.map(tip => ({
          type: 'tip',
          id: tip.id,
          timestamp: tip.created_at,
          data: tip
        }))
      ];
      
      // Sort all activities by timestamp, most recent first
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Return only the specified limit of activities
      const recentActivities = activities.slice(0, limitNumber);
      
      res.json({
        success: true,
        data: recentActivities
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Helper function to calculate percentage change
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  return Math.round(((current - previous) / previous) * 100);
}

export default router; 