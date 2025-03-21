import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

// Create a memory storage adapter for server-side compatibility
class MemoryStorageAdapter {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      console.log(`[SUPABASE-DEBUG] MemoryStorage.getItem(${key})`);
      return this.storage.get(key) || null;
    } catch (error) {
      console.error(`[SUPABASE-DEBUG] Error in memoryStorage.getItem for key ${key}:`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      console.log(`[SUPABASE-DEBUG] MemoryStorage.setItem(${key}) → setting value of length ${value?.length || 0}`);
      this.storage.set(key, value);
      
      // Synchronize sessions
      syncSessionStorage(key, value);
    } catch (error) {
      console.error(`[SUPABASE-DEBUG] Error in memoryStorage.setItem for key ${key}:`, error);
    }
  }

  removeItem(key: string): void {
    try {
      console.log(`[SUPABASE-DEBUG] MemoryStorage.removeItem(${key})`);
      this.storage.delete(key);
      
      // If removing Supabase session, also remove our custom session
      if (key === SUPABASE_AUTH_KEY) {
        console.log(`[SUPABASE-DEBUG] Removing custom auth session due to Supabase session removal`);
        this.storage.delete(CUSTOM_AUTH_KEY);
      }
    } catch (error) {
      console.error(`[SUPABASE-DEBUG] Error in memoryStorage.removeItem for key ${key}:`, error);
    }
  }
}

// Create a single instance of the memory storage adapter
const memoryStorage = new MemoryStorageAdapter();

// Node.js compatible environment variable access
const getEnvVar = (name: string, defaultValue: string): string => {
  // For browser (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || defaultValue;
  }
  // For Node.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || defaultValue;
  }
  return defaultValue;
};

// Get Supabase configuration
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://vzykvoyanfijphtvmgtu.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6eWt2b3lhbmZpanBodHZtZ3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMzIxMjIsImV4cCI6MjA1NjkwODEyMn0.vpyw6VZw26QXIkfLRwJVXeiKawx-foVn0W7E7T0YhjM');

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
}

// Log initialization for debugging
console.log('[SUPABASE-DEBUG] Initializing client with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'Not set');

// Define a constant for the session storage key to ensure consistency
const SUPABASE_AUTH_KEY = 'supabase.auth.token';
const CUSTOM_AUTH_KEY = 'authSession';

// Create a function to synchronize sessions
const syncSessionStorage = (key: string, value: string | null) => {
  try {
    // If Supabase auth token is being updated
    if (key === SUPABASE_AUTH_KEY && value !== null) {
      console.log(`[SUPABASE-DEBUG] Supabase session updated, syncing to custom storage`);
      // Try to parse the session data
      const sessionData = JSON.parse(value);
      // If it contains session data, update our custom storage too
      if (sessionData.currentSession) {
        memoryStorage.setItem(CUSTOM_AUTH_KEY, JSON.stringify(sessionData.currentSession));
        console.log(`[SUPABASE-DEBUG] Custom auth session synchronized from Supabase session`);
      }
    }
    // If our custom auth token is being updated
    else if (key === CUSTOM_AUTH_KEY && value !== null) {
      console.log(`[SUPABASE-DEBUG] Custom session updated, note that Supabase session should be updated separately`);
      // We don't sync back to Supabase as that requires specific structure
      // Supabase client handles that via setSession
    }
  } catch (error) {
    console.error(`[SUPABASE-DEBUG] Error syncing sessions:`, error);
  }
};

// Configure client options for better reliability
const supabaseOptions = {
  auth: {
    autoRefreshToken: false, // Completely disable auto refresh to prevent localStorage errors
    persistSession: false,   // Don't persist sessions 
    detectSessionInUrl: false, // Don't try to detect session in URL 
    storageKey: SUPABASE_AUTH_KEY, // Use the constant for consistency
    storage: memoryStorage // Directly use the memoryStorage adapter instance
  },
  global: {
    // Increase fetch timeout
    fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const fetchOptions: RequestInit = {
        ...init,
        // Set longer timeout for fetch requests (20 seconds)
        signal: init?.signal || (
          typeof AbortController !== 'undefined' 
            ? (() => { 
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 20000); // 20 second timeout
                return controller.signal;
              })() 
            : undefined
        ),
      };
      
      console.log(`[SUPABASE-DEBUG] Fetch request to: ${url.substring(0, 50)}...`);
      
      return fetch(input, fetchOptions)
        .then(response => {
          console.log(`[SUPABASE-DEBUG] Fetch response from: ${url.substring(0, 50)}... Status: ${response.status}`);
          return response;
        })
        .catch(error => {
          console.error(`[SUPABASE-DEBUG] Fetch error for: ${url.substring(0, 50)}...`, error);
          throw error;
        });
    }) as typeof fetch
  }
};

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Manually disable auto refresh to prevent localStorage errors
try {
  // @ts-ignore - accessing internal property to fix issues
  if (supabase.auth._autoRefreshInterval) {
    // @ts-ignore - accessing internal property to fix issues
    clearInterval(supabase.auth._autoRefreshInterval);
    // @ts-ignore - accessing internal property to fix issues
    supabase.auth._autoRefreshInterval = null;
    console.log('[SUPABASE-DEBUG] Disabled auto-refresh interval');
  }

  // @ts-ignore - accessing internal property to fix issues
  if (typeof supabase.auth._autoRefreshTokenTick === 'function') {
    // @ts-ignore - replace with no-op function
    supabase.auth._autoRefreshTokenTick = () => Promise.resolve();
    console.log('[SUPABASE-DEBUG] Replaced autoRefreshTokenTick with no-op function');
  }
} catch (error) {
  console.error('[SUPABASE-DEBUG] Failed to disable auto-refresh:', error);
}

