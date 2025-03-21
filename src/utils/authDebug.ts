/**
 * Auth Debugging Utilities
 * 
 * This file contains utilities to help debug authentication issues.
 * It can be used during development to inspect auth tokens and session state.
 */

export interface AuthDebugInfo {
  hasAuthSession: boolean;
  hasSupabaseSession: boolean;
  authTokenValid: boolean;
  tokenFirstChars?: string;
  tokenExpiration?: string;
  errorMessage?: string;
}

/**
 * Get debug information about the current authentication state
 */
export function getAuthDebugInfo(): AuthDebugInfo {
  try {
    const hasAuthSession = localStorage.getItem('authSession') !== null;
    const hasSupabaseSession = localStorage.getItem('supabase.auth.token') !== null;
    
    // Extract token from storage
    let authToken: string | null = null;
    let tokenExpiration: number | null = null;
    
    // First try our custom authSession
    if (hasAuthSession) {
      try {
        const sessionData = JSON.parse(localStorage.getItem('authSession') || '{}');
        authToken = sessionData.access_token || null;
        tokenExpiration = sessionData.expires_at || null;
      } catch (e) {
        console.error('Error parsing authSession:', e);
      }
    }
    
    // Then try Supabase session
    if (!authToken && hasSupabaseSession) {
      try {
        const sessionData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
        if (sessionData.currentSession?.access_token) {
          authToken = sessionData.currentSession.access_token;
          tokenExpiration = sessionData.currentSession.expires_at || null;
        }
      } catch (e) {
        console.error('Error parsing supabase session:', e);
      }
    }
    
    // Check if token looks valid
    const authTokenValid = !!authToken && typeof authToken === 'string' && authToken.split('.').length === 3;
    
    return {
      hasAuthSession,
      hasSupabaseSession,
      authTokenValid,
      tokenFirstChars: authToken ? `${authToken.substring(0, 10)}...` : undefined,
      tokenExpiration: tokenExpiration ? new Date(tokenExpiration * 1000).toISOString() : undefined
    };
  } catch (error) {
    return {
      hasAuthSession: false,
      hasSupabaseSession: false,
      authTokenValid: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error checking auth state'
    };
  }
}

/**
 * Debug function to test API authentication with the current token
 */
export async function testApiAuthentication(): Promise<{
  success: boolean;
  status?: number;
  message: string;
  endpoint: string;
  responseData?: any;
}> {
  try {
    // Get auth token
    let authToken: string | null = null;
    
    // Try custom authSession first
    try {
      const sessionData = JSON.parse(localStorage.getItem('authSession') || '{}');
      authToken = sessionData.access_token || null;
    } catch (e) {
      console.error('Error parsing authSession:', e);
    }
    
    // Fall back to Supabase session
    if (!authToken) {
      try {
        const sessionData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
        authToken = sessionData.currentSession?.access_token || null;
      } catch (e) {
        console.error('Error parsing supabase session:', e);
      }
    }
    
    if (!authToken) {
      return {
        success: false,
        message: 'No authentication token found in storage',
        endpoint: '/api/university'
      };
    }
    
    const endpoint = '/api/university';
    
    // Make test request with explicit token
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    // Parse response
    const responseData = await response.json().catch(() => null);
    
    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Successfully authenticated' : `Failed with status ${response.status}`,
      endpoint,
      responseData
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error testing authentication',
      endpoint: '/api/university'
    };
  }
}

/**
 * Try to fix common authentication issues
 * Returns a status object with the actions taken
 */
