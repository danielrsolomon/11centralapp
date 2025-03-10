'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

// Debug utility function
function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  console.log(`[${timestamp}] 🔍 ${message}`, data !== undefined ? data : '');
  
  // Also append to a debug element in the UI if possible
  const debugElement = document.getElementById('auth-debug-output');
  if (debugElement) {
    const entry = document.createElement('div');
    entry.innerHTML = `
      <div style="border-bottom: 1px solid #444; padding: 8px 0;">
        <span style="color: #888; font-size: 12px;">[${timestamp}]</span>
        <span style="color: #eee;">${message}</span>
        ${data !== undefined ? `<pre style="margin: 4px 0 0 20px; color: #aaa; font-size: 12px; overflow-x: auto;">${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}</pre>` : ''}
      </div>
    `;
    debugElement.prepend(entry);
  }
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()
  
  // Check Supabase config on mount
  useEffect(() => {
    logDebug('Login form mounted');
    
    // Check if Supabase env vars are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logDebug('Supabase configuration missing:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
    } else {
      logDebug('Supabase configuration found', {
        url: supabaseUrl.substring(0, 15) + '...',
        keyLength: supabaseKey.length
      });
    }
    
    // Remove any overlays
    const overlays = document.querySelectorAll('div[class*="fixed"][class*="inset-0"][class*="z-"]');
    if (overlays.length > 0) {
      logDebug('Found and removing overlays:', overlays.length);
      overlays.forEach(overlay => overlay.remove());
    }
    
    // Test network connectivity to Supabase
    logDebug('Testing connectivity to Supabase...');
    const startConnTime = Date.now();
    fetch(process.env.NEXT_PUBLIC_SUPABASE_URL || '', { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Add a 10-second timeout
      signal: AbortSignal.timeout(10000)
    })
      .then(response => {
        const duration = Date.now() - startConnTime;
        logDebug(`Supabase connectivity test complete in ${duration}ms:`, { 
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });
      })
      .catch(err => {
        const duration = Date.now() - startConnTime;
        logDebug(`Supabase connectivity test failed after ${duration}ms:`, {
          error: err.message,
          name: err.name,
          type: err instanceof Error ? err.constructor.name : typeof err
        });
      });
    
    // Test the actual authentication API
    logDebug('Testing Supabase authentication API...');
    const startAuthTime = Date.now();
    try {
      const testSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      // Just verify the session is reachable
      testSupabase.auth.getSession()
        .then(result => {
          const duration = Date.now() - startAuthTime;
          logDebug(`Auth API test complete in ${duration}ms:`, {
            hasError: !!result.error,
            errorMessage: result.error?.message,
            hasSession: !!result.data?.session
          });
        })
        .catch(err => {
          const duration = Date.now() - startAuthTime;
          logDebug(`Auth API test failed after ${duration}ms:`, {
            error: err.message,
            name: err.name
          });
        });
    } catch (err) {
      const duration = Date.now() - startAuthTime;
      logDebug(`Failed to initialize Supabase client after ${duration}ms:`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    logDebug('Form submitted with:', { email, password: '******' });
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Create a timeout to prevent the login from hanging indefinitely
    const timeoutId = setTimeout(() => {
      logDebug('Login request timed out after 15 seconds');
      setError('Login request timed out. Please try again.');
      setIsLoading(false);
    }, 15000);
    
    try {
      // Get the Supabase URL and key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }
      
      logDebug('Starting direct fetch to Supabase auth API');
      
      // Make a direct fetch call to the Supabase Auth API endpoint
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          email,
          password,
        }),
        // 10-second timeout
        signal: AbortSignal.timeout(10000)
      });
      
      logDebug('Auth API direct fetch response:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok
      });
      
      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}));
        logDebug('Auth API error response:', errorData);
        throw new Error(errorData.error_description || errorData.error || 'Authentication failed');
      }
      
      const authData = await authResponse.json();
      logDebug('Auth API success response:', {
        hasAccessToken: !!authData.access_token,
        hasUser: !!authData.user
      });
      
      if (!authData.access_token) {
        throw new Error('No access token returned');
      }
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      logDebug('Login successful - redirecting to dashboard');
      
      // Store the token in a way the middleware can detect
      // Use proper Supabase cookie format for server-side detection
      const supabaseCookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;

      // Calculate expiration time based on response
      const expiresIn = 3600; // Default to 1 hour
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

      // Create the auth object with proper user data
      const authObject = {
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_at: expiresAt,
        expires_in: expiresIn,
        user: authData.user, // Include full user data
        token_type: 'bearer'
      };

      // Store the full auth object with user data
      document.cookie = `${supabaseCookieName}=${JSON.stringify(authObject)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      // Log cookie info for debugging
      logDebug('Set auth cookie with name:', supabaseCookieName);
      logDebug('Auth object contains user data:', !!authData.user);

      // Also initialize a global auth state for the client
      window.localStorage.setItem(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-state`, JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_at: expiresAt,
        user: authData.user
      }));
      
      // Wait a moment then redirect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use window.location for a full page refresh
      window.location.href = '/dashboard';
    } catch (err) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logDebug('Authentication process failed', {
        message: errorMessage,
        type: err instanceof Error ? err.constructor.name : typeof err,
        name: err instanceof Error ? err.name : 'Unknown'
      });
      
      // Check for specific error types
      if (err instanceof TypeError) {
        setError('Network error: Could not connect to authentication service');
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Connection timed out. Please check your network and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle debug panel visibility
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Sign In</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            disabled={isLoading}
            autoComplete="email"
            style={{ pointerEvents: 'auto' }}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            disabled={isLoading}
            autoComplete="current-password"
            style={{ pointerEvents: 'auto' }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 rounded-md text-white font-medium transition-colors disabled:opacity-50"
          style={{ pointerEvents: 'auto' }}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleDebug}
            className="text-xs text-gray-500 hover:text-gray-400 underline"
          >
            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </div>
      </form>
      
      {showDebug && (
        <div className="mt-6 border border-gray-700 rounded-md p-3 bg-gray-900">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Debug Information</h3>
          <div id="auth-debug-output" className="text-xs text-gray-500 max-h-64 overflow-y-auto">
            {/* Debug output will be inserted here */}
          </div>
        </div>
      )}
    </div>
  )
} 