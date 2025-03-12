import { createMiddlewareClient } from './lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasAdminRole } from '@/lib/auth/permission-utils'

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

    // Use our consolidated middleware client
    const supabase = createMiddlewareClient(request, response)

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
        userId: userData.user.id
      })
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Check for superadmin role if accessing protected routes
    if (userData.user && request.nextUrl.pathname.startsWith('/admin')) {
      // Get user profile to check for superadmin role
      // Note: Don't select preferences as it's in a separate table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, role, is_admin')
        .eq('id', userData.user.id)
        .single()
      
      if (profileError) {
        log('error', 'Error fetching user profile for permission check', { error: profileError.message })
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      // Check if user is superadmin using our permission utility
      // This ensures case-insensitive role checking and supports both is_admin flag
      // and 'superadmin' role value
      const isSuperAdmin = hasAdminRole(userProfile)
      
      // If not superadmin, redirect to dashboard
      if (!isSuperAdmin) {
        log('warn', 'Unauthorized access attempt to admin route', { 
          userId: userData.user.id,
          role: userProfile?.role,
          is_admin: userProfile?.is_admin,
          path: request.nextUrl.pathname
        })
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      log('info', 'Superadmin access granted', {
        userId: userData.user.id,
        role: userProfile?.role,
        path: request.nextUrl.pathname
      })
    }
    
    // Allow authenticated users to access protected routes
    if (userData.user) {
      log('info', 'User authenticated, allowing access to', { 
        path: request.nextUrl.pathname,
        userId: userData.user.id
      })
    }
    
    // Add custom headers
    const responseHeaders = new Headers(response.headers)
    responseHeaders.set('x-middleware-processed', 'true')
    responseHeaders.set('x-processing-time', `${Date.now() - startTime}ms`)
    
    // Create a new response with our headers
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
      headers: responseHeaders,
    })
  } catch (error) {
    // Log the error
    const errorMessage = error instanceof Error ? error.message : String(error)
    log('error', `Middleware exception: ${errorMessage}`)
    
    // Handle the exception by allowing the request to proceed
    // But redirect to login if it's a protected route
    if (!request.nextUrl.pathname.startsWith('/auth')) {
      log('info', 'Redirecting to login after middleware error')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    return NextResponse.next()
  } finally {
    // Log the total processing time
    const duration = Date.now() - startTime
    log('info', `Middleware completed in ${duration}ms`)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 