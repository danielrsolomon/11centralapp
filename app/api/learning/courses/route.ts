import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { 
  canCreateContent, 
  canEditContent, 
  canDeleteContent, 
  logPermissionDenial,
  createPermissionError 
} from '@/lib/auth/permission-utils';

/**
 * GET /api/learning/courses
 * 
 * Lists all courses available to the authenticated user.
 * 
 * Query parameters:
 *   - programId: (optional) Filter by program
 *   - status: (optional) Filter by status ("active", "upcoming", "archived")
 *   - limit: (optional) Number of results to return
 *   - offset: (optional) Pagination offset
 *   - includeArchived: (optional) Include archived courses (true/false)
 *   - adminView: (optional) Include additional details for admins (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const programId = url.searchParams.get('programId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const adminView = url.searchParams.get('adminView') === 'true';
    
    // Create Supabase client that properly handles cookies for server-side authentication
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Get user roles and admin status
    let isAdmin = false;
    let isManager = false;
    
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, is_admin')
        .eq('id', userId)
        .single();
        
      if (userProfile) {
        isAdmin = !!userProfile.is_admin;
        isManager = userProfile.role === 'manager' || userProfile.role === 'training_manager';
      }
    } catch (error) {
      console.warn('Error fetching user roles:', error);
    }
    
    // Build query
    let query = supabase
      .from('courses')
      .select(`
        *,
        program:program_id(id, title),
        lessons(count)
      `, { count: 'exact' })
      .order('sequence_order', { ascending: true })
      .range(offset, offset + limit - 1);
      
    // Add program filter if provided
    if (programId) {
      query = query.eq('program_id', programId);
    }
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    } else if (!includeArchived) {
      // By default, exclude archived courses unless specifically requested
      query = query.neq('status', 'archived');
    }
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Get user progress for these courses in a separate query
    const { data: progressData } = await supabase
      .from('user_course_progress')
      .select('course_id, completion_percentage')
      .eq('user_id', userId)
      .in('course_id', data.map((c: any) => c.id));
      
    // Create a map of course ID to completion percentage
    const progressMap = (progressData || []).reduce((map: any, item: any) => {
      map[item.course_id] = item.completion_percentage;
      return map;
    }, {});
    
    // Transform the result
    const courses = data.map((course: any) => {
      const basicInfo = {
        id: course.id,
        title: course.title,
        description: course.description,
        program_id: course.program_id,
        program_title: course.program?.title,
        created_at: course.created_at,
        thumbnail_url: course.thumbnail_url,
        status: course.status,
        sequence_order: course.sequence_order,
        duration_minutes: course.duration_minutes,
        completion_percentage: progressMap[course.id] || 0,
        total_lessons: course.lessons?.count || 0
      };
      
      // Include additional admin fields if requested and user has appropriate permissions
      if (adminView && (isAdmin || isManager)) {
        return {
          ...basicInfo,
          updated_at: course.updated_at,
          created_by: course.created_by,
          updated_by: course.updated_by,
          archived_at: course.archived_at,
          archived_by: course.archived_by
        };
      }
      
      return basicInfo;
    });
    
    return NextResponse.json({
      courses,
      pagination: {
        total: count || 0,
        offset,
        limit
      }
    });
  } catch (error) {
    console.error('Error in courses API:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/courses
 * 
 * Creates a new course.
 * Requires admin or manager privileges.
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Simplified permission check - just check if admin, instructor, or manager
    // rather than complex permission logic that might fail
    const isAuthorized = await checkUserCanCreateContent(supabase, user.id);
    
    if (!isAuthorized) {
      return NextResponse.json(
        { 
          error: 'Permission denied - requires content management permissions',
          requiresAuth: false, // Flag to indicate it's not an auth error
          details: 'You need admin, superadmin, manager, or content creation permissions to create courses'
        }, 
        { status: 403 }
      );
    }
    
    // Parse request body
    const courseData = await request.json();
    
    // Validate required fields
    if (!courseData.title || !courseData.program_id) {
      return NextResponse.json(
        { error: 'Title and program_id are required' },
        { status: 400 }
      );
    }
    
    // Get the maximum sequence_order for this program
    const { data: maxOrderData } = await supabase
      .from('courses')
      .select('sequence_order')
      .eq('program_id', courseData.program_id)
      .order('sequence_order', { ascending: false })
      .limit(1);
      
    const nextOrderIndex = maxOrderData && maxOrderData.length > 0 
      ? (maxOrderData[0].sequence_order + 1) 
      : 1;
    
    // Prepare course data for insertion with minimal required fields
    const newCourse: {
      title: string;
      description: string;
      program_id: string;
      status: string;
      sequence_order: number;
      created_by: string;
      created_at: string;
      thumbnail_url?: string;
    } = {
      title: courseData.title,
      description: courseData.description || '',
      program_id: courseData.program_id,
      status: courseData.status || 'active',
      sequence_order: nextOrderIndex,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    // Only include thumbnail_url if provided and not null/undefined
    if (courseData.thumbnail_url) {
      newCourse.thumbnail_url = courseData.thumbnail_url;
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('courses')
      .insert(newCourse)
      .select();
    
    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Course created successfully',
      course: data[0]
    });
  } catch (error) {
    console.error('Error in course creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/courses
 * 
 * Updates an existing course.
 * Requires admin or manager privileges.
 */
