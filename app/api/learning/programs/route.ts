import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { Monitoring } from '@/lib/monitoring';
import { getService } from '@/lib/service-registry';
import type { ProgramService } from '@/lib/service-registry';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { 
  canCreateContent, 
  canEditContent, 
  canDeleteContent, 
  hasAdminRole, 
  logPermissionDenial 
} from '@/lib/auth/permission-utils';

// Feature flag name constants
const PROGRAM_SERVICE_FLAG = 'use-new-lms-services';

/**
 * GET /api/learning/programs
 * 
 * Lists all training programs available to the authenticated user.
 * 
 * Query parameters:
 *   - departmentId: (optional) Filter by department
 *   - status: (optional) Filter by status ("active", "upcoming", "archived")
 *   - limit: (optional) Number of results to return
 *   - offset: (optional) Pagination offset
 *   - includeArchived: (optional) Include archived programs (true/false)
 *   - adminView: (optional) Include additional details for admins (true/false)
 */
export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();
  
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const departmentId = url.searchParams.get('departmentId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const adminView = url.searchParams.get('adminView') === 'true';
    
    // Create Supabase client that properly handles cookies for server-side authentication
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user directly instead of session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Get user roles and admin status (if available)
    let userRoles: string[] = [];
    let isAdmin = false;
    
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, is_admin')
        .eq('id', userId)
        .single();
        
      if (userProfile) {
        if (userProfile.role) {
          userRoles = Array.isArray(userProfile.role) 
            ? userProfile.role 
            : [userProfile.role];
        }
        isAdmin = !!userProfile.is_admin || (userProfile.role === 'superadmin');
      }
    } catch (error) {
      // Ignore errors when fetching roles - we'll continue with default permissions
      console.warn('Error fetching user roles:', error);
    }
    
    let result: any;
    
    // Set up feature flag context
    const featureFlagContext = {
      userId,
      userRoles,
      isAdmin
    };
    
    // Check if we should use the new service-based implementation
    const useNewImplementation = isFeatureEnabled(PROGRAM_SERVICE_FLAG, featureFlagContext);
    
    const timer = Monitoring.createTimer('lms', 'listPrograms', 'query', {
      implementation: useNewImplementation ? 'new' : 'legacy',
      userId,
      departmentId,
      status,
      limit,
      offset
    });
    
    if (useNewImplementation) {
      // Log that we're using the new implementation
      Monitoring.logEvent('lms', 'listPrograms.implementation', {
        type: 'new',
        departmentId,
        isAdmin
      });
      
      try {
        // Get the program service
        const programService = getService<ProgramService>('program', {
          userId, 
          userRoles,
          isAdmin
        });
        
        // Call the service
        result = await programService.listPrograms(userId, {
          departmentId,
          status,
          limit,
          offset,
          includeArchived,
          adminView
        });
        
        timer.stop();
      } catch (error) {
        // Handle errors from the new implementation
        Monitoring.logError('lms', 'listPrograms.new', error, {
          userId, 
          departmentId
        });
        
        // Fall back to legacy implementation if the new one fails
        Monitoring.logEvent('lms', 'listPrograms.fallback', {
          reason: 'new_implementation_error',
          error: error instanceof Error ? error.message : String(error)
        });
        
        console.warn('Falling back to legacy implementation due to error:', error);
        
        // Use legacy implementation as fallback
        result = await getLegacyPrograms(
          supabase,
          userId,
          departmentId,
          status,
          limit,
          offset,
          includeArchived,
          adminView,
          isAdmin
        );
      }
    } else {
      // Use legacy implementation
      result = await getLegacyPrograms(
        supabase,
        userId,
        departmentId,
        status,
        limit,
        offset,
        includeArchived,
        adminView,
        isAdmin
      );
    }
    
    const requestEndTime = performance.now();
    
    // Add performance information in debug mode
    if (url.searchParams.get('debug') === 'true') {
      result.debug = {
        timing: {
          total: requestEndTime - requestStartTime,
          query: timer.stop() // Call stop() to get duration
        },
        implementation: useNewImplementation ? 'new' : 'legacy',
        params: {
          departmentId,
          status,
          limit,
          offset,
          includeArchived,
          adminView
        }
      };
    }
    
    return NextResponse.json(result);
  } catch (error) {
    Monitoring.logError('lms', 'programs.get', error);
    console.error('Error in programs API:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/programs
 * 
 * Creates a new training program.
 * Requires admin, manager, or content creation permissions.
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
    
    // Get user information without preferences (preferences come from separate table)
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
    // Log but proceed with default values
    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.warn('Error fetching user preferences:', preferencesError);
    }

    // Combine user data with preferences properly
    const unifiedUserData = {
      ...userData,
      user_preferences: userPreferences || {},
    };

    // Use our permission utility to check if user can create content
    if (!canCreateContent(unifiedUserData)) {
      // Log the permission denial but don't terminate the session
      logPermissionDenial(unifiedUserData, 'create program');
      
      // Return 403 with descriptive message but don't trigger session termination
      return NextResponse.json(
        { 
          error: 'Permission denied - requires content management permissions',
          requiresAuth: false, // Flag to indicate it's not an auth error
          details: 'You need admin, superadmin, manager, or content creation permissions to create programs'
        }, 
        { status: 403 }
      );
    }
    
    // Parse request body
    const programData = await request.json();
    
    // Validate required fields
    if (!programData.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Prepare program data for insertion
    const newProgram = {
      title: programData.title,
      description: programData.description || '',
      status: programData.status || 'active',
      thumbnail_url: programData.thumbnail_url,
      departments: programData.departments || [],
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('programs')
      .insert(newProgram)
      .select();
    
    if (error) {
      console.error('Error creating program:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Program created successfully',
      program: data[0]
    });
  } catch (error) {
    console.error('Error in program creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/programs
 * 
 * Updates an existing training program.
 * Requires admin, manager, or content editing permissions.
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
    
    // Parse request body
    const programData = await request.json();
    
    // Use the shared helper function to handle the update
    return handleProgramUpdate(supabase, user, programData);
  } catch (error) {
    console.error('Error in program update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning/programs?id={programId}
 * 
 * Archives or permanently deletes a program.
 * Requires admin, manager, or content deletion permissions.
 * Use query param ?permanent=true to permanently delete instead of archive.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const programId = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!programId) {
      return NextResponse.json(
        { error: 'Program ID is required' },
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

    // Use our permission utility to check if user can delete content
    if (!canDeleteContent(unifiedUserData)) {
      // Log the permission denial but don't terminate the session
      logPermissionDenial(unifiedUserData, 'delete program');
      
      // Return 403 with descriptive message but don't trigger session termination
      return NextResponse.json(
        { 
          error: 'Permission denied - requires content management permissions',
          requiresAuth: false, // Flag to indicate it's not an auth error
          details: 'You need admin, superadmin, or content deletion permissions to delete programs'
        }, 
        { status: 403 }
      );
    }
    
    if (permanent) {
      // Permanently delete the program
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId);
      
      if (error) {
        console.error('Error deleting program:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: 'Program permanently deleted'
      });
    } else {
      // Archive the program (soft delete)
      const { data, error } = await supabase
        .from('programs')
        .update({ 
          status: 'archived',
          archived_by: user.id,
          archived_at: new Date().toISOString()
        })
        .eq('id', programId)
        .select();
      
      if (error) {
        console.error('Error archiving program:', error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'Program not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Program archived successfully',
        program: data[0]
      });
    }
  } catch (error) {
    console.error('Error in program deletion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/learning/programs/:id
 * 
 * Handles PATCH requests for updating programs with id in the URL path.
 * This is a wrapper around the PUT handler to properly handle PATCH requests
 * from client code that uses /api/learning/programs/${id} path format.
 */
export async function PATCH(request: NextRequest) {
  try {
    // Extract the program ID from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const programId = pathParts[pathParts.length - 1];
    
    if (!programId) {
      return NextResponse.json(
        { error: 'Program ID is required in the URL path' },
        { status: 400 }
      );
    }
    
    // Get the request body
    const requestBody = await request.json();
    
    // Add the program ID to the request body
    const updatedRequestBody = {
      ...requestBody,
      id: programId
    };
    
    // Since we can't directly create a NextRequest, modify the PUT handler
    // to accept the programId and body directly
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Use the PUT logic directly with our extracted data
    // This is safer than trying to create a NextRequest
    return handleProgramUpdate(supabase, user, updatedRequestBody);
  } catch (error) {
    console.error('Error in program PATCH:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to handle the actual program update logic
// Extracted from the PUT handler to avoid code duplication
async function handleProgramUpdate(supabase: any, user: any, programData: any) {
  try {
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

    // Use our permission utility to check if user can edit content
    if (!canEditContent(unifiedUserData)) {
      // Log the permission denial but don't terminate the session
      logPermissionDenial(unifiedUserData, 'update program');
      
      // Return 403 with descriptive message but don't trigger session termination
      return NextResponse.json(
        { 
          error: 'Permission denied - requires content management permissions',
          requiresAuth: false, // Flag to indicate it's not an auth error
          details: 'You need admin, superadmin, manager, or content editing permissions to update programs'
        }, 
        { status: 403 }
      );
    }
    
    // Validate required fields
    if (!programData.id || !programData.title) {
      return NextResponse.json(
        { error: 'Program ID and title are required' },
        { status: 400 }
      );
    }
    
    // Prepare program data for update
    const updatedProgram = {
      title: programData.title,
      description: programData.description || '',
      status: programData.status || 'active',
      thumbnail_url: programData.thumbnail_url,
      departments: programData.departments || [],
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Update in database
    const { data, error } = await supabase
      .from('programs')
      .update(updatedProgram)
      .eq('id', programData.id)
      .select();
    
    if (error) {
      console.error('Error updating program:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Program updated successfully',
      program: data[0]
    });
  } catch (error) {
    console.error('Error in program update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Legacy implementation of the Programs List API.
 * This will be gradually replaced by the new service-based implementation.
 */
async function getLegacyPrograms(
  supabase: any,
  userId: string,
  departmentId?: string,
  status?: string,
  limit: number = 10,
  offset: number = 0,
  includeArchived: boolean = false,
  adminView: boolean = false,
  isAdmin: boolean = false
) {
  const timer = Monitoring.createTimer('lms', 'listPrograms', 'query', {
    implementation: 'legacy',
    userId,
    departmentId,
    status,
    limit,
    offset,
    includeArchived,
    adminView
  });
  
  try {
    // Build query - Using the supabase client passed from the main handler
    // to maintain the same authentication context
    let query = supabase
      .from('programs')
      .select(`
        *,
        departments(name),
        courses(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    // Add department filter if provided
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    } else if (!includeArchived) {
      // By default, exclude archived programs unless specifically requested
      query = query.neq('status', 'archived');
    }
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Get user progress for these programs in a separate query
    const { data: progressData } = await supabase
      .from('user_program_progress')
      .select('program_id, completion_percentage')
      .eq('user_id', userId)
      .in('program_id', data.map((p: any) => p.id));
      
    // Create a map of program ID to completion percentage
    const progressMap = (progressData || []).reduce((map: any, item: any) => {
      map[item.program_id] = item.completion_percentage;
      return map;
    }, {});
    
    // Transform the result
    const programs = data.map((program: any) => {
      const basicInfo = {
        id: program.id,
        title: program.title,
        description: program.description,
        department_id: program.department_id,
        department_name: program.departments?.name,
        created_at: program.created_at,
        thumbnail_url: program.thumbnail_url,
        status: program.status,
        completion_percentage: progressMap[program.id] || 0,
        total_courses: program.courses?.length || 0,
        completed_courses: Math.floor((program.courses?.length || 0) * (progressMap[program.id] || 0) / 100)
      };
      
      // Include additional admin fields if requested and user is admin
      if (adminView && isAdmin) {
        return {
          ...basicInfo,
          departments: program.departments,
          updated_at: program.updated_at,
          created_by: program.created_by,
          updated_by: program.updated_by,
          archived_at: program.archived_at,
          archived_by: program.archived_by
        };
      }
      
      return basicInfo;
    });
    
    const result = {
      programs,
      pagination: {
        total: count || 0,
        offset,
        limit
      }
    };
    
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    Monitoring.logError('lms', 'listPrograms.legacy', error, {
      userId, 
      departmentId,
      status
    });
    throw error;
  }
} 