import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Only allow in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase admin client with the service role key
const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  // Security check - only allow in development
  if (!isDevelopment) {
    console.error('[CLEANUP API] This endpoint is only available in development mode');
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const { table } = await request.json();
    
    if (!table) {
      return NextResponse.json(
        { error: 'Missing table parameter' },
        { status: 400 }
      );
    }

    console.log(`[CLEANUP API] Cleaning all records from ${table}`);

    // Perform the delete operation with the admin client
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This targets all records

    if (error) {
      console.error(`[CLEANUP API] Error deleting records from ${table}:`, error);
      return NextResponse.json(
        { 
          error: `Failed to delete records from ${table}`,
          details: error 
        },
        { status: 500 }
      );
    }

    console.log(`[CLEANUP API] Successfully deleted all records from ${table}`);
    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted all records from ${table}`
    });

  } catch (error) {
    console.error('[CLEANUP API] Error processing cleanup request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process cleanup request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 