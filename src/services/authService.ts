import { supabase } from './supabase';
import { api } from './apiService';
import { Session, User } from '@supabase/supabase-js';

// Default timeout for auth requests (5 seconds)
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Helper to create a promise that times out after a set time
 * @param promise The promise to add a timeout to
 * @param timeoutMs Timeout in milliseconds
 * @param errorMsg Error message if timeout occurs
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS, errorMsg = 'Request timed out'): Promise<T> => {
  let timeoutHandle: number;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).then(result => {
    clearTimeout(timeoutHandle);
    return result;
  }).catch(error => {
    clearTimeout(timeoutHandle);
    throw error;
  });
};

/**
 * Service for handling authentication and JWT verification
 */
class AuthService {
  /**
   * Sign in with email and password
   * @param email User's email
   * @param password User's password
   * @returns The signed in user and session
   */
  async signInWithEmail(email: string, password: string) {
    try {
      console.log(`[AuthService] Attempting sign in for: ${email}`);
      
      const { data, error, success } = await withTimeout(
        api.post('/auth/login', { email, password }),
        DEFAULT_TIMEOUT_MS,
        'Login request timed out. Please check your internet connection and try again.'
      );

      if (!success || error) {
        console.error('[AuthService] Error signing in:', error);
        return { data: null, error };
      }

      // Store the session token for client-side auth
      this.storeSession(data.session);
      
      // Set the session in Supabase client for any remaining client-side operations
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
      
      console.log('[AuthService] Sign in successful');

      return { data, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error signing in:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error signing in') 
      };
    }
  }

  /**
   * Sign up with email and password
   * @param email User's email
   * @param password User's password
   * @param metadata Additional user metadata
   * @returns The created user and session
   */
  async signUpWithEmail(
    email: string, 
    password: string, 
    metadata: { first_name: string; last_name: string }
  ) {
    try {
      const { data, error, success } = await api.post('/auth/signup', {
        email,
        password,
        first_name: metadata.first_name,
        last_name: metadata.last_name
      });

      if (!success || error) {
        console.error('Error signing up:', error);
        return { data: null, error };
      }

      // Store session and set in Supabase client if available
      if (data.session) {
        this.storeSession(data.session);
        
        if (data.session?.access_token && data.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        }
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error signing up:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error signing up') 
      };
    }
  }

  /**
   * Sign out the current user
   * @returns Whether the sign out was successful
   */
  async signOut() {
    try {
      console.log('[AuthService] Signing out user');
      
      // Clear local session storage first
      this.clearSession();
      
      // Call API to invalidate session on server
      const { error, success } = await withTimeout(
        api.post('/auth/logout', {}),
        DEFAULT_TIMEOUT_MS,
        'Sign out request timed out. Please check your internet connection and try again.'
      );

      if (!success || error) {
        console.error('[AuthService] Error signing out from API:', error);
        // Continue with client-side signout even if API fails
      }

      // Perform client-side sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('[AuthService] Sign out successful');

      return { success: true, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error signing out:', err);
      
      // Try to clear client-side session anyway
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('[AuthService] Failed to clear client session:', e);
      }
      
      return { 
        success: false, 
        error: err instanceof Error ? err : new Error('Unknown error signing out') 
      };
    }
  }

  /**
   * Get the current session
   * @returns The current session
   */
  async getSession() {
    try {
      console.log('[AuthService] Getting session');
      
      // Get the locally stored token to include in request header
      const localSession = this.getStoredSession();
      const headers: Record<string, string> = {};
      
      if (localSession?.access_token) {
        headers['Authorization'] = `Bearer ${localSession.access_token}`;
      }
      
      // Try to get session from API first with the auth token in header
      const { data, error, success } = await withTimeout(
        api.get('/auth/session', { headers }),
        DEFAULT_TIMEOUT_MS,
        'Session request timed out. Please check your internet connection and try again.'
      );

      if (!success || error) {
        console.error('[AuthService] Error getting session from API:', error);
        
        // Fall back to local session if API fails
        if (localSession) {
          console.log('[AuthService] Using locally stored session');
          const { data: userData } = await this.getCurrentUser();
          return { data: { session: localSession, user: userData }, error: null };
        }
        
        return { data: null, error };
      }

      // If we got a valid session from API, store it locally
      if (data.session) {
        this.storeSession(data.session);
      }

      return { data, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error getting session:', err);
      
      // Fall back to local session as last resort
      try {
        const localSession = this.getStoredSession();
        if (localSession) {
          console.log('[AuthService] Using locally stored session after error');
          const { data: userData } = await this.getCurrentUser();
          return { data: { session: localSession, user: userData }, error: null };
        }
      } catch (e) {
        console.error('[AuthService] Failed to get local session:', e);
      }
      
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error getting session') 
      };
    }
  }

