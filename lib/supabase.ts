/**
 * @deprecated This file is maintained for backward compatibility.
 * Please use lib/supabase-client.ts instead for client-side Supabase operations.
 * 
 * Example:
 * import supabase from '@/lib/supabase-client';
 * // OR
 * import { createClient } from '@/lib/supabase-client';
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import supabaseClient from './supabase-client'

// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.warn(
    'WARNING: You are using a deprecated Supabase client implementation (lib/supabase.ts).\n' +
    'Please update your imports to use lib/supabase-client.ts instead.\n' +
    'This file will be removed in a future update.'
  )
}

/**
 * @deprecated Use createClient from lib/supabase-client.ts instead
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export the enhanced client as default for compatibility
export default supabaseClient 