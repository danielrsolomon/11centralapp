/**
 * API Service
 * 
 * This service provides utility functions for making API calls to the backend.
 * It handles common operations like request formatting, error handling, and authentication.
 */

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: string;
    code?: string;
  };
};

/**
 * Get auth token from storage for API requests
 */
const getAuthToken = (): string | null => {
  try {
    // First try to get the token from our custom authSession
    const authSession = localStorage.getItem('authSession');
    if (authSession) {
      const parsedSession = JSON.parse(authSession);
      if (parsedSession && parsedSession.access_token) {
        // Check if token is expired
        if (parsedSession.expires_at && parsedSession.expires_at * 1000 < Date.now()) {
          console.warn('API: Token is expired, should be refreshed');
          return null; // Return null to trigger a refresh
        }
        return parsedSession.access_token;
      }
    }
    
    // Fall back to Supabase token if our custom one isn't available
    const supabaseAuth = localStorage.getItem('supabase.auth.token');
    if (supabaseAuth) {
      const parsedAuth = JSON.parse(supabaseAuth);
      if (parsedAuth && parsedAuth.currentSession && parsedAuth.currentSession.access_token) {
        // Check if token is expired
        if (parsedAuth.currentSession.expires_at && 
            parsedAuth.currentSession.expires_at * 1000 < Date.now()) {
          console.warn('API: Supabase token is expired, should be refreshed');
          return null; // Return null to trigger a refresh
        }
        return parsedAuth.currentSession.access_token;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

// Keep a record of current request retries
const requestRetries = new Map<string, number>();

/**
 * Make an API request to the E11EVEN Central API
 */
export async function apiRequest<T = any>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { 
    method = 'GET',
    headers = {},
    body,
    signal
  } = options;
  
  // Default headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Add auth token to headers if available
  const token = getAuthToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn(`API: No auth token available for request to ${endpoint}`);
    
    // If we're not already on the login page and there's no token, 
    // maybe we should redirect to login
    if (typeof window !== 'undefined' && 
        !window.location.pathname.includes('/login') && 
        !endpoint.includes('/auth')) {
      
      // For certain endpoints that always require auth, redirect to login
      if (endpoint.includes('/university/') || 
          endpoint.includes('/schedule/') || 
          endpoint.includes('/connect/') ||
          endpoint.includes('/gratuity/')) {
        
        console.error('API: Authentication required for this endpoint, redirecting to login');
        // Store current path for redirect after login
        const returnPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
        
        return {
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
            details: 'Redirecting to login page'
          }
        };
      }
    }
  }
  
  // Unique request identifier for tracking retries
  const requestId = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
  const retryCount = requestRetries.get(requestId) || 0;
  
  try {
    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers: { ...defaultHeaders, ...headers },
      signal,
      credentials: 'include', // Include cookies for auth
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body !== undefined) {
      requestOptions.body = JSON.stringify(body);
    }

    // Log auth state for debugging
    console.log(`API Request to ${endpoint}: Auth token ${token ? 'present' : 'missing'}`);
    
    // Make the request
    const response = await fetch(`/api${endpoint}`, requestOptions);
    
    // Handle authentication errors
    if (response.status === 401 && retryCount < 1) {
      console.warn(`API: Authentication failed for ${endpoint}, attempting to refresh token`);
      
      // Increment retry count
      requestRetries.set(requestId, retryCount + 1);
      
      // Import dynamically to avoid circular dependencies
      const authModule = await import('./authService');
      
      // Try to refresh the token
      const refreshResult = await authModule.authService.refreshSession();
      
      if (refreshResult.data?.session) {
        console.log('API: Token refreshed successfully, retrying request');
        
        // Retry the original request with the new token
        return apiRequest(endpoint, options);
      } else {
        console.error('API: Token refresh failed, redirecting to login');
        
        // If refresh fails and we're not already on login page, redirect
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          const returnPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
        }
        
        return {
          success: false,
          error: {
            message: 'Session expired',
            code: 'SESSION_EXPIRED',
            details: 'Please log in again'
          }
        };
      }
    }
    
    // Reset retry count on success or non-401 errors
    requestRetries.delete(requestId);
    
    // Handle empty responses or non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`API: Invalid response format for ${endpoint}. Content-Type: ${contentType}`);
      return {
        success: false,
        error: {
          message: 'Invalid response format',
          details: `Expected JSON but received ${contentType || 'unknown content type'}`,
          code: 'INVALID_RESPONSE_FORMAT'
        }
      };
    }
    
    // Parse response with try/catch to handle malformed JSON
    let data;
    try {
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error(`API: Empty response body for endpoint ${endpoint}`);
        return {
          success: false,
          error: {
            message: 'Empty response from server',
            details: 'The server returned an empty response body',
            code: 'EMPTY_RESPONSE'
          }
        };
      }
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(`API: JSON parse error for endpoint ${endpoint}:`, parseError);
        console.error(`API: Response text was: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        return {
          success: false,
          error: {
            message: 'Failed to parse JSON response',
            details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
            code: 'JSON_PARSE_ERROR'
          }
        };
      }
    } catch (textError) {
      console.error(`API: Error reading response text for endpoint ${endpoint}:`, textError);
      return {
        success: false,
        error: {
          message: 'Failed to read response',
          details: textError instanceof Error ? textError.message : 'Unknown error reading response',
          code: 'RESPONSE_READ_ERROR'
        }
      };
    }
    
    // Check for required response structure (success field)
    if (data && typeof data === 'object' && !('success' in data)) {
      console.log(`API: Response missing 'success' field for ${endpoint}, wrapping in standard format`);
      
      // Attempt to handle legacy or inconsistent API responses
      // If data looks like a direct array or object, wrap it in our expected format
      return {
        success: true,
        data: data as T
      };
    }
    
    // Handle API error responses
    if (!response.ok || (data && data.success === false)) {
      // Special handling for auth errors - these may require redirection to login
      if (response.status === 401 || 
          (data?.error?.code === 'UNAUTHORIZED') || 
          (data?.error?.code === 'AUTH_REQUIRED')) {
        
        console.error(`API: Authentication error for ${endpoint}`);
        
        // If not already on login page, redirect
        if (typeof window !== 'undefined' && 
            !window.location.pathname.includes('/login') && 
            !endpoint.includes('/auth')) {
          
          const returnPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
        }
      }
      
      return {
        success: false,
        error: {
          message: data?.error?.message || data?.message || 'An error occurred',
          details: data?.error?.details || data?.details || response.statusText,
          code: data?.error?.code || data?.code || response.status.toString()
        }
      };
    }
    
    // Return successful response
    return {
      success: true,
      data: (data?.data as T) ?? data // Fall back to full response if no data field
    };
  } catch (error) {
    // Reset retry count on error
    requestRetries.delete(requestId);
    
    // Handle network errors
    let errorMessage = 'Network error';
    let errorDetails = 'Unknown error';
    let errorCode = 'NETWORK_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || 'No stack trace available';
      
      if (error.name === 'AbortError') {
        errorCode = 'REQUEST_ABORTED';
        errorMessage = 'Request was aborted';
      }
    }
    
    console.error(`API: Network error for ${endpoint}:`, error);
    
    return {
      success: false,
      error: {
        message: errorMessage,
        details: errorDetails,
        code: errorCode
      }
    };
  }
}

/**
 * API utility methods for common operations
 */
export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiOptions, 'method' | 'body'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, body: any, options?: Omit<ApiOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
    
  put: <T = any>(endpoint: string, body: any, options?: Omit<ApiOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
    
  patch: <T = any>(endpoint: string, body: any, options?: Omit<ApiOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
    
  delete: <T = any>(endpoint: string, options?: Omit<ApiOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
};

export default api; 