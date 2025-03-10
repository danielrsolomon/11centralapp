import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define types for our diagnostics data
type DiagnosticsData = {
  timestamp: string;
  environment: string | undefined;
  supabase: {
    url: string;
    hasAnonKey: boolean;
    anonKeyLength: number;
  };
  connectivity: {
    status: 'pending' | 'success' | 'failed' | 'error';
    statusCode?: number;
    error: string | null;
  };
  apiHealth: {
    status: 'pending' | 'success' | 'error';
    message?: string;
    data?: string;
    code?: string;
    error: string | null;
  };
}

// This diagnostic endpoint helps troubleshoot auth issues
export async function GET() {
  const diagnostics: DiagnosticsData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 12)}...` : 
        'MISSING',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    },
    connectivity: {
      status: 'pending',
      error: null
    },
    apiHealth: {
      status: 'pending',
      error: null
    }
  };

  // Test basic connectivity to Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const connectivityResponse = await fetch(supabaseUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Short timeout to avoid long waits
      signal: AbortSignal.timeout(5000)
    });
    
    diagnostics.connectivity = {
      status: connectivityResponse.ok ? 'success' : 'failed',
      statusCode: connectivityResponse.status,
      error: null
    };
  } catch (error) {
    diagnostics.connectivity = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Test API health with Supabase client
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Attempt a simple query to test connectivity
    const { data, error: queryError } = await supabase
      .from('health_check')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (queryError) {
      if (queryError.code === 'PGRST116') {
        // This is actually good - it means the API is working but the table doesn't exist
        diagnostics.apiHealth = {
          status: 'success',
          message: 'API responded with expected "relation does not exist" error',
          error: null
        };
      } else {
        diagnostics.apiHealth = {
          status: 'error',
          code: queryError.code,
          error: queryError.message
        };
      }
    } else {
      diagnostics.apiHealth = {
        status: 'success',
        data: data ? 'Data found' : 'No data',
        error: null
      };
    }
  } catch (error) {
    diagnostics.apiHealth = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Return the diagnostic results
  return NextResponse.json(diagnostics);
} 