import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import logger from '@/lib/logger';
import { 
  hasAdminRole, 
  hasManagerRole, 
  canCreateContent,
  canEditContent,
  canDeleteContent
} from '@/lib/auth/permission-utils';

/**
 * GET /api/auth/me
 * 
 * Returns information about the currently authenticated user,
 * including their roles and permissions.
 */
export async function GET() {
  try {
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Get user profile without preferences (which is in a separate table)
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, is_admin, avatar_url, created_at')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      logger.error('Error fetching user profile', profileError);
      // Continue without throwing 500 - we'll just use the basic user data
      // and default permission values instead of failing the whole request
      return NextResponse.json({
        id: user.id,
        email: user.email,
        role: 'user', // Default role if we can't fetch the profile
        is_admin: false,
        permissions: {
          is_admin: false,
          is_superadmin: false,
          is_manager: false,
          can_create: false,
          can_update: false,
          can_delete: false,
          can_view: true
        }
      });
    }
    
    // Try to get user preferences from user_preferences table
    const { data: userPreferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (preferencesError && preferencesError.code !== 'PGRST116') { 
      // PGRST116 is "no rows returned" which is fine - just means no preferences set yet
      logger.warn('Error fetching user preferences', preferencesError);
      // Continue without failing the request
    }
    
    // Create a unified user object with preferences
    const unifiedUserData = {
      ...userData,
      preferences: userPreferences ? {
        content_creation: false, // Default values
        permissions: {
          createContent: false,
          editContent: false,
          deleteContent: false
        },
        // Add notification preferences if available
        ...(userPreferences ? {
          notifications: {
            email_weekly_newsletter: userPreferences.email_weekly_newsletter,
            email_account_notifications: userPreferences.email_account_notifications,
            email_marketing_notifications: userPreferences.email_marketing_notifications,
            text_account_notifications: userPreferences.text_account_notifications,
            text_booking_confirmations: userPreferences.text_booking_confirmations,
            text_marketing_notifications: userPreferences.text_marketing_notifications,
            app_new_messages: userPreferences.app_new_messages,
            app_event_reminders: userPreferences.app_event_reminders,
            app_reservation_updates: userPreferences.app_reservation_updates,
            app_promotional_alerts: userPreferences.app_promotional_alerts
          }
        } : {})
      } : undefined
    };
    
    // Determine permissions based on roles using our centralized utilities
    // This ensures consistent role checking across the application
    const userRole = String(userData?.role || '').toLowerCase();
    const isSuperAdmin = userRole === 'superadmin';
    const isAdmin = hasAdminRole(unifiedUserData);
    const isManager = hasManagerRole(unifiedUserData);
    
    // Use our permission utilities for consistent permission checking
    const canCreate = canCreateContent(unifiedUserData); // Superadmin will always pass this check
    const canUpdate = canEditContent(unifiedUserData);   // Superadmin will always pass this check
    const canDelete = canDeleteContent(unifiedUserData); // Superadmin will always pass this check
    
    // Return user data with permissions
    return NextResponse.json({
      ...unifiedUserData,
      permissions: {
        is_admin: isAdmin,
        is_superadmin: isSuperAdmin,
        is_manager: isManager,
        can_create: canCreate,
        can_update: canUpdate,
        can_delete: canDelete,
        can_view: true
      }
    });
  } catch (error) {
    logger.error('Error in auth/me endpoint', error as Error);
    // Return a default response with basic info rather than failing
    // This prevents forced logouts due to error handling in SessionErrorDetector
    return NextResponse.json(
      { 
        error: 'Error processing user profile',
        // Include some basic info if we have a user
        user_exists: true,
        permissions: {
          can_view: true
        }
      },
      { status: 200 } // Return 200 instead of 500 to avoid triggering auth errors
    );
  }
} 