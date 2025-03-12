/**
 * @deprecated This file is maintained for backward compatibility.
 * Please use lib/supabase-client.ts instead for client-side Supabase operations.
 * 
 * Example:
 * import supabase from '@/lib/supabase-client';
 * // OR
 * import { createClient } from '@/lib/supabase-client';
 */

import supabaseClient from './supabase-client'
import logger from './logger'

// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  logger.warn(
    'You are using a deprecated Supabase client implementation (lib/supabase-optimized.ts).\n' +
    'Please update your imports to use lib/supabase-client.ts instead.\n' +
    'This file will be removed in a future update.'
  )
}

// Re-export functions and methods from the new client for backward compatibility
export const refreshSession = async () => {
  const { data, error } = await supabaseClient.auth.getSession()
  if (error) {
    logger.error('Error refreshing session:', error instanceof Error ? error : new Error(String(error)))
    return null
  }
  return data.session
}

// Export the enhanced client as default for compatibility
export default supabaseClient 