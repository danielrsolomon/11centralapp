import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/auth-provider';
import { toast } from 'sonner';
import { TEST_USERS, loginWithTestUser } from '../../services/testUsers';

const Login = () => {
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiStatus, setApiStatus] = useState<{ status: string, message: string } | null>(null);

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // First try the health endpoint
        const healthResponse = await fetch('/api/health');
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setApiStatus({ 
            status: 'available', 
            message: `API connected successfully: ${healthData.data?.message || 'OK'}`
          });
          return;
        }
        
        // If health endpoint fails, try university endpoint as fallback
        const response = await fetch('/api/university');
        if (response.ok) {
          const data = await response.json();
          setApiStatus({ 
            status: 'available', 
            message: 'API connected via university endpoint'
          });
        } else {
          const errorData = await response.json();
          setApiStatus({ 
            status: 'error', 
            message: `API error: ${errorData.error?.message || 'Unknown error'}` 
          });
        }
      } catch (err) {
        setApiStatus({ 
          status: 'error', 
          message: `API connection error: ${err instanceof Error ? err.message : String(err)}` 
        });
      }
    };

    checkApiStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.error) {
        toast.error(`Login failed: ${result.error.message}`);
      } else {
        // Detailed session debug
        const hasStoredSession = localStorage.getItem('authSession') !== null;
        const hasSupabaseSession = localStorage.getItem('supabase.auth.token') !== null;
        
        if (!hasStoredSession || !hasSupabaseSession) {
          toast.warning('Warning: Session storage issue detected. You may be logged out unexpectedly.');
        } else {
          try {
            // Check session data format
            const sessionData = localStorage.getItem('authSession');
            if (sessionData) {
              JSON.parse(sessionData);
            }
          } catch (e) {
            // Error parsing session data
          }
          
          toast.success('Login successful');
        }
        
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Login with a test account
  const handleTestLogin = async (username: string) => {
    setIsLoading(true);
    
    try {
      const result = await loginWithTestUser(username);
      
      if (result.error) {
        toast.error(`Test login failed: ${result.error.message}`);
      } else {
        // Detailed session debug
        const hasStoredSession = localStorage.getItem('authSession') !== null;
        const hasSupabaseSession = localStorage.getItem('supabase.auth.token') !== null;
        
        if (!hasStoredSession || !hasSupabaseSession) {
          toast.warning('Warning: Session storage issue detected. You may be logged out unexpectedly.');
        } else {
          try {
            // Check session data format
            const sessionData = localStorage.getItem('authSession');
            if (sessionData) {
              JSON.parse(sessionData);
            }
          } catch (e) {
            // Error parsing session data
          }
          
          toast.success(`Test login successful as ${TEST_USERS[username]?.label || username}`);
        }
        
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(`Test login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">E11EVEN Central</h1>
          <p className="text-gray-600">Sign in to access your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {/* Developer quick login section */}
        {import.meta.env.DEV && (
          <div className="mt-6 border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Developer Test Accounts</p>
            <div className="flex flex-col gap-2">
              {Object.entries(TEST_USERS).map(([username, user]) => (
                <button
                  key={username}
                  type="button"
                  onClick={() => handleTestLogin(username)}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md text-left"
                >
                  Sign in as {user.label} ({user.email})
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              For development purposes only
            </div>
          </div>
        )}
        
        {/* Status indicators */}
        {apiStatus && (
          <div className={`mt-4 p-2 rounded-md text-sm ${
            apiStatus.status === 'available' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {apiStatus.message}
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-2 bg-yellow-50 text-yellow-800 rounded-md text-sm">
            <strong>Auth Error:</strong> {error}
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-500">
          Need help? Contact your administrator.
        </div>
      </div>
    </div>
  );
};

export default Login; 