export async function PUT(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Get user information without preferences
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_admin')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Error fetching user information' },
        { status: 500 }
      );
    }

    // Get user preferences from the user_preferences table
    const { data: userPreferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    // No need to handle preferences error - it's fine if no preferences exist
    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.warn('Error fetching user preferences:', preferencesError);
    }

    // Combine user data with preferences properly
    const unifiedUserData = {
      ...userData,
      user_preferences: userPreferences || {},
    };

    // Use centralized permission function
    if (!canEditContent(unifiedUserData)) {
      // Log permission denial
      logPermissionDenial(unifiedUserData, 'update course');
      
      // Return 403 with descriptive message but don't trigger session termination
      return NextResponse.json(
        { 
          error: 'Permission denied - requires content management permissions',
          requiresAuth: false, // Flag to indicate it's not an auth error
          details: 'You need admin, superadmin, manager, or content editing permissions to update courses'
        }, 
        { status: 403 }
      );
    }
    
    // Parse request body
    const courseData = await request.json();
    
    // Validate required fields
    if (!courseData.id || !courseData.title) {
      return NextResponse.json(
        { error: 'Course ID and title are required' },
        { status: 400 }
      );
    }
    
    // Prepare course data for update
    const updatedCourse = {
      title: courseData.title,
      description: courseData.description || '',
      status: courseData.status || 'active',
      ...(courseData.thumbnail_url !== undefined && { thumbnail_url: courseData.thumbnail_url }),
      program_id: courseData.program_id,
      sequence_order: courseData.sequence_order || 0,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Update in database
    const { data, error } = await supabase
      .from('courses')
      .update(updatedCourse)
      .eq('id', courseData.id)
      .select();
    
    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Course updated successfully',
      course: data[0]
    });
  } catch (error) {
    console.error('Error in course update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning/courses
 * 
 * Deletes or archives a course.
 * Requires admin or manager privileges.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const courseId = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Get user information without preferences
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_admin')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Error fetching user information' },
        { status: 500 }
      );
    }

    // Get user preferences from the user_preferences table
    const { data: userPreferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    // No need to handle preferences error - it's fine if no preferences exist
    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.warn('Error fetching user preferences:', preferencesError);
    }

    // Combine user data with preferences properly
    const unifiedUserData = {
      ...userData,
      user_preferences: userPreferences || {},
    };

    // Use centralized permission function
    if (!canDeleteContent(unifiedUserData)) {
      // Log permission denial
      logPermissionDenial(unifiedUserData, 'delete course');
      
      // Return 403 with descriptive message but don't trigger session termination
      return NextResponse.json(
        { 
          error: 'Permission denied - requires content management permissions',
          requiresAuth: false, // Flag to indicate it's not an auth error
          details: 'You need admin, superadmin, or content deletion permissions to delete courses'
        }, 
        { status: 403 }
      );
    }
    
    if (permanent) {
      // Permanently delete the course
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) {
        console.error('Error deleting course:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: 'Course permanently deleted'
      });
    } else {
      // Archive the course (soft delete)
      const { data, error } = await supabase
        .from('courses')
        .update({ 
          status: 'archived',
          archived_by: user.id,
          archived_at: new Date().toISOString()
        })
        .eq('id', courseId)
        .select();
      
      if (error) {
        console.error('Error archiving course:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Course archived successfully',
        course: data[0]
      });
    }
  } catch (error) {
    console.error('Error in course deletion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if a user can create content
 * This is a simplified approach to avoid the complexity of the previous implementation
 */
async function checkUserCanCreateContent(supabase: any, userId: string): Promise<boolean> {
  try {
    // First attempt: check if the user has is_admin flag
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', userId)
      .single();
      
    if (!userError && userData) {
      // If user has is_admin flag set to true or has a content creation role
      if (userData.is_admin === true) {
        return true;
      }
      
      if (userData.role && ['admin', 'superadmin', 'manager', 'training_manager', 'content_manager', 'instructor'].includes(userData.role.toLowerCase())) {
        return true;
      }
    }
    
    // Second attempt: check if user has any admin roles in user_roles
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
      
    if (roleData && roleData.length > 0) {
      // Check if any role is admin, superadmin, manager or instructor
      return roleData.some((r: any) => 
        r.role && ['admin', 'superadmin', 'manager', 'instructor'].includes(r.role.toLowerCase())
      );
    }
    
    // Default to false if no admin privileges were found
    return false;
  } catch (error) {
    console.warn('Error checking user content creation permissions:', error);
    return false; // Default to no permissions on error
  }
} 