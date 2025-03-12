'use client'

import { Toaster } from 'react-hot-toast'

/**
 * Toast provider component for displaying notifications
 * Place at the root of your application
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default styles for all toasts
        style: {
          background: '#FFFFFF',
          color: '#333333',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
          padding: '12px 16px',
        },
        // Custom styles for different toast types
        success: {
          style: {
            background: '#ecfdf3',
            color: '#166534',
            border: '1px solid #dcfce7',
          },
          iconTheme: {
            primary: '#166534',
            secondary: '#dcfce7',
          },
        },
        error: {
          style: {
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fee2e2',
          },
          iconTheme: {
            primary: '#b91c1c',
            secondary: '#fee2e2',
          },
        },
        loading: {
          style: {
            background: '#f3f4f6',
            color: '#4b5563',
            border: '1px solid #e5e7eb',
          },
        },
        // Duration settings
        duration: 3000, // Default duration
      }}
    />
  )
} 