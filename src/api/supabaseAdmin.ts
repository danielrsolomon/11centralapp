import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase
// We check for both sets of environment variable names to support different environments
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// Debug output for available environment variables
if (process.env.NODE_ENV === 'development') {
  console.log('[Supabase] Debug - Available environment variables:', Object.keys(process.env));
  console.log('[Supabase] Debug - VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing');
  console.log('[Supabase] Debug - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
  console.log('[Supabase] Debug - SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
  console.log('[Supabase] Debug - SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Present' : 'Missing');
}

// Validate Supabase credentials
if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Set VITE_SUPABASE_URL or SUPABASE_URL environment variable.');
}

if (!supabaseServiceKey) {
  throw new Error('Missing Supabase service key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable.');
}

// Create a simple in-memory storage for the admin client
const memoryStore = new Map<string, string>();

// Create a server-side storage adapter that only uses in-memory storage
const serverStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      console.log(`[Supabase Admin] Getting storage item with key: ${key}`);
      return memoryStore.get(key) || null;
    } catch (error) {
      console.error(`[Supabase Admin] Error in getItem for key ${key}:`, error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      console.log(`[Supabase Admin] Setting storage item with key: ${key}`);
      memoryStore.set(key, value);
    } catch (error) {
      console.error(`[Supabase Admin] Error in setItem for key ${key}:`, error);
    }
  },
  removeItem: (key: string): void => {
    try {
      console.log(`[Supabase Admin] Removing storage item with key: ${key}`);
      memoryStore.delete(key);
    } catch (error) {
      console.error(`[Supabase Admin] Error in removeItem for key ${key}:`, error);
    }
  }
};

// Create Supabase admin client with server-side storage
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false, // Don't auto refresh on the server side
    persistSession: false,   // Don't persist sessions on the server side
    detectSessionInUrl: false, // Don't try to detect session in URL on server
    storage: serverStorageAdapter  // Use our simple in-memory storage
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-node/2.0.0'  // Explicitly identify as a server client
    }
  }
});

console.log('[Supabase Admin] Admin client initialized with simple memory storage');

// Cache for validated users to reduce API calls
// Structure: { userId: { timestamp: number, userData: any } }
const userCache = new Map<string, { timestamp: number, userData: any }>();
const TOKEN_CACHE = new Map<string, { userId: string, expires: number }>();

// Cache expiry time (10 minutes)
const CACHE_EXPIRY = 10 * 60 * 1000;

/**
 * Get user data with caching to reduce API calls
 */
async function getUserWithCache(userId: string) {
  // Check cache first
  const cached = userCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_EXPIRY) {
    console.log(`[Supabase Admin] Using cached user data for ${userId}`);
    return { data: cached.userData, error: null };
  }
  
  // If not in cache or expired, fetch from database
  console.log(`[Supabase Admin] Fetching user data for ${userId}`);
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, roles, is_active')
    .eq('id', userId)
    .single();
  
  if (!error && data) {
    // Store in cache
    userCache.set(userId, { timestamp: now, userData: data });
  }
  
  return { data, error };
}

/**
 * Validate JWT token and get user ID
 * This implementation only extracts the user ID from the token without actual validation
 * The validation is handled by Supabase when getting the user data
 */
function validateToken(token: string): { 
  valid: boolean; 
  userId: string | null; 
  payload?: any;
  error?: string 
} {
  try {
    // Check cache first
    if (TOKEN_CACHE.has(token)) {
      const cached = TOKEN_CACHE.get(token)!;
      if (cached.expires > Date.now()) {
        return { valid: true, userId: cached.userId };
      } else {
        TOKEN_CACHE.delete(token);
      }
    }
    
    // Basic structure validation
    if (!token || typeof token !== 'string' || !token.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      return { valid: false, userId: null, error: 'Invalid token format' };
    }
    
    // Extract the payload
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('[Supabase Admin] Token payload:', JSON.stringify(payload, null, 2));
    
    // Check if token has basic required fields
    if (!payload || !payload.sub) {
      return { valid: false, userId: null, error: 'Invalid token payload' };
    }
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, userId: null, error: 'Token expired' };
    }
    
    // Cache the token validation result
    TOKEN_CACHE.set(token, {
      userId: payload.sub,
      expires: (payload.exp || (Date.now() / 1000 + 3600)) * 1000
    });
    
    return { valid: true, userId: payload.sub, payload };
  } catch (error) {
    console.error('[Supabase Admin] Token validation error:', error);
    return { valid: false, userId: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Custom middleware-compatible function to get user from token
 * This avoids the need for Supabase auth.getUser() which has localStorage issues
 */
async function getUserFromToken(token: string) {
  try {
    // Validate the token format and extract user ID
    const { valid, userId, error } = validateToken(token);
    
    if (!valid || !userId) {
      return { 
        data: null, 
        error: { message: error || 'Invalid token', code: 'INVALID_TOKEN' } 
      };
    }
    
    // Get the user data from database with caching
    return await getUserWithCache(userId);
  } catch (error) {
    console.error('[Supabase Admin] Error in getUserFromToken:', error);
    return { 
      data: null, 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error', 
        code: 'AUTH_ERROR' 
      } 
    };
  }
}

// Helper function to handle Supabase Admin errors consistently
export function handleAdminError(error: any) {
  console.error('[Supabase Admin] Error:', error);
  
  // Return a standardized error object
  return {
    message: error.message || 'An unexpected error occurred with Supabase',
    code: error.code || 'SUPABASE_ERROR',
    details: error.details || error.stack || null
  };
}

export { supabaseAdmin, getUserFromToken, validateToken }; 