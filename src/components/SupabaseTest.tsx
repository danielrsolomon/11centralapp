import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authService } from '../services/authService';
import { api } from '../services/apiService';

/**
 * @deprecated This component is deprecated and for diagnostic purposes only.
 * It should not be used in production code or new development.
 * 
 * This component makes direct Supabase calls which violates the API-first architecture.
 * It is intentionally exempt from this requirement only for testing and debugging purposes.
 * 
 * For proper data access in production code, always use the API service layer:
 * import { api } from '../services/apiService';
 * 
 * @notice This is a diagnostic component used for testing Supabase integration.
 * It is not part of the production application flow and is exempt from the
 * API-first architecture requirements specifically for diagnostic purposes.
 */

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

export default function SupabaseTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    
    // Test 1: API Connection (replacing direct Supabase call)
    try {
      const { data, error, success } = await api.get('/admin/roles?limit=1');
      
      if (!success || error) {
        setResults(prev => [...prev, {
          name: 'API Connection',
          success: false,
          message: `Error: ${error?.message || 'Unknown error'}`,
        }]);
      } else {
        setResults(prev => [...prev, {
          name: 'API Connection',
          success: true,
          message: 'Successfully connected to API',
          data
        }]);
      }
    } catch (err) {
      setResults(prev => [...prev, {
        name: 'API Connection',
        success: false,
        message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    }

    // Test 2: Authentication Status (uses authService which already follows API-first approach)
    try {
      // Get the session from the API-based auth service
      const { data, error } = await api.get('/auth/session');
      
      if (error) {
        setResults(prev => [...prev, {
          name: 'Authentication Status',
          success: false,
          message: `Error: ${error.message}`,
        }]);
      } else {
        setResults(prev => [...prev, {
          name: 'Authentication Status',
          success: true,
          message: data ? 'User is authenticated' : 'No active session',
          data: data ? { user: data.user } : null
        }]);
      }
    } catch (err) {
      setResults(prev => [...prev, {
        name: 'Authentication Status',
        success: false,
        message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    }

    // Test 3: Real-time Capabilities (allowed direct Supabase usage for real-time features)
    try {
      const channel = supabase.channel('db-test');
      
      const subscription = channel
        .on('presence', { event: 'sync' }, () => {
          setResults(prev => [...prev, {
            name: 'Real-time Capabilities',
            success: true,
            message: 'Successfully subscribed to real-time updates',
          }]);

          // Clean up subscription after test
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        })
        .on('presence', { event: 'join' }, () => {
          console.log('Joined real-time channel');
        })
        .on('presence', { event: 'leave' }, () => {
          console.log('Left real-time channel');
        })
        .subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') {
            setResults(prev => [...prev, {
              name: 'Real-time Capabilities',
              success: false,
              message: `Subscription status: ${status}`,
            }]);
          }
        });
    } catch (err) {
      setResults(prev => [...prev, {
        name: 'Real-time Capabilities',
        success: false,
        message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    }

    setLoading(false);
  };

  useEffect(() => {
    // Run tests automatically when component mounts
    runTests();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Integration Test</h1>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
        <p className="text-yellow-700">
          <strong>Diagnostic Tool:</strong> This component is for testing purposes only and is not part of the production application.
        </p>
      </div>
      
      <button 
        onClick={runTests}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 mb-6"
      >
        {loading ? 'Running Tests...' : 'Run Tests Again'}
      </button>
      
      <div className="space-y-4">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`p-4 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          >
            <h3 className="font-bold flex items-center">
              <span className={`w-4 h-4 rounded-full inline-block mr-2 ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {result.name}
            </h3>
            <p className="mt-1">{result.message}</p>
            {result.data && (
              <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
        
        {results.length === 0 && loading && (
          <div className="text-center p-4">Running tests...</div>
        )}
        
        {results.length === 0 && !loading && (
          <div className="text-center p-4">No test results yet</div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <h2 className="font-bold text-lg mb-2">What's being tested?</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>API Connection</strong>: Tests if we can connect to the backend API and fetch data</li>
          <li><strong>Authentication Status</strong>: Checks if there's an active session</li>
          <li><strong>Real-time Capabilities</strong>: Verifies that real-time subscriptions work (uses allowed direct Supabase client)</li>
        </ul>
      </div>
    </div>
  );
} 