import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env.local');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
}

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Helper to handle Supabase errors consistently
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  // Create a standardized error that matches PostgrestError structure
  const postgrestError: PostgrestError = {
    message: error.message || 'An unexpected error occurred',
    details: error.details || '',
    hint: error.hint || '',
    code: error.code || 'UNKNOWN_ERROR',
    name: 'PostgrestError'
  };
  
  return {
    data: null,
    error: postgrestError
  };
};

// Utility function to check if a query was successful
export const isQuerySuccessful = <T>(
  result: { data: T | null; error: PostgrestError | null }
): result is { data: T; error: null } => {
  return !result.error && result.data !== null;
};

// Common query function with error handling
export async function queryTable<T = any>(
  tableName: string,
  query: (from: ReturnType<typeof supabase.from>) => any
): Promise<{ data: T | null; error: PostgrestError | null }> {
  try {
    const result = await query(supabase.from(tableName));
    return result;
  } catch (error) {
    return handleSupabaseError(error);
  }
} 