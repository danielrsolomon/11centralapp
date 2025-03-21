// Add this at the top of the file, before the imports
declare global {
  interface Window {
    reactRendered?: () => void;
  }
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './providers/auth-provider';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import University from './pages/university/University';
import Programs from './pages/university/Programs';
import CourseList from './pages/university/CourseList';
import ModuleViewer from './pages/university/ModuleViewer';
import Achievements from './pages/university/Achievements';
import ContentManagement from './pages/university/ContentManagement';
import Connect from './pages/connect/Connect';
import DirectMessages from './pages/connect/DirectMessages';
import Schedule from './pages/schedule/Schedule';
import ShiftSwaps from './pages/schedule/ShiftSwaps';
import TimeOff from './pages/schedule/TimeOff';
import Floorplans from './pages/schedule/Floorplans';
import Gratuity from './pages/gratuity/Gratuity';
import GratuityReports from './pages/gratuity/Reports';
import Admin from './pages/admin/Admin';
import Login from './pages/auth/Login';
import UserSettings from './pages/UserSettings';
import SupabaseTest from './components/SupabaseTest';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import ApiStatusDebug from './components/ApiStatusDebug';
import React, { useEffect, useState } from 'react';
import { addAuthDebugPanel } from './utils/authDebug';

// Fallback UI component
const FallbackUI: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="animate-pulse bg-blue-500 h-2 w-32 rounded mb-4"></div>
      <h1 className="text-2xl font-bold mb-2">E11EVEN Central</h1>
      <p className="text-gray-600 mb-4">Loading application...</p>
      <div className="text-sm text-gray-500">If the application doesn't load, please check the console for errors.</div>
    </div>
  );
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, error } = useAuth();
  
  // Handle loading state - only show loading for the first 3 seconds
  const [showFallback, setShowFallback] = useState(true);
  const [sessionDiagnostics, setSessionDiagnostics] = useState<Record<string, any> | null>(null);
  
  // Enhanced session diagnostics on mount
  useEffect(() => {
    try {
      // Collect localStorage info
      const storageKeys = Object.keys(localStorage);
      const authRelatedKeys = storageKeys.filter(key => 
        key.includes('auth') || key.includes('supabase')
      );
      
      // Check each auth-related key
      const storageData: Record<string, any> = {};
      authRelatedKeys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              // Try to parse as JSON
              const parsed = JSON.parse(item);
              storageData[key] = {
                type: 'json',
                size: item.length,
                hasAccessToken: !!parsed.access_token || !!(parsed.currentSession?.access_token),
                hasUser: !!parsed.user || !!(parsed.currentSession?.user),
                expiresAt: parsed.expires_at || parsed.currentSession?.expires_at
                  ? new Date((parsed.expires_at || parsed.currentSession?.expires_at) * 1000).toISOString()
                  : 'none'
              };
            } catch (e) {
              // Not JSON
              storageData[key] = {
                type: 'string',
                size: item.length,
                preview: item.substring(0, 50) + (item.length > 50 ? '...' : '')
              };
            }
          } else {
            storageData[key] = { type: 'empty' };
          }
        } catch (e) {
          storageData[key] = { type: 'error', error: e instanceof Error ? e.message : String(e) };
        }
      });
      
      const diagnosticInfo = {
        localStorage: {
          totalKeys: storageKeys.length,
          authRelatedKeys: authRelatedKeys.length,
          authData: storageData
        },
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      setSessionDiagnostics(diagnosticInfo);
    } catch (e) {
      // Silently handle errors in diagnostics
    }
  }, []);
  
  useEffect(() => {
    // Set a timeout to show the login page if loading takes too long
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setShowFallback(false);
      }
    }, 3000); // 3 second timeout
    
    // Clear timeout if loading finishes
    if (!isLoading) {
      clearTimeout(timeoutId);
    }
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);
  
  if (isLoading && showFallback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="animate-pulse bg-blue-500 h-2 w-32 rounded mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Loading Authentication</h1>
        <p className="text-gray-600 mb-4">Verifying your credentials...</p>
        <div className="text-sm text-gray-500">This should only take a moment.</div>
      </div>
    );
  }
  
  if (error) {
    // Check if session diagnostics are available
    let errorDetails = "";
    if (error.includes('Session missing') && sessionDiagnostics) {
      const authData = sessionDiagnostics.localStorage.authData;
      const hasAuthSession = authData['authSession'] !== undefined;
      const hasSupabaseToken = authData['supabase.auth.token'] !== undefined;
      
      errorDetails = `Diagnostics: ${hasAuthSession ? 'Custom session found' : 'No custom session'}, 
        ${hasSupabaseToken ? 'Supabase token found' : 'No Supabase token'}`;
    }
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-red-50">
        <div className="rounded-full bg-red-100 p-3 mb-4">
          <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-red-600 mb-4">{error}</p>
        {errorDetails && (
          <div className="bg-white p-3 rounded mb-4 text-sm text-gray-700 max-w-md">
            {errorDetails}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              // Clear localStorage before redirecting
              try {
                // Only clear auth-related keys
                const authKeys = Object.keys(localStorage).filter(key => 
                  key.includes('auth') || key.includes('supabase')
                );
                authKeys.forEach(key => localStorage.removeItem(key));
              } catch (e) {
                // Silently handle errors
              }
              window.location.href = '/login';
            }} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Session & Go to Login
          </button>
          
          <button 
            onClick={() => window.location.href = '/login'} 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  // Return the Routes directly
  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f5f5f5'}}>
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/supabase-test" element={<SupabaseTest />} />
        
        {/* Default redirect to login when accessing root without authentication */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* University Routes */}
        <Route
          path="/university/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<University />} />
                  <Route path="/programs" element={<Programs />} />
                  <Route path="/programs/:programId" element={<CourseList />} />
                  <Route path="/programs/:programId/courses/:courseId/lessons/:lessonId/modules/:moduleId" element={<ModuleViewer />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/content" element={<ContentManagement />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Connect Routes */}
        <Route
          path="/connect/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Connect />} />
                  <Route path="/direct" element={<DirectMessages />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Schedule Routes */}
        <Route
          path="/schedule/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Schedule />} />
                  <Route path="/swaps" element={<ShiftSwaps />} />
                  <Route path="/time-off" element={<TimeOff />} />
                  <Route path="/floorplans" element={<Floorplans />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Gratuity Routes */}
        <Route
          path="/gratuity/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Gratuity />} />
                  <Route path="/reports" element={<GratuityReports />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* User & Admin Routes */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UserSettings />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout>
                <Admin />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    // Set up auth debugging tool in development
    if (process.env.NODE_ENV === 'development') {
      // We use a timeout to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        addAuthDebugPanel();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Attempt to fix common authentication issues on app load
    const attemptToFixAuthIssues = async () => {
      try {
        // Only import in browser environment
        if (typeof window !== 'undefined') {
          const { fixAuthenticationIssues } = await import('./utils/authDebug');
          const result = await fixAuthenticationIssues();
          
          if (result.success && result.actionsPerformed.some(action => action.includes('Removed'))) {
            console.log('Fixed authentication issues automatically:', result.message);
            // If on a protected route and we had to fix issues, redirect to login
            if (!window.location.pathname.includes('/login')) {
              const returnPath = window.location.pathname;
              window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
            }
          }
        }
      } catch (error) {
        console.error('Error trying to fix authentication issues:', error);
      }
    };
    
    attemptToFixAuthIssues();
  }, []);

  useEffect(() => {
    // Signal that React has rendered
    if (window.reactRendered) {
      window.reactRendered();
    }
    
    // Delay showing the app to avoid flicker
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!appReady) {
    return <FallbackUI />;
  }
  
  // Collect localStorage info
  const storageKeys = Object.keys(localStorage);
  const sessionDiagnostics = {
    timestamp: new Date().toISOString(),
    localStorage: {
      keys: storageKeys,
      values: {},
      authData: null,
    }
  };
  
  storageKeys.forEach(key => {
    const item = localStorage.getItem(key);
    let parsedItem;
    
    try {
      // Try to parse, but don't cause the app to crash
      parsedItem = JSON.parse(item || '{}');
    } catch (e) {
      parsedItem = null;
    }
    
    // Collect auth-related data for debug
    if (key === 'authSession' || key.includes('supabase.auth')) {
      (sessionDiagnostics.localStorage as any).authData = parsedItem;
    }
    
    // Store in the diagnostics
    (sessionDiagnostics.localStorage.values as any)[key] = item ? 
      (item.length > 50 ? `${item.substring(0, 50)}...` : item) : null;
  });
  
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <div className="app dark:bg-background text-foreground">
            <Toaster position="bottom-center" />
            <div className="debug-diagnostics hidden">
              <pre>{JSON.stringify(sessionDiagnostics, null, 2)}</pre>
            </div>
            
            {/* API Status Debug only shown in dev or test */}
            {(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
              <ApiStatusDebug />
            }
            
            <AppRoutes />
          </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
