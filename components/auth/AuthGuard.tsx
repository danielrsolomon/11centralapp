'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-optimized'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'
import { refreshSession } from '@/lib/supabase-optimized'

interface AuthGuardProps {
  children: ReactNode
  requiredRoles?: string[]
  allowDevBypass?: boolean
  fallback?: ReactNode
}

export default function AuthGuard({
  children,
  requiredRoles = [],
  allowDevBypass = true,
  fallback = <div className="flex justify-center items-center h-64">
    <div className="w-8 h-8 border-t-2 border-b-2 border-[#AE9773] rounded-full animate-spin"></div>
  </div>
}: AuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const router = useRouter()
  
  // Performance monitoring
  const perf = usePerformanceMonitoring('AuthGuard')
  
  useEffect(() => {
    let isMounted = true
    const MAX_RETRIES = 2
    
    const checkAuth = async () => {
      perf.startTiming('checkAuth')
      
      try {
        // Only try session refresh if we have retries left to prevent infinite loops
        if (retryCount < MAX_RETRIES) {
          try {
            // Bypass session refresh on first load to prevent unnecessary API calls
            if (retryCount > 0) {
              await refreshSession()
            }
          } catch (refreshError) {
            logger.warn('Session refresh failed but continuing', { 
              component: 'AuthGuard',
              error: refreshError instanceof Error ? refreshError.message : String(refreshError)
            })
          }
        }
        
        // Always proceed with auth check even if refresh failed
        logger.debug('Checking auth permissions', { 
          component: 'AuthGuard',
          context: { requiredRoles, retryCount }
        })
        
        // Try to get current user directly
        let user = null
        let userError = null
        
        try {
          // Use a direct call with timeout protection
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          const userResponse = await fetch('/api/auth/user', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (userResponse.ok) {
            const userData = await userResponse.json()
            user = userData.user
          } else {
            // Fallback to Supabase direct call if API fails
            const { data } = await supabase.auth.getUser()
            user = data.user
          }
        } catch (getUserError) {
          userError = getUserError
          logger.warn('Error getting user through API, falling back to direct method', {
            component: 'AuthGuard'
          })
          
          // Final fallback attempt
          try {
            const { data } = await supabase.auth.getUser()
            user = data.user
          } catch (fallbackError) {
            // Keep the original error
          }
        }
        
        if (!user) {
          // In development mode, allow access even without a user
          if (allowDevBypass && process.env.NODE_ENV === 'development') {
            logger.debug('No user found but bypassing in development mode', { component: 'AuthGuard' })
            
            if (isMounted) {
              setIsAuthorized(true)
              setLoading(false)
              setAuthError(null)
            }
            return
          }
          
          logger.debug('No authenticated user, redirecting to login', { component: 'AuthGuard' })
          
          if (isMounted) {
            setAuthError('Please log in to access this page')
            setIsAuthorized(false)
            setLoading(false)
          }
          
          // Redirect to login
          setTimeout(() => {
            if (isMounted) router.push('/auth/login')
          }, 1500)
          
          return
        }
        
        // If no roles are required, we're authorized
        if (requiredRoles.length === 0) {
          if (isMounted) {
            setIsAuthorized(true)
            setLoading(false)
            setAuthError(null)
          }
          return
        }
        
        // Check user role
        let userData = null
        let roleError = null
        
        try {
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .limit(1)
            .single()
          
          if (error) throw error
          userData = data
        } catch (error) {
          roleError = error
          logger.error('Error checking role', error instanceof Error ? error : new Error(String(error)), { 
            component: 'AuthGuard' 
          })
        }
        
        // In development mode, allow access even with errors
        if ((roleError || !userData) && allowDevBypass && process.env.NODE_ENV === 'development') {
          logger.debug('Error checking role but bypassing in development mode', { component: 'AuthGuard' })
          
          if (isMounted) {
            setIsAuthorized(true)
            setLoading(false)
            setAuthError(null)
          }
          return
        }
        
        // Check if user has required role
        const hasRequiredRole = userData && requiredRoles.includes(userData.role)
        
        // Handle result
        if (hasRequiredRole) {
          logger.debug('User has required role', { 
            component: 'AuthGuard',
            context: { role: userData?.role }
          })
          
          if (isMounted) {
            setIsAuthorized(true)
            setLoading(false)
            setAuthError(null)
          }
        } else {
          // In development mode, allow access even without the right role
          if (allowDevBypass && process.env.NODE_ENV === 'development') {
            logger.debug('User lacks required role but bypassing in development mode', { 
              component: 'AuthGuard',
              context: { 
                requiredRoles,
                userRole: userData?.role || 'unknown' 
              }
            })
            
            if (isMounted) {
              setIsAuthorized(true)
              setLoading(false)
              setAuthError(null)
            }
            return
          }
          
          logger.warn('User lacks required role', { 
            component: 'AuthGuard',
            context: { 
              requiredRoles,
              userRole: userData?.role || 'unknown'
            }
          })
          
          if (isMounted) {
            setAuthError('You do not have permission to access this page')
            setIsAuthorized(false)
            setLoading(false)
          }
          
          // Redirect to dashboard
          setTimeout(() => {
            if (isMounted) router.push('/dashboard')
          }, 1500)
        }
      } catch (error) {
        // If we've maxed out retries, show an error
        if (retryCount >= MAX_RETRIES) {
          logger.error('Multiple auth check failures', error instanceof Error ? error : new Error(String(error)), { 
            component: 'AuthGuard',
            context: { retryCount }
          })
          
          // In development mode, allow access even with errors
          if (allowDevBypass && process.env.NODE_ENV === 'development') {
            logger.debug('Auth check failed but bypassing in development mode', { component: 'AuthGuard' })
            
            if (isMounted) {
              setIsAuthorized(true)
              setLoading(false)
              setAuthError(null)
            }
            return
          }
          
          if (isMounted) {
            setAuthError('Authentication error')
            setIsAuthorized(false)
            setLoading(false)
          }
          
          // Redirect to login on persistent errors
          setTimeout(() => {
            if (isMounted) router.push('/auth/login')
          }, 1500)
        } else {
          // Retry the auth check
          if (isMounted) {
            logger.warn(`Auth check failed, retrying (${retryCount + 1}/${MAX_RETRIES})`, { 
              component: 'AuthGuard' 
            })
            setRetryCount(prevCount => prevCount + 1)
          }
        }
      } finally {
        perf.endTiming('checkAuth')
      }
    }
    
    checkAuth()
    
    return () => {
      isMounted = false
    }
  }, [router, requiredRoles, allowDevBypass, perf, retryCount])
  
  if (loading) {
    return fallback
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">{authError || 'You do not have permission to access this page'}</p>
        <p className="text-sm text-gray-500">Redirecting you...</p>
      </div>
    )
  }
  
  return <>{children}</>
} 