import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    console.error('ErrorBoundary detected an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // You could also log the error to an error reporting service like Sentry here
    try {
      // Notify HTML debug script about the error
      const debugElement = document.getElementById('render-status');
      if (debugElement) {
        debugElement.textContent = `Error: ${error.message}`;
        debugElement.style.color = 'red';
      }
      
      // Report to debugging element
      const debugPreRender = document.getElementById('debug-pre-render');
      if (debugPreRender) {
        debugPreRender.innerHTML += `<br>ERROR: ${error.message}`;
        debugPreRender.style.background = 'red';
      }
    } catch (e) {
      // Ignore errors in the error handler
      console.warn('Error in error reporting:', e);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-300 rounded-md">
          <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">
            An error occurred while rendering the application. This is likely a bug in the application.
          </p>
          <details className="my-2">
            <summary className="text-red-700 cursor-pointer font-medium">View error details</summary>
            <pre className="bg-red-100 p-2 mt-2 rounded text-red-900 overflow-auto text-sm">
              {this.state.error?.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
          <p className="mt-4 text-sm text-red-500">
            If the problem persists, please try clearing your browser cache and reloading.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 