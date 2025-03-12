'use client'

import React from 'react'
import { FormattedError, ErrorSeverity } from '@/lib/error-handling'
import { AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  error: FormattedError
  onRetry?: () => void
  className?: string
}

/**
 * Inline error message component - used within forms or content areas
 */
export function ErrorMessage({ error, onRetry, className = '' }: ErrorMessageProps) {
  if (!error) return null

  const getIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return <XCircle className="h-5 w-5 text-red-600" />
      case ErrorSeverity.WARNING:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case ErrorSeverity.INFO:
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getColorClass = () => {
    switch (error.severity) {
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return 'bg-red-50 text-red-700 border-red-200'
      case ErrorSeverity.WARNING:
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case ErrorSeverity.INFO:
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className={`rounded-md p-3 mb-4 border ${getColorClass()} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <p className="font-medium">{error.message}</p>
          {error.actionable && error.actions && error.actions.length > 0 && (
            <div className="mt-2 flex space-x-3">
              {error.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className="text-sm font-medium underline hover:opacity-80"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center text-sm font-medium underline hover:opacity-80"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Error state for empty state or error pages
 */
export function ErrorState({
  error,
  onRetry,
  title,
  className = ''
}: ErrorMessageProps & { title?: string }) {
  if (!error) return null

  const getIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return <XCircle className="h-12 w-12 text-red-600" />
      case ErrorSeverity.WARNING:
        return <AlertTriangle className="h-12 w-12 text-amber-500" />
      case ErrorSeverity.INFO:
      default:
        return <Info className="h-12 w-12 text-blue-500" />
    }
  }

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="flex justify-center">{getIcon()}</div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {title || 'Something went wrong'}
      </h3>
      <p className="mt-2 text-base text-gray-600">{error.message}</p>
      <div className="mt-6">
        {error.actionable && error.actions && error.actions.length > 0 && (
          <div className="flex justify-center space-x-4">
            {error.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.action}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#AE9773] hover:bg-[#8E7A5F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AE9773]"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AE9773]"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Loading and error state wrapper for async data
 */
export function AsyncStateWrapper<T>({
  data,
  error,
  loading,
  onRetry,
  children,
  loadingComponent,
  emptyMessage = 'No data available'
}: {
  data: T | null
  error: FormattedError | null
  loading: boolean
  onRetry?: () => void
  children: (data: T) => React.ReactNode
  loadingComponent?: React.ReactNode
  emptyMessage?: string
}) {
  if (loading) {
    return loadingComponent || (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#AE9773]" />
      </div>
    )
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  if (!data) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children(data)}</>
}

/**
 * Error boundary component to catch rendering errors
 */
export class ErrorBoundary extends React.Component<
  { fallback?: React.ReactNode; children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const error: FormattedError = {
        message: 'A rendering error occurred. Please try refreshing the page.',
        technicalDetails: this.state.error,
        category: 'UNKNOWN' as any,
        severity: 'ERROR' as any,
        actionable: true,
        actions: [
          {
            label: 'Refresh Page',
            action: () => window.location.reload()
          }
        ]
      }

      return <ErrorState error={error} />
    }

    return this.props.children
  }
} 