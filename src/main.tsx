import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
// Import Bootstrap CSS if installed
import 'bootstrap/dist/css/bootstrap.min.css'

// Add global error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[GLOBAL ERROR]', message, source, lineno, colno, error);
  return false;
};

// Find the root element
const rootElement = document.getElementById("root");

// Check if root element exists
if (!rootElement) {
  console.error('[FATAL] Root element not found!');
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Notify without using window properties
    if (typeof window !== 'undefined' && 'reactRendered' in window && typeof window.reactRendered === 'function') {
      try {
        window.reactRendered();
      } catch (e) {
        console.error('Error calling reactRendered:', e);
      }
    }
  } catch (error) {
    console.error('[RENDER ERROR]', error);
  }
}