// Initialize some debug info for the client
console.log('[SUPABASE-DEBUG] Client initialized with config', { 
  url: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'Not set',
  authEnabled: supabaseOptions.auth.persistSession,
  storageAvailable: true // Memory storage is always available
});

// Verify storage is working and session data exists
try {
  const hasSupabaseAuth = memoryStorage.getItem(SUPABASE_AUTH_KEY) !== null;
  const hasCustomAuth = memoryStorage.getItem(CUSTOM_AUTH_KEY) !== null;
  
  console.log('[SUPABASE-DEBUG] Storage check on initialization', {
    hasSupabaseAuthData: hasSupabaseAuth,
    hasCustomAuthSession: hasCustomAuth
  });
  
  // Log session structure for debugging
  if (hasSupabaseAuth) {
    try {
      const supabaseAuthData = JSON.parse(memoryStorage.getItem(SUPABASE_AUTH_KEY) || '{}');
      console.log('[SUPABASE-DEBUG] Supabase auth structure:', {
        hasCurrentSession: !!supabaseAuthData.currentSession,
        hasExpiresAt: supabaseAuthData.currentSession?.expires_at ? 'yes' : 'no',
        expiresAt: supabaseAuthData.currentSession?.expires_at 
          ? new Date(supabaseAuthData.currentSession.expires_at * 1000).toISOString() 
          : 'unknown'
      });
    } catch (e) {
      console.error('[SUPABASE-DEBUG] Error parsing Supabase auth data:', e);
    }
  }
  
  if (hasCustomAuth) {
    try {
      const customAuthData = JSON.parse(memoryStorage.getItem(CUSTOM_AUTH_KEY) || '{}');
      console.log('[SUPABASE-DEBUG] Custom auth structure:', {
        hasAccessToken: !!customAuthData.access_token,
        hasExpiresAt: customAuthData.expires_at ? 'yes' : 'no',
        expiresAt: customAuthData.expires_at 
          ? new Date(customAuthData.expires_at * 1000).toISOString() 
          : 'unknown'
      });
    } catch (e) {
      console.error('[SUPABASE-DEBUG] Error parsing custom auth data:', e);
    }
  }
  
} catch (e) {
  console.error('[SUPABASE-DEBUG] Error checking storage:', e);
}

// Export URL and key for direct access if needed
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

// Export the client instance
export { supabase };

// Export a function to create a fresh client (useful for auth issues)
export const createFreshClient = () => {
  console.log('[SUPABASE-DEBUG] Creating fresh client connection');
  return createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);
};

// Helper to handle Supabase errors consistently
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  // Check for network-related errors first
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      data: null,
      error: {
        message: 'Network error: Could not connect to Supabase. Please check your internet connection.',
        details: error.message,
        hint: 'Ensure you have internet connectivity and the Supabase server is accessible.',
        code: 'NETWORK_ERROR',
        name: 'NetworkError'
      }
    };
  }
  
  // Handle abort controller timeouts
  if (error.name === 'AbortError') {
    return {
      data: null,
      error: {
        message: 'Request timeout: The connection to Supabase timed out.',
        details: error.message,
        hint: 'The server took too long to respond. Please try again later.',
        code: 'TIMEOUT_ERROR',
        name: 'TimeoutError'
      }
    };
  }
  
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

// Check if something is an error
export const isError = (error: any): error is PostgrestError => {
  return error !== null && error !== undefined;
};

// Format error message for display
export const formatErrorMessage = (error: any): string => {
  if (!error) return 'No error';
  if (typeof error === 'string') return error;
  return error.message || error.details || JSON.stringify(error);
};

/**
 * @deprecated - Direct Supabase query function. This should NOT be used in new code.
 * 
 * Per the API-first architecture, all database operations should go through API endpoints.
 * This function is only maintained for:
 * 1. Legacy code during migration
 * 2. Testing/diagnostic components
 * 3. Real-time features where direct Supabase usage is permitted
 * 
 * @example Alternative usage:
 * // Instead of:
 * const { data, error } = await queryTable('users', { filters: { id: '123' } });
 * 
 * // Use:
 * const { data, error } = await api.get('/users/123');
 */
export async function queryTable(
  tableName: string,
  options: {
    select?: string;
    filters?: Record<string, any>;
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  } = {}
) {
  console.warn(
    '[DEPRECATED] Direct Supabase queryTable usage detected. ' +
    'This function is deprecated and will be removed in future releases. ' +
    'Please use the API service instead.'
  );
  
  try {
    const { select = '*', filters = {}, limit, orderBy } = options;
    
    let query = supabase.from(tableName).select(select);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const operator = Object.keys(value)[0];
        const operand = value[operator];
        
        switch (operator) {
          case 'eq': query = query.eq(key, operand); break;
          case 'neq': query = query.neq(key, operand); break;
          case 'in': query = query.in(key, operand); break;
          case 'gt': query = query.gt(key, operand); break;
          case 'gte': query = query.gte(key, operand); break;
          case 'lt': query = query.lt(key, operand); break;
          case 'lte': query = query.lte(key, operand); break;
          default: query = query.eq(key, operand);
        }
      } else {
        query = query.eq(key, value);
      }
    });
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    return await query;
  } catch (error) {
    return handleSupabaseError(error);
  }
}
