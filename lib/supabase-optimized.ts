import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'
import logger from './logger'
import performanceConfig from './performance.config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Cache timeout from config
const CACHE_TIMEOUT = performanceConfig.cache.defaultTimeout

// Create the base Supabase client with better fetch options
const baseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (url, options) => {
      // Add retry logic for fetch operations
      const MAX_RETRIES = 3;
      let error = null;
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          // Add a timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const fetchOptions = {
            ...options,
            signal: controller.signal
          };
          
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);
          return response;
        } catch (err) {
          error = err;
          // Only retry if it's a network error, not a 4xx or 5xx
          if (err instanceof Error && 
              (err.name === 'AbortError' || err.name === 'TypeError' || err.message.includes('network'))) {
            // Exponential backoff
            const delay = Math.min(1000 * (2 ** i), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          // If it's not a network error, break immediately
          break;
        }
      }
      
      // If we've exhausted retries, throw the last error
      throw error;
    }
  }
})

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number }>()

// Type for table names from database schema
type TableName = keyof Database['public']['Tables']

/**
 * Clear the entire cache or specific cache keys
 */
export function clearCache(cacheKey?: string) {
  if (cacheKey) {
    queryCache.delete(cacheKey)
    logger.debug(`Cache cleared for key: ${cacheKey}`)
  } else {
    queryCache.clear()
    logger.debug('Entire cache cleared')
  }
}

/**
 * Utility to refresh the auth session
 */
export async function refreshSession() {
  try {
    logger.debug('Attempting to refresh authentication session')
    
    // First, try to get the current session
    const { data: sessionData } = await baseClient.auth.getSession()
    
    // If there's no session at all, return an error
    if (!sessionData || !sessionData.session) {
      logger.debug('No session to refresh')
      return { success: false, error: new Error('No active session found') }
    }
    
    // Only attempt to refresh if we have a session
    const { data, error } = await baseClient.auth.refreshSession()
    
    if (error) {
      logger.error('Failed to refresh session', error, { component: 'auth' })
      
      // Try a different approach if refresh fails - bypass the refresh and use the current session
      const { data: userData } = await baseClient.auth.getUser()
      
      if (userData && userData.user) {
        logger.debug('Using existing session instead of refresh')
        return { 
          success: true, 
          data: sessionData,
          fallback: true
        }
      }
      
      return { success: false, error }
    }
    
    logger.debug('Successfully refreshed auth session')
    return { success: true, data }
  } catch (error) {
    logger.error('Exception while refreshing session', error instanceof Error ? error : new Error(String(error)), { 
      component: 'auth' 
    })
    
    // Try to recover by getting the current session
    try {
      const { data: sessionData } = await baseClient.auth.getSession()
      if (sessionData && sessionData.session) {
        logger.debug('Using existing session after refresh error')
        return { 
          success: true, 
          data: sessionData,
          fallback: true
        }
      }
    } catch (e) {
      // Ignore errors in recovery attempt
    }
    
    return { success: false, error }
  }
}

/**
 * Optimized Supabase client with caching, error handling, and performance monitoring
 */
