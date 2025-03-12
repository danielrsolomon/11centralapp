import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * POST /api/learning/programs/[id]/archive
 * 
 * Archives an existing program by setting its status to 'archived'.
 * Authentication is handled by Supabase middleware.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get programId from route parameters
    const programId = params.id;
    
    if (!programId) {
      return NextResponse.json(
        { error: 'Program ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client with route handler for proper cookie-based auth
    const supabase = await createRouteHandlerClient();
    
    // Get authenticated user using getUser instead of getSession for consistent auth pattern
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the user has admin privileges (simplified approach)
    const isAdmin = await checkUserIsAdmin(supabase, user.id);
    
    // If not admin, return forbidden
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to archive programs' },
        { status: 403 }
      );
    }
    
    // Update program status to archived - directly without additional checks
    const { data: archivedProgram, error: updateError } = await supabase
      .from('programs')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', programId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error archiving program:', updateError);
      return NextResponse.json(
        { error: 'Failed to archive program' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ program: archivedProgram });
  } catch (error) {
    console.error('Error in archive program route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if a user has admin privileges
 * This is a simplified approach to avoid the complexity of the previous implementation
 */
async function checkUserIsAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    // First attempt: check if the user has is_admin flag
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', userId)
      .single();
      
    if (!userError && userData) {
      // If user has is_admin flag set to true or has an admin/superadmin role
      if (userData.is_admin === true) {
        return true;
      }
      
      if (userData.role && ['admin', 'superadmin', 'manager', 'training_manager'].includes(userData.role.toLowerCase())) {
        return true;
      }
    }
    
    // Second attempt: check if user has any admin roles in user_roles
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
      
    if (roleData && roleData.length > 0) {
      // Check if any role is admin, superadmin, or manager
      return roleData.some((r: any) => 
        r.role && ['admin', 'superadmin', 'manager', 'instructor'].includes(r.role.toLowerCase())
      );
    }
    
    // Default to false if no admin privileges were found
    return false;
  } catch (error) {
    console.warn('Error checking user admin status:', error);
    return false; // Default to no permissions on error
  }
} 