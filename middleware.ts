import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define logging function since we can't import modules in middleware
function log(level: 'info' | 'error' | 'warn', message: string, details?: any) {
  if (process.env.NODE_ENV === 'development') {
    console[level](`[Middleware] ${message}`, details || '')
  }
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Skip middleware for static assets
    if (request.nextUrl.pathname.includes('/static/') ||
        request.nextUrl.pathname.includes('/favicon.ico') ||
        request.nextUrl.pathname.endsWith('.js') ||
        request.nextUrl.pathname.endsWith('.map')) {
      return NextResponse.next();
    }
    
    log('info', `Processing request to ${request.nextUrl.pathname}`)
    
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      log('error', 'Error getting user', { error: userError.message })
      // Continue to login page if there's an error getting the user
      if (!request.nextUrl.pathname.startsWith('/auth')) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
      return response
    }

    // If the user is not signed in and the current path is not /auth/*, redirect to /auth/login
    if (!userData.user && !request.nextUrl.pathname.startsWith('/auth')) {
      log('info', 'Redirecting unauthenticated user to login', { 
        from: request.nextUrl.pathname 
      })
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // If the user is signed in and the current path is /auth/*, redirect to /dashboard
    if (userData.user && request.nextUrl.pathname.startsWith('/auth')) {
      log('info', 'Redirecting authenticated user to dashboard', { 
        from: request.nextUrl.pathname,
        userId: userData.user.id || 'unknown'
      })
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const duration = Date.now() - startTime
    if (duration > 200) {
      log('warn', `Slow middleware execution: ${duration}ms`, {
        path: request.nextUrl.pathname
      })
    }
    
    return response
  } catch (err) {
    // Log the error and redirect to login on any unexpected error
    log('error', 'Middleware exception', { 
      error: err instanceof Error ? err.message : String(err),
      path: request.nextUrl.pathname
    })
    
    if (!request.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 