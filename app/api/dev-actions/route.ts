import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Only allow in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log detailed environment information for debugging
console.log('[SERVER API] Environment check:', {
  isDev: isDevelopment,
  supabaseUrl,
  serviceKeyFirstChars: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 5)}...` : 'Missing',
  serviceKeyLength: supabaseServiceKey?.length || 0,
});

// Create a Supabase admin client with the service role key
let supabaseAdmin = null;

if (isDevelopment && supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[SERVER API] Supabase admin client created successfully');
    
    // Test the connection immediately to verify credentials
    supabaseAdmin.auth.getSession().then(response => {
      if (response.error) {
        console.error('[SERVER API] Connection test failed:', response.error);
      } else {
        console.log('[SERVER API] Connection test successful');
      }
    });
  } catch (error) {
    console.error('[SERVER API] Failed to create Supabase admin client:', error);
  }
}

export async function POST(request: Request) {
  // Security check - only allow in development
  if (!isDevelopment) {
    console.error('[SERVER API] Dev actions are only allowed in development mode');
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  if (!supabaseAdmin) {
    console.error('[SERVER API] Supabase admin client not initialized');
    return NextResponse.json(
      { 
        error: 'Server configuration error',
        details: 'The Supabase admin client could not be initialized.',
        config: {
          url: supabaseUrl ? 'Present' : 'Missing',
          keyPresent: !!supabaseServiceKey,
          environment: process.env.NODE_ENV
        },
        troubleshooting: [
          'Ensure SUPABASE_SERVICE_ROLE_KEY is correctly set in .env.local',
          'Make sure you fully restarted the development server',
          'Verify that the service role key is valid for this project'
        ]
      },
      { status: 500 }
    );
  }

  try {
    const { action, table, data, id } = await request.json();

    console.log(`[SERVER API] Processing ${action} for ${table}`, { data, id });

    let result;

    switch (action) {
      case 'insert':
        result = await supabaseAdmin.from(table).insert(data).select();
        break;
      
      case 'update':
        result = await supabaseAdmin.from(table).update(data).eq('id', id).select();
        break;
      
      case 'delete':
        result = await supabaseAdmin.from(table).delete().eq('id', id);
        break;
      
      case 'select':
        // Handle different filter types
        let query = supabaseAdmin.from(table).select('*');
        
        // Apply filters if provided
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          });
        }
        
        // Execute the query
        result = await query;
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Check if there was an error with the Supabase operation
    if (result.error) {
      console.error(`[SERVER API] Supabase ${action} error:`, result.error);
      return NextResponse.json(
        { 
          error: `Failed to ${action} data in ${table}`, 
          details: result.error,
          credentials: {
            url: supabaseUrl ? 'Present' : 'Missing',
            keyValid: !!supabaseServiceKey,
            table
          }
        },
        { status: 500 }
      );
    }

    console.log(`[SERVER API] ${action} successful:`, result.data);
    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('[SERVER API] Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error },
      { status: 500 }
    );
  }
} 