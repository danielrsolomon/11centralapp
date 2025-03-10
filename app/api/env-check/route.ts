import { NextResponse } from 'next/server';

// This endpoint helps verify environment variables are set correctly
export async function GET() {
  const envInfo = {
    timestamp: new Date().toISOString(),
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 8)}...` : 
        'MISSING',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    },
    node_env: process.env.NODE_ENV,
  };

  return NextResponse.json(envInfo);
} 