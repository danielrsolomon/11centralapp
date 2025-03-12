import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * GET /api/learning/lessons
 * 
 * Lists all lessons available to the authenticated user.
 * 
 * Query parameters:
 *   - courseId: (optional) Filter by course
 *   - status: (optional) Filter by status ("active", "upcoming", "archived")
 *   - limit: (optional) Number of results to return
 *   - offset: (optional) Pagination offset
 *   - includeArchived: (optional) Include archived lessons (true/false)
 *   - adminView: (optional) Include additional details for admins (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
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
      .from('lessons')
      .select(`
        *,
        course:course_id(id, title, program_id),
        modules(count)
      `, { count: 'exact' })
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1);
      
    // Add course filter if provided
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    } else if (!includeArchived) {
      // By default, exclude archived lessons unless specifically requested
      query = query.neq('status', 'archived');
    }
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching lessons:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Get user progress for these lessons in a separate query
    const { data: progressData } = await supabase
      .from('user_lesson_progress')
      .select('lesson_id, completion_percentage, completed_at')
      .eq('user_id', userId)
      .in('lesson_id', data.map((l: any) => l.id));
      
    // Create a map of lesson ID to progress data
    const progressMap = (progressData || []).reduce((map: any, item: any) => {
      map[item.lesson_id] = {
        completion_percentage: item.completion_percentage,
        completed_at: item.completed_at
      };
      return map;
    }, {});
    
    // Transform the result
    const lessons = data.map((lesson: any) => {
      const basicInfo = {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        course_id: lesson.course_id,
        course_title: lesson.course?.title,
        program_id: lesson.course?.program_id,
        created_at: lesson.created_at,
        thumbnail_url: lesson.thumbnail_url,
        status: lesson.status,
        order_index: lesson.order_index,
        duration_minutes: lesson.duration_minutes,
        completion_percentage: progressMap[lesson.id]?.completion_percentage || 0,
        completed_at: progressMap[lesson.id]?.completed_at || null,
        total_modules: lesson.modules?.count || 0
      };
      
      // Include additional admin fields if requested and user has appropriate permissions
      if (adminView && (isAdmin || isManager)) {
        return {
          ...basicInfo,
          updated_at: lesson.updated_at,
          created_by: lesson.created_by,
          updated_by: lesson.updated_by,
          archived_at: lesson.archived_at,
          archived_by: lesson.archived_by
        };
      }
      
      return basicInfo;
    });
    
    return NextResponse.json({
      lessons,
      pagination: {
        total: count || 0,
        offset,
        limit
      }
    });
  } catch (error) {
    console.error('Error in lessons API:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/lessons
 * 
 * Creates a new lesson.
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
    
    // Check if user has appropriate permissions
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userData?.is_admin || false;
    const isManager = userData?.role === 'manager' || userData?.role === 'training_manager';
    
    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or manager privileges required' }, 
        { status: 403 }
      );
    }
    
    // Parse request body
    const lessonData = await request.json();
    
    // Validate required fields
    if (!lessonData.title || !lessonData.course_id) {
      return NextResponse.json(
        { error: 'Title and course_id are required' },
        { status: 400 }
      );
    }
    
    // Get the maximum order_index for this course
    const { data: maxOrderData } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('course_id', lessonData.course_id)
      .order('order_index', { ascending: false })
      .limit(1);
      
    const nextOrderIndex = maxOrderData && maxOrderData.length > 0 
      ? (maxOrderData[0].order_index + 1) 
      : 1;
    
    // Prepare lesson data for insertion
    const newLesson = {
      title: lessonData.title,
      description: lessonData.description || '',
      course_id: lessonData.course_id,
      status: lessonData.status || 'active',
      thumbnail_url: lessonData.thumbnail_url || null,
      duration_minutes: lessonData.duration_minutes || 0,
      order_index: lessonData.order_index !== undefined ? lessonData.order_index : nextOrderIndex,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('lessons')
      .insert(newLesson)
      .select();
    
    if (error) {
      console.error('Error creating lesson:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Lesson created successfully',
      lesson: data[0]
    });
  } catch (error) {
    console.error('Error in lesson creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/lessons
 * 
 * Updates an existing lesson.
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
    
    // Check if user has appropriate permissions
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userData?.is_admin || false;
    const isManager = userData?.role === 'manager' || userData?.role === 'training_manager';
    
    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or manager privileges required' }, 
        { status: 403 }
      );
    }
    
    // Parse request body
    const lessonData = await request.json();
    
    // Validate required fields
    if (!lessonData.id || !lessonData.title) {
      return NextResponse.json(
        { error: 'Lesson ID and title are required' },
        { status: 400 }
      );
    }
    
    // Prepare lesson data for update
    const updatedLesson = {
      title: lessonData.title,
      description: lessonData.description || '',
      status: lessonData.status || 'active',
      thumbnail_url: lessonData.thumbnail_url,
      course_id: lessonData.course_id,
      duration_minutes: lessonData.duration_minutes || 0,
      order_index: lessonData.order_index,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Update in database
    const { data, error } = await supabase
      .from('lessons')
      .update(updatedLesson)
      .eq('id', lessonData.id)
      .select();
    
    if (error) {
      console.error('Error updating lesson:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Lesson updated successfully',
      lesson: data[0]
    });
  } catch (error) {
    console.error('Error in lesson update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning/lessons
 * 
 * Deletes or archives a lesson.
 * Requires admin or manager privileges.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const lessonId = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
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
    
    // Check if user has appropriate permissions
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userData?.is_admin || false;
    const isManager = userData?.role === 'manager' || userData?.role === 'training_manager';
    
    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or manager privileges required' }, 
        { status: 403 }
      );
    }
    
    if (permanent) {
      // Permanently delete the lesson
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);
      
      if (error) {
        console.error('Error deleting lesson:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: 'Lesson permanently deleted'
      });
    } else {
      // Archive the lesson (soft delete)
      const { data, error } = await supabase
        .from('lessons')
        .update({ 
          status: 'archived',
          archived_by: user.id,
          archived_at: new Date().toISOString()
        })
        .eq('id', lessonId)
        .select();
      
      if (error) {
        console.error('Error archiving lesson:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Lesson archived successfully',
        lesson: data[0]
      });
    }
  } catch (error) {
    console.error('Error in lesson deletion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 