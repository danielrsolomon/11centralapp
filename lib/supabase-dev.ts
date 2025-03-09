import { DEVELOPMENT_MODE } from './development-mode';

/**
 * This file contains development-only workarounds for Supabase RLS restrictions
 * WARNING: These utilities should NEVER be used in production code.
 */

// Check if we're in development mode
if (!DEVELOPMENT_MODE) {
  console.warn('supabase-dev.ts should not be imported in production code!');
}

// Log development mode status
if (typeof window !== 'undefined') {
  console.log('[DEV CLIENT] Development mode:', { 
    enabled: DEVELOPMENT_MODE, 
    nodeEnv: process.env.NODE_ENV,
    bypassRls: process.env.NEXT_PUBLIC_DEV_BYPASS_RLS
  });
}

/**
 * Helper function to call the dev API route
 */
async function callDevApi(action: string, table: string, data: any, id?: string) {
  if (!DEVELOPMENT_MODE) {
    console.error(`${action} should only be used in development!`);
    return { data: null, error: new Error('Not in development mode') };
  }

  try {
    console.log(`[DEV CLIENT] ${action} for ${table}:`, data);
    
    const response = await fetch('/api/dev-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        table,
        data,
        id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[DEV CLIENT] Server error:`, errorData);
      
      // More user-friendly error messages
      if (errorData.details?.message === 'Invalid API key') {
        console.error('[DEV CLIENT] The Supabase service role key is invalid or misconfigured.');
        console.error('[DEV CLIENT] Please check your .env.local file and verify the key in Supabase dashboard.');
        
        return { 
          data: null, 
          error: new Error(`
Authentication Error: The service role key is invalid.

Please check:
1. Your .env.local file has the correct SUPABASE_SERVICE_ROLE_KEY value
2. The service role key matches your Supabase project
3. You've restarted the server after updating the key
`)
        };
      }
      
      return { 
        data: null, 
        error: new Error(`Server error: ${errorData.error || response.statusText}`) 
      };
    }

    const result = await response.json();
    console.log(`[DEV CLIENT] ${action} success:`, result);
    return result.result;
  } catch (error) {
    console.error(`[DEV CLIENT] Error in ${action} for ${table}:`, error);
    return { data: null, error };
  }
}

/**
 * Inserts data into a table, bypassing RLS policies
 * DEVELOPMENT USE ONLY - never use in production
 */
export async function devInsert(table: string, data: any) {
  return callDevApi('insert', table, data);
}

/**
 * Updates data in a table, bypassing RLS policies
 * DEVELOPMENT USE ONLY - never use in production
 */
export async function devUpdate(table: string, id: string, data: any) {
  return callDevApi('update', table, data, id);
}

/**
 * Deletes data from a table, bypassing RLS policies
 * DEVELOPMENT USE ONLY - never use in production
 */
export async function devDelete(table: string, id: string) {
  return callDevApi('delete', table, {}, id);
} 