/**
 * Central Supabase Client for Client-Side Use
 * 
 * This file provides a unified client-side Supabase client implementation with:
 * - Performance optimization through caching
 * - Error handling and logging
 * - Type safety using the Database type definition
 * 
 * This should be imported in all client-side components that need to access Supabase.
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/supabase'
import logger from './logger'

// Cache timeout configuration (in milliseconds)
const CACHE_TIMEOUT = 30000 // 30 seconds

// Simple in-memory cache for query results
const queryCache = new Map<string, { data: any; timestamp: number }>()

// Type for table names from database schema
type TableName = keyof Database['public']['Tables']

/**
 * Helper function to clear cache entries that match a prefix
 */
function clearCache(prefix: string) {
  // Find keys that start with the given prefix
  const keysToDelete: string[] = []
  queryCache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key)
    }
  })
  
  // Delete matched keys
  keysToDelete.forEach(key => queryCache.delete(key))
  logger.debug(`Cache cleared with prefix: ${prefix}`, { component: 'db', keysDeleted: keysToDelete.length })
}

// Create the base Supabase client
const baseClient = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Enhanced Supabase client with caching, error handling, and performance monitoring
 */
export const supabase = {
  /**
   * Authentication methods
   */
  auth: {
    /**
     * Get the current user session
     */
    getSession: async () => {
      const startTime = performance.now()
      
      try {
        logger.debug('Auth: Getting session')
        const result = await baseClient.auth.getSession()
        const duration = performance.now() - startTime
        logger.perf('Auth: Get session', duration)
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Error getting session', error as Error, { 
          component: 'auth',
          context: { duration }
        })
        
        return { data: { session: null }, error }
      }
    },
    
    /**
     * Get the current user
     */
    getUser: async () => {
      const startTime = performance.now()
      
      try {
        // Try to get user from localStorage cache first for better performance
        let cachedUser = null
        try {
          const storedAuthStr = localStorage.getItem('supabase.auth.token')
          if (storedAuthStr) {
            const storedAuth = JSON.parse(storedAuthStr)
            cachedUser = storedAuth.user || null
          }
        } catch (e) {
          // Ignore localStorage errors
        }
        
        // If we have a cached user, use it and fetch the updated user in the background
        if (cachedUser) {
          // Start the actual API request in the background
          baseClient.auth.getUser().then(result => {
            // Update localStorage if this succeeds
            if (result.data?.user) {
              // Cache the result for future use
              try {
                const storedAuthStr = localStorage.getItem('supabase.auth.token')
                const storedAuth = storedAuthStr ? JSON.parse(storedAuthStr) : {}
                storedAuth.user = result.data.user
                localStorage.setItem('supabase.auth.token', JSON.stringify(storedAuth))
              } catch (e) {
                // Ignore localStorage errors
              }
            }
          }).catch(() => {
            // Ignore background fetch errors
          })
          
          const duration = performance.now() - startTime
          logger.perf('Auth: Get user (from cache)', duration)
          
          // Return the cached user immediately
          return { data: { user: cachedUser }, error: null }
        }
        
        // No cache or cache miss, fetch from API
        logger.debug('Auth: Getting user')
        const result = await baseClient.auth.getUser()
        const duration = performance.now() - startTime
        logger.perf('Auth: Get user', duration)
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Error getting user', error as Error, { 
          component: 'auth',
          context: { duration }
        })
        
        return { data: { user: null }, error }
      }
    },
    
    /**
     * Sign in with email and password
     */
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const startTime = performance.now()
      
      try {
        logger.debug('Auth: Signing in user', { component: 'auth', context: { email: credentials.email } })
        
        const result = await baseClient.auth.signInWithPassword(credentials)
        
        const duration = performance.now() - startTime
        logger.perf('Auth: Sign in', duration)
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Sign in failed', error as Error, { 
          component: 'auth',
          context: { email: credentials.email, duration }
        })
        
        throw error
      }
    },
    
    /**
     * Sign up with email and password
     */
    signUp: async (credentials: { email: string; password: string; options?: { data?: any } }) => {
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
    
    /**
     * Sign out the current user
     */
    signOut: async () => {
      const startTime = performance.now()
      
      try {
        logger.debug('Auth: Signing out user')
        
        const result = await baseClient.auth.signOut()
        
        const duration = performance.now() - startTime
        logger.perf('Auth: Sign out', duration)
        
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
    
    /**
     * Reset password for a user
     */
    resetPasswordForEmail: async (email: string) => {
      const startTime = performance.now()
      
      try {
        logger.debug('Auth: Resetting password', { component: 'auth', context: { email } })
        
        const result = await baseClient.auth.resetPasswordForEmail(email)
        
        const duration = performance.now() - startTime
        logger.perf('Auth: Reset password', duration)
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error('Auth: Reset password failed', error as Error, { 
          component: 'auth',
          context: { email, duration }
        })
        
        throw error
      }
    }
  },
  
  /**
   * Storage methods
   */
  storage: {
    /**
     * Get a reference to a storage bucket
     */
    from: (bucket: string) => {
      return {
        /**
         * Upload a file to storage
         */
        upload: async (path: string, fileBody: File | Blob | ArrayBuffer | string, options?: {
          upsert?: boolean;
          contentType?: string;
        }) => {
          const startTime = performance.now();
          
          try {
            logger.debug('Storage: Uploading file', { component: 'storage', context: { bucket, path, contentType: options?.contentType } });
            
            const result = await baseClient.storage.from(bucket).upload(path, fileBody, options);
            
            const duration = performance.now() - startTime;
            logger.perf('Storage: Upload file', duration);
            
            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            logger.error('Storage: Upload failed', error as Error, { 
              component: 'storage',
              context: { bucket, path, duration }
            });
            
            return { data: null, error };
          }
        },
        
        /**
         * Remove files from storage
         */
        remove: async (paths: string[]) => {
          const startTime = performance.now();
          
          try {
            logger.debug('Storage: Removing files', { component: 'storage', context: { bucket, paths } });
            
            const result = await baseClient.storage.from(bucket).remove(paths);
            
            const duration = performance.now() - startTime;
            logger.perf('Storage: Remove files', duration);
            
            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            logger.error('Storage: Remove failed', error as Error, { 
              component: 'storage',
              context: { bucket, paths, duration }
            });
            
            return { data: null, error };
          }
        },
        
        /**
         * Get public URL for a file
         */
        getPublicUrl: (path: string) => {
          try {
            logger.debug('Storage: Getting public URL', { component: 'storage', context: { bucket, path } });
            
            const result = baseClient.storage.from(bucket).getPublicUrl(path);
            
            return result;
          } catch (error) {
            logger.error('Storage: Get public URL failed', error as Error, { 
              component: 'storage',
              context: { bucket, path }
            });
            
            return { data: { publicUrl: '' }, error };
          }
        }
      };
    }
  },
  
  /**
   * Database query operations
   */
  from: <T = any>(table: TableName) => {
    /**
     * Select query builder with caching
     */
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
            logger.debug('Running select query', { component: 'db', table: table as string, columns })
            const { data, error } = await baseClient.from(table).select(columns)
            const duration = performance.now() - startTime
            
            if (error) {
              logger.error(`DB: Error selecting from ${table}`, new Error(error.message), { 
                component: 'db',
                context: { table, columns, duration, error }
              })
              return { data: null, error }
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
                logger.debug('Running filtered query', { 
                  component: 'db', 
                  table: table as string, 
                  columns, 
                  filter: { [column]: value } 
                })
                const { data, error } = await baseClient.from(table).select(columns).eq(column, value)
                const duration = performance.now() - startTime
                
                if (error) {
                  logger.error(`DB: Error selecting from ${table} with filter`, new Error(error.message), { 
                    component: 'db',
                    context: { table, columns, filter: { [column]: value }, duration, error }
                  })
                  return { data: null, error }
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
          logger.debug('Running insert operation', { 
            component: 'db', 
            table: table as string, 
            count: Array.isArray(data) ? data.length : 1 
          })
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
          logger.debug('Running update operation', { component: 'db', table: table as string })
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
          logger.debug('Running delete operation', { component: 'db', table: table as string })
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

/**
 * Helper to get current user with roles
 */
export async function getCurrentUserWithRoles() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Get user's roles - using the raw client to bypass type issues
  const { data, error } = await baseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    
  if (error) {
    logger.error('Error fetching user roles', error, { component: 'auth', userId: user.id })
    return { ...user, roles: [] }
  }
    
  return {
    ...user,
    roles: data?.map(r => r.role) || []
  }
}

/**
 * Shorthand method to create a Supabase client
 * This function is kept for backward compatibility with existing components
 */
export function createClient() {
  return baseClient
}

/**
 * Default export for the enhanced client
 */
export default supabase 