export const supabase = {
  auth: {
    ...baseClient.auth,
    
    // Add logging and error handling to auth methods
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const startTime = performance.now()
      
      // Add a timeout for the auth call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        logger.debug('Auth: Signing in user', { component: 'auth', context: { email: credentials.email } })
        console.log('Auth: Starting sign in request');
        
        // Use our own fetch with timeout instead of the baseClient for more control
        const result = await baseClient.auth.signInWithPassword(credentials);
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        const duration = performance.now() - startTime
        logger.perf('Auth: Sign in', duration)
        console.log('Auth: Completed sign in request in', duration, 'ms');
        
        return result
      } catch (error) {
        // Clear the timeout to prevent any race conditions
        clearTimeout(timeoutId);
        
        const duration = performance.now() - startTime
        console.error('Auth: Sign in failed after', duration, 'ms', error);
        logger.error('Auth: Sign in failed', error as Error, { 
          component: 'auth',
          context: { email: credentials.email, duration }
        })
        
        throw error
      }
    },
    
    signUp: async (credentials: { email: string; password: string; options?: any }) => {
      const startTime = performance.now()
      try {
        logger.debug('Auth: Signing up user', { component: 'auth', context: { email: credentials.email } })
        const result = await baseClient.auth.signUp(credentials)
        const duration = performance.now() - startTime
        logger.perf('Auth: Sign up', duration)
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Sign up failed', error as Error, {
          component: 'auth',
          context: { email: credentials.email, duration }
        })
        throw error
      }
    },
    
    signOut: async () => {
      const startTime = performance.now()
      try {
        logger.debug('Auth: Signing out user', { component: 'auth' })
        const result = await baseClient.auth.signOut()
        const duration = performance.now() - startTime
        logger.perf('Auth: Sign out', duration)
        
        // Clear cache on signout
        clearCache()
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Sign out failed', error as Error, {
          component: 'auth',
          context: { duration }
        })
        throw error
      }
    },
    
    getUser: async () => {
      const startTime = performance.now()
      
      // For debugging performance
      const isSlowRequest = setTimeout(() => {
        console.warn('Auth: Get user request is taking longer than 5 seconds');
      }, 5000);
      
      try {
        logger.debug('Auth: Getting current user', { component: 'auth' })
        
        // First check if we have this user cached in localStorage to avoid waiting
        let cachedUser = null;
        try {
          const storedAuthStr = localStorage.getItem('supabase.auth.token');
          const storedAuth = storedAuthStr ? JSON.parse(storedAuthStr) : null;
          if (storedAuth?.user) {
            cachedUser = storedAuth.user;
            logger.debug('Auth: Using cached user from localStorage', { component: 'auth' });
          }
        } catch (e) {
          // Ignore errors reading from localStorage
        }
        
        // If we have a cached user, use it and fetch the updated user in the background
        if (cachedUser) {
          // Start the actual API request in the background
          baseClient.auth.getUser().then(result => {
            // Update localStorage if this succeeds
            if (result.data?.user) {
              // Cache the result for future use
              try {
                const storedAuthStr = localStorage.getItem('supabase.auth.token');
                const storedAuth = storedAuthStr ? JSON.parse(storedAuthStr) : {};
                storedAuth.user = result.data.user;
                localStorage.setItem('supabase.auth.token', JSON.stringify(storedAuth));
              } catch (e) {
                // Ignore localStorage errors
              }
            }
          }).catch(() => {
            // Ignore background fetch errors
          });
          
          // Clear the slow warning timer
          clearTimeout(isSlowRequest);
          
          const duration = performance.now() - startTime
          logger.perf('Auth: Get user (from cache)', duration)
          
          // Return the cached user immediately
          return { data: { user: cachedUser }, error: null };
        }
        
        // No cached user, have to wait for the API
        try {
          const result = await Promise.race([
            baseClient.auth.getUser(),
            // Add a timeout to prevent hanging
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Auth: Get user timed out after 8000ms')), 8000)
            )
          ]) as { data: any, error: any };
          
          // Clear the slow warning timer
          clearTimeout(isSlowRequest);
          
          // If we get an error that might be resolved by refreshing the session, try that
          if (result.error && 
             (result.error.message.includes('JWT') || 
              result.error.message.includes('token') || 
              result.error.message.includes('session'))) {
            
            logger.debug('Auth: JWT issue detected, attempting to refresh session', { component: 'auth' })
            await refreshSession()
            
            // Retry getting the user after refresh with a shorter timeout
            const retryResult = await Promise.race([
              baseClient.auth.getUser(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Auth: Retry get user timed out')), 5000)
              )
            ]) as { data: any, error: any };
            
            const duration = performance.now() - startTime
            logger.perf('Auth: Get user (with refresh)', duration)
            
            return retryResult
          }
          
          const duration = performance.now() - startTime
          logger.perf('Auth: Get user', duration)
          
          if (duration > 5000) {
            // This is a performance warning, not an error, so we use a different format
            console.warn(`[${new Date().toISOString()}] ERROR CRITICAL PERFORMANCE: Auth: Get user took ${duration.toFixed(1)}ms`);
          }
          
          return result
        } catch (e) {
          // Clear the slow warning timer
          clearTimeout(isSlowRequest);
          
          // If this is a timeout error, try to use the last known user as a fallback
          try {
            const storedAuthStr = localStorage.getItem('supabase.auth.token');
            const storedAuth = storedAuthStr ? JSON.parse(storedAuthStr) : null;
            if (storedAuth?.user) {
              logger.warn('Auth: Using cached user due to API timeout', { component: 'auth' });
              return { data: { user: storedAuth.user }, error: null };
            }
          } catch (err) {
            // Ignore localStorage errors
          }
          
          throw e;
        }
      } catch (error) {
        // Clear the slow warning timer
        clearTimeout(isSlowRequest);
        
        const duration = performance.now() - startTime
        logger.error('Auth: Get user failed', error as Error, {
          component: 'auth',
          context: { duration }
        })
        throw error
      }
    },
    
    getSession: async () => {
      const startTime = performance.now()
      try {
        logger.debug('Auth: Getting session', { component: 'auth' })
        const result = await baseClient.auth.getSession()
        const duration = performance.now() - startTime
        logger.perf('Auth: Get session', duration)
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Get session failed', error as Error, {
          component: 'auth',
          context: { duration }
        })
        throw error
      }
    }
  },
  
  /**
   * Optimized from() function with caching and performance monitoring
   */
  from: <T = any>(table: TableName) => {
    const selectQuery = <R = T>(options: {
      columns?: string
      cacheKey?: string
      bypassCache?: boolean
      timeout?: number
    } = {}) => {
      const { columns = '*', cacheKey, bypassCache = false, timeout = CACHE_TIMEOUT } = options
      
      return {
        /**
         * Execute the select query with optional caching
         */
        execute: async () => {
          const key = cacheKey || `${table}:${columns}:select:all`
          const startTime = performance.now()
          
          // Check cache first if not bypassing
          if (!bypassCache && queryCache.has(key)) {
            const cached = queryCache.get(key)
            if (cached && Date.now() - cached.timestamp < timeout) {
              logger.debug(`DB: Cache hit for ${key}`, { component: 'db' })
              return { data: cached.data, error: null }
            }
          }
          
          try {
            logger.db('select', table as string, { columns })
            const { data, error } = await baseClient.from(table).select(columns)
            const duration = performance.now() - startTime
            
            if (error) {
              logger.error(`DB: Error selecting from ${table}`, new Error(error.message), { 
                component: 'db',
                context: { table, columns, duration, error }
              })
              return { data: null, error }
            }
            
            // Log slow queries
            if (duration > performanceConfig.thresholds.slowQuery) {
              logger.warn(`SLOW QUERY: ${table}.select() took ${duration.toFixed(1)}ms`, { 
                component: 'db',
                context: { table, columns }
              })
            } else {
              logger.debug(`DB: ${table}.select() completed in ${duration.toFixed(1)}ms`, { component: 'db' })
            }
            
            // Cache the result
            queryCache.set(key, { data, timestamp: Date.now() })
            
            return { data, error: null }
          } catch (err) {
            const error = err as Error
            const duration = performance.now() - startTime
            
            logger.error(`DB: Exception selecting from ${table}`, error, { 
              component: 'db',
              context: { table, columns, duration }
            })
            
            return { data: null, error }
          }
        },
        
        /**
         * Add where clause to the query
         */
        eq: (column: string, value: any) => {
          const startTime = performance.now()
          const key = cacheKey || `${table}:${columns}:eq:${column}:${value}`
          
          // Check cache first if not bypassing
          if (!bypassCache && queryCache.has(key)) {
            const cached = queryCache.get(key)
            if (cached && Date.now() - cached.timestamp < timeout) {
              logger.debug(`DB: Cache hit for ${key}`, { component: 'db' })
              return { data: cached.data, error: null }
            }
          }
          
          return {
            /**
             * Execute the query with the eq filter
             */
            execute: async () => {
              try {
                logger.db('select', table as string, { columns, filter: { [column]: value } })
                const { data, error } = await baseClient.from(table).select(columns).eq(column, value)
                const duration = performance.now() - startTime
                
                if (error) {
                  logger.error(`DB: Error selecting from ${table} with filter`, new Error(error.message), { 
                    component: 'db',
                    context: { table, columns, filter: { [column]: value }, duration, error }
                  })
                  return { data: null, error }
                }
                
                // Log slow queries
                if (duration > performanceConfig.thresholds.slowQuery) {
                  logger.warn(`SLOW QUERY: ${table}.select().eq(${column}, ${value}) took ${duration.toFixed(1)}ms`, { 
                    component: 'db',
                    context: { table, columns, filter: { [column]: value } }
                  })
                } else {
                  logger.debug(`DB: ${table}.select().eq() completed in ${duration.toFixed(1)}ms`, { component: 'db' })
                }
                
                // Cache the result
                queryCache.set(key, { data, timestamp: Date.now() })
                
                return { data, error: null }
              } catch (err) {
                const error = err as Error
                const duration = performance.now() - startTime
                
                logger.error(`DB: Exception selecting from ${table} with filter`, error, { 
                  component: 'db',
                  context: { table, columns, filter: { [column]: value }, duration }
                })
                
                return { data: null, error }
              }
            }
          }
        }
      }
    }
    
    return {
      select: selectQuery,
      
      /**
       * Insert data into a table
       */
      insert: async (data: any) => {
        const startTime = performance.now()
        
        try {
          logger.db('insert', table as string, { count: Array.isArray(data) ? data.length : 1 })
          const result = await baseClient.from(table).insert(data)
          const duration = performance.now() - startTime
          
          if (result.error) {
            logger.error(`DB: Error inserting into ${table}`, new Error(result.error.message), { 
              component: 'db',
              context: { table, duration, error: result.error }
            })
          } else {
            logger.debug(`DB: ${table}.insert() completed in ${duration.toFixed(1)}ms`, { component: 'db' })
            
            // Clear relevant cache entries
            clearCache(`${table}:`)
          }
          
          return result
        } catch (err) {
          const error = err as Error
          const duration = performance.now() - startTime
          
          logger.error(`DB: Exception inserting into ${table}`, error, { 
            component: 'db',
            context: { table, duration }
          })
          
          return { data: null, error }
        }
      },
      
      /**
       * Update data in a table
       */
      update: async (data: any) => {
        const startTime = performance.now()
        
        try {
          logger.db('update', table as string, { data })
          const result = await baseClient.from(table).update(data)
          const duration = performance.now() - startTime
          
          if (result.error) {
            logger.error(`DB: Error updating ${table}`, new Error(result.error.message), { 
              component: 'db',
              context: { table, duration, error: result.error }
            })
          } else {
            logger.debug(`DB: ${table}.update() completed in ${duration.toFixed(1)}ms`, { component: 'db' })
            
            // Clear relevant cache entries
            clearCache(`${table}:`)
          }
          
          return result
        } catch (err) {
          const error = err as Error
          const duration = performance.now() - startTime
          
          logger.error(`DB: Exception updating ${table}`, error, { 
            component: 'db',
            context: { table, duration }
          })
          
          return { data: null, error }
        }
      },
      
      /**
       * Delete data from a table
       */
      delete: async () => {
        const startTime = performance.now()
        
        try {
          logger.db('delete', table as string)
          const result = await baseClient.from(table).delete()
          const duration = performance.now() - startTime
          
          if (result.error) {
            logger.error(`DB: Error deleting from ${table}`, new Error(result.error.message), { 
              component: 'db',
              context: { table, duration, error: result.error }
            })
          } else {
            logger.debug(`DB: ${table}.delete() completed in ${duration.toFixed(1)}ms`, { component: 'db' })
            
            // Clear relevant cache entries
            clearCache(`${table}:`)
          }
          
          return result
        } catch (err) {
          const error = err as Error
          const duration = performance.now() - startTime
          
          logger.error(`DB: Exception deleting from ${table}`, error, { 
            component: 'db',
            context: { table, duration }
          })
          
          return { data: null, error }
        }
      }
    }
  }
}

// Export the original client for functions not covered by the optimized client
export const originalClient = baseClient

// Default export for compatibility with existing code
export default supabase 