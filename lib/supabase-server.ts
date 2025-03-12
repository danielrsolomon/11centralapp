/**
 * Central Supabase Client for Server-Side Use
 * 
 * This file provides the Supabase client implementation optimized for server-side operations:
 * - Used in API routes, middleware, and server components
 * - Type safety using the Database type definition
 * - Better error handling for server environments
 * 
 * This should be imported in all server-side components that need to access Supabase.
 */

import { createClient as createClientBase } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../types/supabase'

/**
 * Create a server-side Supabase client using the service role key
 * CAUTION: This bypasses RLS policies and should only be used in trusted server contexts
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials for service client')
    throw new Error('Supabase service client configuration missing')
  }
  
  return createClientBase<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Create a standard server-side Supabase client using the anon key
 * This respects RLS policies and should be used for most server-side operations
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials for server client')
    throw new Error('Supabase client configuration missing')
  }
  
  return createClientBase<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Create a Supabase client for use in route handlers (API routes)
 * @returns Supabase client configured with cookie handling for the request
 */
export async function createRouteHandlerClient() {
  // In Next.js 15, cookies() is now an async function
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle next.js dynamic route cookie setting error
            console.warn('Unable to set cookie in route handler', error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.warn('Unable to remove cookie in route handler', error)
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase client for use in middleware
 * @param {Request} request - The incoming request
 * @param {Response} response - The response object
 * @returns Supabase client configured with cookie handling for middleware
 */
export function createMiddlewareClient(request: Request, response: Response) {
  let pendingCookies: Array<{
    name: string;
    value: string;
    options: any;
  }> = []
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = new Map(
            request.headers.get('cookie')?.split(';').map(c => {
              const [key, ...rest] = c.trim().split('=')
              return [key, rest.join('=')]
            }) || []
          )
          const cookie = cookies.get(name)
          return cookie
        },
        set(name: string, value: string, options: any) {
          pendingCookies.push({ name, value, options })
          
          // Update the request header for subsequent middleware
          const responseHeaders = new Headers(response.headers)
          responseHeaders.set(
            'Set-Cookie',
            `${name}=${value}; Path=${options?.path || '/'}; ${
              options?.httpOnly ? 'HttpOnly;' : ''
            } ${options?.secure ? 'Secure;' : ''} ${
              options?.expires ? `Expires=${options.expires.toUTCString()};` : ''
            }`
          )
          
          response = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          })
        },
        remove(name: string, options: any) {
          pendingCookies.push({
            name,
            value: '',
            options: { ...options, maxAge: 0 },
          })
          
          // Update the response for subsequent middleware
          const responseHeaders = new Headers(response.headers)
          responseHeaders.set(
            'Set-Cookie',
            `${name}=; Path=${options?.path || '/'}; Max-Age=0;`
          )
          
          response = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          })
        },
      },
    }
  )
}

/**
 * Default export for the standard server client
 */
export default createClient 