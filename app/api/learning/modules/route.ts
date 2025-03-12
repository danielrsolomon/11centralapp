import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * GET /api/learning/modules
 * 
 * Lists all modules available to the authenticated user.
 * 
 * Query parameters:
 *   - lessonId: (optional) Filter by lesson
 *   - status: (optional) Filter by status ("active", "upcoming", "archived")
 *   - limit: (optional) Number of results to return
 *   - offset: (optional) Pagination offset
 *   - includeArchived: (optional) Include archived modules (true/false)
 *   - adminView: (optional) Include additional details for admins (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const lessonId = url.searchParams.get('lessonId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
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
      .from('modules')
      .select(`
        *,
        lesson:lesson_id(id, title, course_id)
      `, { count: 'exact' })
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1);
      
    // Add lesson filter if provided
    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    } else if (!includeArchived) {
      // By default, exclude archived modules unless specifically requested
      query = query.neq('status', 'archived');
    }
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching modules:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Get user progress for these modules in a separate query
    const { data: progressData } = await supabase
      .from('user_module_progress')
      .select('module_id, completion_percentage, completed_at')
      .eq('user_id', userId)
      .in('module_id', data.map((m: any) => m.id));
      
    // Create a map of module ID to progress data
    const progressMap = (progressData || []).reduce((map: any, item: any) => {
      map[item.module_id] = {
        completion_percentage: item.completion_percentage,
        completed_at: item.completed_at
      };
      return map;
    }, {});
    
    // Transform the result
    const modules = data.map((module: any) => {
      const basicInfo = {
        id: module.id,
        title: module.title,
        description: module.description,
        lesson_id: module.lesson_id,
        lesson_title: module.lesson?.title,
        course_id: module.lesson?.course_id,
        created_at: module.created_at,
        content_type: module.content_type,
        content_url: module.content_url,
        content_data: module.content_data,
        status: module.status,
        order_index: module.order_index,
        duration_minutes: module.duration_minutes,
        completion_percentage: progressMap[module.id]?.completion_percentage || 0,
        completed_at: progressMap[module.id]?.completed_at || null
      };
      
      // Include additional admin fields if requested and user has appropriate permissions
      if (adminView && (isAdmin || isManager)) {
        return {
          ...basicInfo,
          updated_at: module.updated_at,
          created_by: module.created_by,
          updated_by: module.updated_by,
          archived_at: module.archived_at,
          archived_by: module.archived_by
        };
      }
      
      return basicInfo;
    });
    
    return NextResponse.json({
      modules,
      pagination: {
        total: count || 0,
        offset,
        limit
      }
    });
  } catch (error) {
    console.error('Error in modules API:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/modules
 * 
 * Creates a new module.
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
    const moduleData = await request.json();
    
    // Validate required fields
    if (!moduleData.title || !moduleData.lesson_id || !moduleData.content_type) {
      return NextResponse.json(
        { error: 'Title, lesson_id, and content_type are required' },
        { status: 400 }
      );
    }
    
    // Validate content type
    const validContentTypes = ['text', 'video', 'quiz', 'assignment', 'pdf', 'html', 'interactive'];
    if (!validContentTypes.includes(moduleData.content_type)) {
      return NextResponse.json(
        { error: `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get the maximum order_index for this lesson
    const { data: maxOrderData } = await supabase
      .from('modules')
      .select('order_index')
      .eq('lesson_id', moduleData.lesson_id)
      .order('order_index', { ascending: false })
      .limit(1);
      
    const nextOrderIndex = maxOrderData && maxOrderData.length > 0 
      ? (maxOrderData[0].order_index + 1) 
      : 1;
    
    // Prepare module data for insertion
    const newModule = {
      title: moduleData.title,
      description: moduleData.description || '',
      lesson_id: moduleData.lesson_id,
      content_type: moduleData.content_type,
      content_url: moduleData.content_url || null,
      content_data: moduleData.content_data || null,
      status: moduleData.status || 'active',
      duration_minutes: moduleData.duration_minutes || 0,
      order_index: moduleData.order_index !== undefined ? moduleData.order_index : nextOrderIndex,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('modules')
      .insert(newModule)
      .select();
    
    if (error) {
      console.error('Error creating module:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Module created successfully',
      module: data[0]
    });
  } catch (error) {
    console.error('Error in module creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/modules
 * 
 * Updates an existing module.
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
    const moduleData = await request.json();
    
    // Validate required fields
    if (!moduleData.id || !moduleData.title) {
      return NextResponse.json(
        { error: 'Module ID and title are required' },
        { status: 400 }
      );
    }
    
    // Validate content type if provided
    if (moduleData.content_type) {
      const validContentTypes = ['text', 'video', 'quiz', 'assignment', 'pdf', 'html', 'interactive'];
      if (!validContentTypes.includes(moduleData.content_type)) {
        return NextResponse.json(
          { error: `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Prepare module data for update
    const updatedModule = {
      title: moduleData.title,
      description: moduleData.description || '',
      lesson_id: moduleData.lesson_id,
      content_type: moduleData.content_type,
      content_url: moduleData.content_url,
      content_data: moduleData.content_data,
      status: moduleData.status || 'active',
      duration_minutes: moduleData.duration_minutes || 0,
      order_index: moduleData.order_index,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined fields
    Object.keys(updatedModule).forEach((key) => {
      if (updatedModule[key as keyof typeof updatedModule] === undefined) {
        delete updatedModule[key as keyof typeof updatedModule];
      }
    });
    
    // Update in database
    const { data, error } = await supabase
      .from('modules')
      .update(updatedModule)
      .eq('id', moduleData.id)
      .select();
    
    if (error) {
      console.error('Error updating module:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Module updated successfully',
      module: data[0]
    });
  } catch (error) {
    console.error('Error in module update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning/modules
 * 
 * Deletes or archives a module.
 * Requires admin or manager privileges.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const moduleId = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
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
      // Permanently delete the module
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);
      
      if (error) {
        console.error('Error deleting module:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: 'Module permanently deleted'
      });
    } else {
      // Archive the module (soft delete)
      const { data, error } = await supabase
        .from('modules')
        .update({ 
          status: 'archived',
          archived_by: user.id,
          archived_at: new Date().toISOString()
        })
        .eq('id', moduleId)
        .select();
      
      if (error) {
        console.error('Error archiving module:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'Module not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Module archived successfully',
        module: data[0]
      });
    }
  } catch (error) {
    console.error('Error in module deletion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 