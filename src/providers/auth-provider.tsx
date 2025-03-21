import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Maximum time to wait for auth initialization
const AUTH_TIMEOUT_MS = 5000;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);

        // Check for stored token first
        const storedSession = localStorage.getItem('authSession');
        let accessToken = null;
        
        if (storedSession) {
          try {
            const sessionData = JSON.parse(storedSession);
            accessToken = sessionData.access_token;
          } catch (e) {
            console.error('Failed to parse stored session:', e);
          }
        }

        // Set a timeout for the auth check
        const timeoutPromise = new Promise<{data: null, error: Error}>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Authentication check timed out after ${AUTH_TIMEOUT_MS}ms`));
          }, AUTH_TIMEOUT_MS);
        });
        
        // Create headers with auth token if available
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        // Call the new API endpoint instead of the auth service
        const sessionCheckPromise = fetch('/api/auth/session', {
          method: 'GET',
          headers
        }).then(res => res.json());
        
        // Wait for the first to resolve
        const result = await Promise.race([
          sessionCheckPromise,
          timeoutPromise
        ]);
        
        if (!result.success || result.error) {
          const errorMessage = result.error?.message || 'Failed to retrieve session';
          setError(`Error loading user: ${errorMessage}`);
          setUser(null);
          return;
        }
        
        const { data } = result;
        
        if (!data?.user) {
          // If no session is found, provide diagnostics
          if (import.meta.env.DEV) {
            setError('Session missing or expired! You need to log in.');
          } else {
            setError('Session missing or expired! Please log in.');
          }
          
          setUser(null);
          return;
        }
        
        // User is authenticated
        setUser(data.user);
        
        // If response includes a session, store it
        if (data.session?.access_token) {
          localStorage.setItem('authSession', JSON.stringify(data.session));
          
          // Also update the Supabase client session
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || ''
          });
        }
        
        setIsLoading(false);
        setError(null);
      } catch (error) {
        setUser(null);
        setError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await authService.signInWithEmail(email, password);
      
      if (result.error) {
        setError(`Login failed: ${result.error.message}`);
        toast.error(`Login failed: ${result.error.message}`);
      } else if (result.data) {
        setUser(result.data.user);
        toast.success('Logged in successfully');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown login error';
      setError(`Login system error: ${errorMessage}`);
      toast.error(`Login system error: ${errorMessage}`);
      return { error: { message: errorMessage }, data: null };
    }
  };

  const logout = async () => {
    setError(null);
    try {
      const result = await authService.signOut();
      
      if (result.error) {
        setError(`Logout failed: ${result.error.message}`);
        toast.error(`Logout failed: ${result.error.message}`);
      } else {
        setUser(null);
        toast.success('Logged out successfully');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown logout error';
      setError(`Logout system error: ${errorMessage}`);
      toast.error(`Logout system error: ${errorMessage}`);
      return { error: { message: errorMessage }, success: false };
    }
  };

  // Listen for auth changes coming from Supabase client (for session sync purposes)
  useEffect(() => {
    // This is still needed for client-side redirects and auth state changes
    // that might be triggered by things like OAuth redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setError(null);
        } else if (user !== null) {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Store debug info in a window property instead of console.log in dev mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      const debugState = {
        user: user ? { id: user.id, email: user.email } : null,
        isLoading,
        error
      };
      (window as any).__authState = debugState;
    }
  }, [user, isLoading, error]);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
