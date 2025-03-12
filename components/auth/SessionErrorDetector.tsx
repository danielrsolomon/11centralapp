'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'
import { isPermissionError } from '@/lib/auth/permission-utils'

/**
 * This component detects and tries to fix common authentication issues.
 * It should be included in the main layout to provide automatic recovery.
 */
export default function SessionErrorDetector() {
  const router = useRouter()
  const [sessionError, setSessionError] = useState<boolean>(false)
  const [errorCount, setErrorCount] = useState<number>(0)
  const [initialDelay, setInitialDelay] = useState<boolean>(true)
  
  useEffect(() => {
    // Wait for initial navigation/page loads to complete before monitoring
    const delayTimer = setTimeout(() => setInitialDelay(false), 3000)
    
    // Handle different types of errors
    const handleError = (event: ErrorEvent) => {
      if (initialDelay) return
      
      const errorObj = event.error
      const errorMsg = errorObj?.message || event.message || 'Unknown error'
      
      processError(errorObj, errorMsg)
    }
    
    // Handle promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (initialDelay) return
      
      const errorObj = event.reason
      const errorMsg = typeof errorObj === 'string' ? errorObj : 
                     errorObj?.message || 'Promise rejection'
      
      processError(errorObj, errorMsg)
    }
    
    // Common error processing logic
    const processError = (errorObj: any, errorMsg: string) => {
      // Skip hydration warnings
      if (typeof errorMsg === 'string' && (
        errorMsg.includes('Hydration failed') ||
        errorMsg.includes('Text content does not match') ||
        errorMsg.includes('Usage limit ') ||
        errorMsg.includes('You logged in somewhere else')
      )) {
        return
      }
      
      // Skip common network issues
      if (
        typeof errorMsg === 'string' && (
          errorMsg.includes('aborted') || 
          errorMsg.includes('canceled') ||
          errorMsg.includes('fetch failed') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('Network request failed') ||
          errorMsg.includes('Permission denied') ||
          errorMsg.toLowerCase().includes('permission')
        )
      ) {
        return
      }

      // Skip database column errors that aren't authentication issues
      if (
        typeof errorMsg === 'string' && (
          errorMsg.includes('column') || 
          errorMsg.includes('does not exist') ||
          errorMsg.includes('42703') ||
          errorMsg.includes('column not found') ||
          errorMsg.includes('undefined column')
        )
      ) {
        logger.warn('Ignoring database column error, not a session issue', { error: errorMsg })
        return
      }

      // Skip if the error is specifically a permission error (not an auth error)
      if (errorObj && isPermissionError(errorObj)) {
        logger.debug('Ignoring permission error, not a session issue', { 
          error: errorMsg,
          name: errorObj.name 
        })
        return
      }
      
      // Check for 403 status which might be a permission error, not an auth issue
      if (errorObj?.status === 403 || errorObj?.statusCode === 403) {
        // If the error has a requiresAuth flag set to false, it's a permission error, not auth
        if (errorObj.requiresAuth === false) {
          logger.debug('Ignoring 403 with requiresAuth=false flag', { error: errorMsg })
          return
        }
        
        // If the error message mentions permissions, it's likely not an auth issue
        if (errorMsg.toLowerCase().includes('permission')) {
          logger.debug('Ignoring 403 with permission message', { error: errorMsg })
          return
        }
      }

      // Skip 500 errors from the /api/auth/me endpoint, as these are likely database issues
      // not authentication problems
      if (
        (errorObj?.status === 500 || errorObj?.statusCode === 500) &&
        typeof errorMsg === 'string' && (
          errorMsg.includes('/api/auth/me') ||
          errorMsg.includes('user profile')
        )
      ) {
        logger.warn('Ignoring 500 error from auth/me endpoint, likely not a session issue', {
          error: errorMsg
        })
        return
      }
      
      // Process auth-related errors that might indicate session problems
      if (
        // Standard auth error messages
        (typeof errorMsg === 'string' && (
          errorMsg.includes('not authenticated') ||
          errorMsg.includes('not authorized') ||
          errorMsg.includes('token is invalid') ||
          errorMsg.includes('Invalid JWT') ||
          errorMsg.includes('JWT expired') ||
          errorMsg.includes('session expired') ||
          errorMsg.includes('Unauthorized')
        )) ||
        // Or HTTP 401 status codes
        errorObj?.status === 401 ||
        errorObj?.statusCode === 401
      ) {
        logger.warn('Auth error detected, may require sign-in', { error: errorMsg })
        
        // Count errors to prevent immediate redirect on transient issues
        setErrorCount(prevCount => prevCount + 1)
        
        // Multiple auth errors likely means session is invalid
        if (errorCount >= 2) {
          setSessionError(true)
        }
      }
    }

    // Listeners for different error types
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    
    return () => {
      clearTimeout(delayTimer)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [initialDelay, errorCount, router])

  // Redirect to auth page if session errors are detected
  useEffect(() => {
    if (sessionError) {
      const handleSessionError = async () => {
        // Create a temporary Supabase client for sign-out
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )
        
        try {
          // Log out before redirecting
          logger.warn('Session appears invalid, signing out user')
          await supabase.auth.signOut()
          
          // Clear any stored auth state or cookies
          localStorage.removeItem('supabase.auth.token')
          document.cookie = 'supabase-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          
          // Redirect to sign-in page
          router.push('/auth/signin')
        } catch (error) {
          logger.error('Error handling session issue', error as Error)
          // Force hard refresh after error
          window.location.href = '/auth/signin'
        }
      }
      
      handleSessionError()
    }
  }, [sessionError, router])

  // Render nothing - this is just a monitoring component
  return sessionError ? (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-md text-center animate-fade-in">
        <h3 className="font-bold mb-1">Session Error Detected</h3>
        <p className="text-gray-600 mb-4">
          Your session appears to have expired or become invalid.
          Redirecting you to sign in...
        </p>
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto"></div>
      </div>
    </div>
  ) : null
} 