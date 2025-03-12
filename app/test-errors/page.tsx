'use client'

import { ErrorHandlingExample } from '@/components/examples/error-handling-example'
import { ErrorMessage, ErrorState } from '@/components/ui/error-display'
import { ErrorCategory, ErrorSeverity, FormattedError } from '@/lib/error-handling'
import Link from 'next/link'

export default function TestErrorsPage() {
  // Create sample errors for demonstration
  const authError: FormattedError = {
    message: 'Your session has expired. Please sign in again.',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    actionable: true,
    actions: [
      {
        label: 'Sign In',
        action: () => alert('Would navigate to sign in page')
      }
    ]
  }
  
  const validationError: FormattedError = {
    message: 'The email address you entered is not valid.',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    actionable: true
  }
  
  const serverError: FormattedError = {
    message: 'Unable to process your request due to a server error.',
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.ERROR,
    actionable: false
  }
  
  const notFoundError: FormattedError = {
    message: 'The requested profile could not be found.',
    category: ErrorCategory.NOT_FOUND,
    severity: ErrorSeverity.INFO,
    actionable: false
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Handling System Demo</h1>
        <p className="text-lg text-gray-600">
          This page demonstrates the error handling components and utilities.
        </p>
        <Link href="/dashboard" className="text-[#AE9773] hover:underline mt-2 inline-block">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Inline Error Messages</h2>
          <div className="space-y-6">
            <div>
              <p className="mb-2 font-medium">Authentication Error:</p>
              <ErrorMessage error={authError} />
            </div>
            <div>
              <p className="mb-2 font-medium">Validation Error:</p>
              <ErrorMessage error={validationError} />
            </div>
            <div>
              <p className="mb-2 font-medium">Server Error:</p>
              <ErrorMessage error={serverError} />
            </div>
            <div>
              <p className="mb-2 font-medium">Not Found Error:</p>
              <ErrorMessage error={notFoundError} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Error States</h2>
          <div className="space-y-6">
            <div>
              <p className="mb-2 font-medium">Authentication Error State:</p>
              <div className="border border-gray-200 rounded-md p-4">
                <ErrorState error={authError} />
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium">Server Error State:</p>
              <div className="border border-gray-200 rounded-md p-4">
                <ErrorState 
                  error={serverError} 
                  title="Server Communication Error" 
                  onRetry={() => alert('Retry clicked')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-12">
        <h2 className="text-xl font-semibold mb-4">Live Error Handling Example</h2>
        <p className="mb-4 text-gray-600">
          This example demonstrates the error handling with live Supabase queries.
          Try entering non-existent IDs or clicking the error trigger button.
        </p>
        <div className="border border-gray-200 rounded-md p-4">
          <ErrorHandlingExample />
        </div>
      </div>
    </div>
  )
} 