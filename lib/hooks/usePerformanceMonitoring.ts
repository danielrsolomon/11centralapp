'use client'

import { useEffect, useRef, useState } from 'react'
import { createPerformanceDebugger } from '@/lib/debug-utils'

/**
 * Hook for monitoring component performance
 * 
 * @param componentName The name of the component being monitored
 * @param deps Optional dependency array to control when performance monitoring is reset
 * 
 * @returns A debugging object with timing methods
 * 
 * @example
 * function MyComponent() {
 *   const perf = usePerformanceMonitoring('MyComponent');
 *   
 *   useEffect(() => {
 *     perf.startTiming('data-fetch');
 *     fetchData().then(() => {
 *       perf.endTiming('data-fetch');
 *     });
 *   }, []);
 *   
 *   return <div>My Component</div>;
 * }
 */
export default function usePerformanceMonitoring(
  componentName: string,
  deps: any[] = []
) {
  // Create a ref to hold the debugging object to prevent recreating it on every render
  const debuggerRef = useRef(createPerformanceDebugger(componentName));
  
  // Track component renders
  useEffect(() => {
    // Only track in development
    if (process.env.NODE_ENV === 'development') {
      debuggerRef.current.trackRender();
    }
  });
  
  // Clean up on unmount or when deps change
  useEffect(() => {
    return () => {
      debuggerRef.current.cleanup();
    };
  }, deps);
  
  return debuggerRef.current;
}

/**
 * Hook for measuring data fetch operations
 * 
 * @param componentName The name of the component
 * @param fetchFn The fetch function to be executed
 * @param deps Dependencies that should trigger a re-fetch
 * 
 * @returns [data, loading, error] - The data, loading state, and any error
 * 
 * @example
 * function UserProfile() {
 *   const [userData, loading, error] = useMonitoredFetch(
 *     'UserProfile',
 *     () => fetchUserData(userId),
 *     [userId]
 *   );
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return <div>{userData.name}</div>;
 * }
 */
export function useMonitoredFetch<T>(
  componentName: string,
  fetchFn: () => Promise<T>,
  deps: any[] = []
): [T | null, boolean, Error | null] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Get the performance debugger
  const perf = usePerformanceMonitoring(`${componentName}.fetch`, deps);
  
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchOperation = async () => {
      perf.startTiming('fetch');
      
      try {
        const result = await fetchFn();
        
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        perf.endTiming('fetch');
      }
    };
    
    fetchOperation();
    
    return () => {
      isMounted = false;
    };
  }, deps);
  
  return [data, loading, error];
} 