export async function fixAuthenticationIssues(): Promise<{
  success: boolean;
  actionsPerformed: string[];
  message: string;
}> {
  const actionsPerformed: string[] = [];
  let success = false;
  let message = 'No fixes were needed or possible';
  
  try {
    const debugInfo = getAuthDebugInfo();
    
    // Case 1: Token is present but invalid
    if ((debugInfo.hasAuthSession || debugInfo.hasSupabaseSession) && !debugInfo.authTokenValid) {
      actionsPerformed.push('Detected invalid token');
      
      // Clear all auth data to force re-login
      try {
        // Auth session
        if (debugInfo.hasAuthSession) {
          localStorage.removeItem('authSession');
          actionsPerformed.push('Removed invalid authSession');
        }
        
        // Supabase session
        if (debugInfo.hasSupabaseSession) {
          localStorage.removeItem('supabase.auth.token');
          actionsPerformed.push('Removed invalid supabase.auth.token');
        }
        
        // Clear other possible auth-related items
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('supabase')
        );
        
        for (const key of authKeys) {
          localStorage.removeItem(key);
          actionsPerformed.push(`Removed ${key}`);
        }
        
        success = true;
        message = 'Invalid authentication data cleared. Please log in again.';
      } catch (e) {
        actionsPerformed.push(`Error clearing tokens: ${e instanceof Error ? e.message : String(e)}`);
        message = 'Error clearing invalid tokens';
      }
    }
    // Case 2: No token present
    else if (!debugInfo.hasAuthSession && !debugInfo.hasSupabaseSession) {
      actionsPerformed.push('No authentication data found');
      message = 'No authentication data found. Please log in.';
      // Nothing to fix here, just need to login
    }
    // Case 3: Token present and valid but API requests are failing
    else if (debugInfo.authTokenValid) {
      actionsPerformed.push('Token appears valid, testing API connection');
      
      // Test API connection
      const testResult = await testApiAuthentication();
      
      if (testResult.success) {
        actionsPerformed.push('API connection successful with current token');
        success = true;
        message = 'Authentication is working correctly';
      } else {
        actionsPerformed.push(`API test failed: ${testResult.message}`);
        
        // If we get a 401/403, clear the token as it's invalid server-side
        if (testResult.status === 401 || testResult.status === 403) {
          try {
            if (debugInfo.hasAuthSession) {
              localStorage.removeItem('authSession');
              actionsPerformed.push('Removed rejected authSession');
            }
            
            if (debugInfo.hasSupabaseSession) {
              localStorage.removeItem('supabase.auth.token');
              actionsPerformed.push('Removed rejected supabase.auth.token');
            }
            
            success = true;
            message = 'Cleared rejected authentication data. Please log in again.';
          } catch (e) {
            actionsPerformed.push(`Error clearing tokens: ${e instanceof Error ? e.message : String(e)}`);
            message = 'Error clearing rejected tokens';
          }
        } else {
          message = `API authentication test failed with status ${testResult.status}`;
        }
      }
    }
    
    return { success, actionsPerformed, message };
  } catch (error) {
    return { 
      success: false, 
      actionsPerformed: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      message: 'Error attempting to fix authentication issues'
    };
  }
}

/**
 * Add a debug panel to the page for auth troubleshooting
 */
export function addAuthDebugPanel(): void {
  if (typeof document === 'undefined') return;
  
  const debugInfo = getAuthDebugInfo();
  
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '10px';
  panel.style.right = '10px';
  panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  panel.style.color = 'white';
  panel.style.padding = '10px';
  panel.style.borderRadius = '5px';
  panel.style.fontSize = '12px';
  panel.style.fontFamily = 'monospace';
  panel.style.zIndex = '9999';
  panel.style.maxWidth = '400px';
  
  panel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">Auth Debug</div>
    <div>Auth Session: ${debugInfo.hasAuthSession ? '✅' : '❌'}</div>
    <div>Supabase Session: ${debugInfo.hasSupabaseSession ? '✅' : '❌'}</div>
    <div>Valid Token: ${debugInfo.authTokenValid ? '✅' : '❌'}</div>
    ${debugInfo.tokenFirstChars ? `<div>Token: ${debugInfo.tokenFirstChars}</div>` : ''}
    ${debugInfo.tokenExpiration ? `<div>Expires: ${debugInfo.tokenExpiration}</div>` : ''}
    ${debugInfo.errorMessage ? `<div>Error: ${debugInfo.errorMessage}</div>` : ''}
    <div style="display: flex; gap: 4px; margin-top: 8px;">
      <button id="auth-test-btn" style="padding: 4px 8px; flex: 1;">Test API</button>
      <button id="auth-fix-btn" style="padding: 4px 8px; flex: 1;">Fix Issues</button>
    </div>
    <div id="auth-test-result" style="margin-top: 5px;"></div>
  `;
  
  document.body.appendChild(panel);
  
  // Add event listener for test button
  document.getElementById('auth-test-btn')?.addEventListener('click', async () => {
    const resultElement = document.getElementById('auth-test-result');
    if (resultElement) {
      resultElement.textContent = 'Testing...';
      
      try {
        const result = await testApiAuthentication();
        resultElement.innerHTML = `
          Status: ${result.status || 'N/A'}<br>
          Success: ${result.success ? '✅' : '❌'}<br>
          Message: ${result.message}
        `;
      } catch (e) {
        resultElement.textContent = `Test error: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }
  });
  
  // Add event listener for fix button
  document.getElementById('auth-fix-btn')?.addEventListener('click', async () => {
    const resultElement = document.getElementById('auth-test-result');
    if (resultElement) {
      resultElement.textContent = 'Attempting fixes...';
      
      try {
        const fixResult = await fixAuthenticationIssues();
        
        if (fixResult.success) {
          resultElement.innerHTML = `<span style="color: #4CAF50;">✅ ${fixResult.message}</span><br>Actions: ${fixResult.actionsPerformed.join(', ')}`;
          
          // If we cleared tokens, redirect to login after a short delay
          if (fixResult.actionsPerformed.some(action => action.includes('Removed'))) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        } else {
          resultElement.innerHTML = `<span style="color: #F44336;">❌ ${fixResult.message}</span><br>Actions: ${fixResult.actionsPerformed.join(', ')}`;
        }
      } catch (e) {
        resultElement.textContent = `Fix error: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }
  });
}

// You can activate the debug panel in development by calling:
// if (process.env.NODE_ENV === 'development') {
//   addAuthDebugPanel();
// } 