'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-optimized'

/**
 * This component detects and tries to fix common authentication issues.
 * It should be included in the main layout to provide automatic recovery.
 */
export default function SessionErrorDetector() {
  const [hasError, setHasError] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const router = useRouter()
  
  // Set up an event listener for authentication errors
  useEffect(() => {
    let errorTimeoutId: NodeJS.Timeout | null = null
    let resetErrorCountTimer: NodeJS.Timeout | null = null
    
    // Function to handle auth errors
    const handleAuthError = (event: any) => {
      // Skip performance warnings, session redirects, and normal operations
      if (event.detail?.message && 
          typeof event.detail.message === 'string' && 
          (event.detail.message.includes('PERFORMANCE') ||
           event.detail.message.includes('Redirecting') ||
           event.detail.message.includes('No user') ||
           event.detail.message.includes('timeout'))) {
        return;
      }
      
      // Only handle actual auth errors, not normal operations
      if (event.detail?.type === 'auth' || 
         (event.detail?.message && typeof event.detail.message === 'string' &&
         (event.detail.message.includes('auth') || 
          event.detail.message.includes('session') ||
          event.detail.message.includes('token')))) {
        
        // Don't act on every error, wait until we get multiple errors
        setErrorCount(prev => {
          const newCount = prev + 1;
          
          // Only set hasError if we've seen multiple errors
          if (newCount >= 3) {
            setHasError(true);
          }
          
          return newCount;
        });
        
        // Clear any existing timeout
        if (errorTimeoutId) {
          clearTimeout(errorTimeoutId)
        }
        
        // Auto-dismiss the error after 10 seconds
        errorTimeoutId = setTimeout(() => {
          setHasError(false)
        }, 10000)
        
        // Start a timer to reset error count if no errors for 30 seconds
        if (resetErrorCountTimer) {
          clearTimeout(resetErrorCountTimer);
        }
        
        resetErrorCountTimer = setTimeout(() => {
          setErrorCount(0);
        }, 30000);
      }
    }
    
    // Add the event listener
    window.addEventListener('auth-error', handleAuthError)
    
    // Set up a listener for console errors and check for auth issues
    const originalConsoleError = console.error
    console.error = function(...args) {
      // Skip performance warnings as they aren't actual errors
      const errorString = args.map(arg => String(arg)).join(' ')
      
      // Don't trigger on common operational messages
      if (errorString.includes('PERFORMANCE') || 
          errorString.includes('timeout') ||
          errorString.includes('Redirecting')) {
        // Just log performance issues without triggering error handling
        originalConsoleError.apply(console, args)
        return;
      }
      
      // Check if the error is related to authentication
      if (errorString.includes('auth') || 
          errorString.includes('session') || 
          errorString.includes('token') || 
          errorString.includes('refresh')) {
        
        // Dispatch a custom event for auth errors - but filter out common operational messages
        if (!errorString.includes('getUser') && 
            !errorString.includes('localStorage') &&
            !errorString.includes('not defined')) {
          window.dispatchEvent(new CustomEvent('auth-error', { 
            detail: { 
              type: 'auth',
              message: errorString
            } 
          }))
        }
      }
      
      // Call the original console.error
      originalConsoleError.apply(console, args)
    }
    
    // Clean up
    return () => {
      window.removeEventListener('auth-error', handleAuthError)
      console.error = originalConsoleError
      
      if (errorTimeoutId) {
        clearTimeout(errorTimeoutId)
      }
      
      if (resetErrorCountTimer) {
        clearTimeout(resetErrorCountTimer)
      }
    }
  }, [])
  
  // Try to fix auth issues when they occur
  useEffect(() => {
    if (hasError && !isFixing && errorCount >= 3) {
      const fixAuthIssues = async () => {
        setIsFixing(true)
        
        try {
          // Sign out and clear local storage
          await supabase.auth.signOut()
          
          // Clear any stored auth data (only on client)
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('supabase.auth.token')
            } catch (e) {
              console.error('Error clearing auth token:', e)
            }
          }
          
          // Clear all cookies with 'sb-' prefix
          document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim()
            if (name.startsWith('sb-')) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
            }
          })
          
          // Redirect to login
          setTimeout(() => {
            router.push('/auth/login')
            router.refresh()
          }, 1000)
        } catch (error) {
          console.log('Error fixing auth issues:', error)
        } finally {
          setIsFixing(false)
        }
      }
      
      fixAuthIssues()
    }
  }, [hasError, isFixing, router, errorCount])
  
  // If the error count is too high, force a full refresh
  useEffect(() => {
    if (errorCount >= 10) {
      // Too many errors, force a full page reload
      window.location.href = '/auth/login'
    }
  }, [errorCount])
  
  if (!hasError) {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-xs animate-pulse">
      <h3 className="font-bold mb-1">Session Error Detected</h3>
      <p className="text-sm">We've detected an authentication problem. Attempting to fix it automatically...</p>
      {isFixing && (
        <div className="mt-2 flex justify-center">
          <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
} 