  /**
   * Get the current user
   * @returns The current user
   */
  async getCurrentUser() {
    try {
      console.log('[AuthService] Getting current user');
      
      // Get the locally stored token to include in request header
      const localSession = this.getStoredSession();
      const headers: Record<string, string> = {};
      
      if (localSession?.access_token) {
        headers['Authorization'] = `Bearer ${localSession.access_token}`;
      }
      
      const { data, error, success } = await api.get('/auth/user', { headers });

      if (!success || error) {
        console.error('[AuthService] Error getting user from API:', error);
        
        // Fall back to client-side user if API fails
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('[AuthService] Using client-side user data');
            return { data: user, error: null };
          }
        } catch (e) {
          console.error('[AuthService] Failed to get client-side user:', e);
        }
        
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error getting user:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error getting user') 
      };
    }
  }

  /**
   * Update user profile
   * @param updates User profile updates
   * @returns The updated user
   */
  async updateUser(updates: { 
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
  }) {
    try {
      console.log('[AuthService] Updating user profile');
      
      const { data, error, success } = await api.put('/auth/user', updates);

      if (!success || error) {
        console.error('[AuthService] Error updating user:', error);
        return { data: null, error };
      }

      return { data: data.user, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error updating user:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error updating user') 
      };
    }
  }

  /**
   * Reset password for email
   * @param email User's email
   * @returns Whether the reset email was sent
   */
  async resetPassword(email: string) {
    try {
      console.log('[AuthService] Requesting password reset for:', email);
      
      const { data, error, success } = await api.post('/auth/reset-password', { email });

      if (!success || error) {
        console.error('[AuthService] Error requesting password reset:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error requesting password reset:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error requesting password reset') 
      };
    }
  }

  /**
   * Update password
   * @param password New password
   * @returns Whether the password was updated
   */
  async updatePassword(password: string) {
    try {
      console.log('[AuthService] Updating password');
      
      const { data, error, success } = await api.post('/auth/update-password', { password });

      if (!success || error) {
        console.error('[AuthService] Error updating password:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error updating password:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error updating password') 
      };
    }
  }

  /**
   * Refresh the user's session
   * This method will attempt to refresh the session using the refresh token
   * @returns The refreshed session
   */
  async refreshSession() {
    try {
      console.log('[AuthService] Refreshing session');
      
      // Get local refresh token
      const session = this.getStoredSession();
      if (!session?.refresh_token) {
        console.error('[AuthService] No refresh token available');
        return { data: null, error: new Error('No refresh token available') };
      }
      
      // Set a timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session refresh timeout')), 5000);
      });
      
      // Make API request with timeout
      const refreshPromise = api.post('/auth/refresh', { 
        refresh_token: session.refresh_token 
      });
      
      // Race the refresh request against the timeout
      const { data, error, success } = await Promise.race([
        refreshPromise,
        timeoutPromise.then(() => ({ 
          success: false, 
          error: { message: 'Session refresh timeout' } 
        }))
      ]) as any;

      if (!success || error) {
        console.error('[AuthService] Error refreshing session:', error);
        
        // Try using Supabase client directly as a fallback
        try {
          console.log('[AuthService] Trying direct Supabase refresh as fallback');
          const { data: supabaseData, error: supabaseError } = await supabase.auth.refreshSession({
            refresh_token: session.refresh_token
          });
          
          if (supabaseError || !supabaseData.session) {
            console.error('[AuthService] Supabase fallback refresh also failed:', supabaseError);
            return { data: null, error: supabaseError || error };
          }
          
          // Store refreshed session
          this.storeSession(supabaseData.session);
          return { data: supabaseData, error: null };
        } catch (fallbackError) {
          console.error('[AuthService] Supabase fallback refresh threw error:', fallbackError);
          return { data: null, error: error || fallbackError };
        }
      }

      // Store refreshed session
      if (data.session) {
        this.storeSession(data.session);
        
        // Update client-side Supabase session
        if (data.session?.access_token && data.session?.refresh_token) {
          try {
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            });
            console.log('[AuthService] Updated Supabase client session');
          } catch (supabaseError) {
            console.error('[AuthService] Error updating Supabase client session:', supabaseError);
            // Continue anyway since we've stored the session locally
          }
        }
      } else {
        console.warn('[AuthService] Refresh succeeded but no session returned');
      }

      return { data, error: null };
    } catch (err) {
      console.error('[AuthService] Unexpected error refreshing session:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error refreshing session') 
      };
    }
  }
  
  /**
   * Store the session in localStorage
   * @param session The session to store
   */
  private storeSession(session: Session) {
    try {
      localStorage.setItem('authSession', JSON.stringify(session));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  /**
   * Get the stored session from localStorage
   * @returns The stored session
   */
  private getStoredSession(): Session | null {
    try {
      const sessionStr = localStorage.getItem('authSession');
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch (error) {
      console.error('Error retrieving stored session:', error);
      return null;
    }
  }

  /**
   * Clear the stored session from localStorage
   */
  private clearSession() {
    try {
      localStorage.removeItem('authSession');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }
}

export const authService = new AuthService();
