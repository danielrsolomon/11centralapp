import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * @deprecated This component is deprecated and for diagnostic purposes only.
 * It should not be used in production code or new development.
 * 
 * This component is intended solely for development and debugging,
 * and should be conditionally rendered only in non-production environments.
 * 
 * For production status monitoring, consider implementing a proper
 * monitoring solution that doesn't expose internal details.
 */

interface ApiStatusProps {
  onClose?: () => void;
}

/**
 * Debug component for API and auth status
 * Only displayed in development mode
 */
const ApiStatusDebug: React.FC<ApiStatusProps> = ({ onClose }) => {
  const { user, loading: isLoading, error } = useAuth();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [visible, setVisible] = useState(true);

  // Check API status on mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setApiStatus(data.success ? 'online' : 'offline');
        setApiResponse(data);
      } catch (err) {
        console.error('Error checking API status:', err);
        setApiStatus('offline');
      }
    };

    checkApiStatus();
    // Check status every 10 seconds
    const interval = setInterval(checkApiStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-gray-800 text-white text-xs rounded-tl-md z-50 max-w-xs opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">DEV: System Status</h3>
        <button 
          onClick={handleClose} 
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <span className="font-semibold">API:</span>{' '}
          <span className={`${
            apiStatus === 'online' 
              ? 'text-green-400' 
              : apiStatus === 'offline' 
                ? 'text-red-400' 
                : 'text-yellow-400'
          }`}>
            {apiStatus === 'online' 
              ? '✓ Connected' 
              : apiStatus === 'offline' 
                ? '✗ Disconnected' 
                : '⟳ Checking...'}
          </span>
        </div>
        
        <div>
          <span className="font-semibold">Auth:</span>{' '}
          {isLoading ? (
            <span className="text-yellow-400">⟳ Loading...</span>
          ) : error ? (
            <span className="text-red-400">✗ Error: {error.message}</span>
          ) : user ? (
            <span className="text-green-400">✓ Authenticated as {user.email}</span>
          ) : (
            <span className="text-gray-400">Not authenticated</span>
          )}
        </div>
        
        {apiResponse && (
          <div>
            <details>
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300">API Details</summary>
              <pre className="mt-1 p-1 bg-gray-700 rounded text-xs overflow-auto max-h-20">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <div className="text-gray-400 text-xs mt-1">
          API URL: {import.meta.env.VITE_API_URL || 'http://localhost:3001'}
        </div>
      </div>
    </div>
  );
};

export default ApiStatusDebug; 