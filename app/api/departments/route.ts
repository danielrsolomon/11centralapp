import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

/**
 * GET /api/departments
 * 
 * Lists all departments available to the authenticated user.
 */
export async function GET() {
  const supabase = await createRouteHandlerClient();
  
  try {
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Fetch departments
    const { data: departments, error } = await supabase
      .from('departments')
      .select('id, name, created_at')
      .order('name', { ascending: true });
    
    if (error) {
      logger.error('Error fetching departments', error);
      return NextResponse.json(
        { error: 'Failed to fetch departments' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      departments,
      pagination: {
        total: departments.length,
      } 
    });
  } catch (error) {
    logger.error('Unexpected error in departments API', error as Error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
} 