'use client'

import React, { useState } from 'react'
import { useSupabaseQuery, useSupabaseMutation } from '@/lib/hooks/useSupabaseQuery'
import supabase from '@/lib/supabase-client'
import { ErrorMessage, AsyncStateWrapper } from '@/components/ui/error-display'
import { toast } from 'react-hot-toast'

/**
 * Example component demonstrating the use of the error handling system
 * This component shows different ways to handle errors in Supabase queries
 */
export function ErrorHandlingExample() {
  const [userId, setUserId] = useState<string>('')
  
  // Example of a read query with error handling
  const {
    data: user,
    error: userError,
    loading: userLoading,
    refetch: refetchUser
  } = useSupabaseQuery(
    // This query may fail if the user ID doesn't exist
    () => supabase.from('users').select('id, first_name, last_name, email').eq('id', userId).execute(),
    {
      enabled: !!userId, // Only run when userId is present
      context: 'fetchUserProfile',
      showToastOnError: true,
      retry: true,
      maxRetries: 2,
      onSuccess: (data) => {
        toast.success('User data loaded successfully!')
      }
    }
  )

  // Example of a mutation with error handling
  const {
    mutate: updateUser,
    error: updateError,
    loading: updateLoading
  } = useSupabaseMutation(
    // Update user function
    (userData: { first_name?: string; last_name?: string }) => 
      supabase.from('users').update(userData).eq('id', userId),
    {
      context: 'updateUserProfile',
      onSuccess: () => {
        toast.success('User updated successfully!')
        refetchUser() // Refresh user data after update
      }
    }
  )

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetchUser()
  }

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    updateUser({
      first_name: formData.get('firstName') as string,
      last_name: formData.get('lastName') as string
    })
  }

  // Intentional error example
  const triggerError = () => {
    // This will fail because 'non_existent_table' doesn't exist
    supabase
      .from('non_existent_table')
      .select('*')
      .execute()
      .then(({ data, error }) => {
        // The error will be handled by our withErrorHandling utility
        console.log('This should not execute if there is an error')
      })
      .catch(err => {
        // Our global error handler will also catch this
        console.error('Caught error:', err)
      })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Error Handling Examples</h1>
      
      {/* User Lookup Form */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">User Lookup</h2>
        <form onSubmit={handleUserSearch} className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773]"
              placeholder="Enter user ID"
            />
          </div>
          <button
            type="submit"
            disabled={!userId || userLoading}
            className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E7A5F] focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:ring-offset-2 disabled:opacity-50"
          >
            {userLoading ? 'Loading...' : 'Lookup User'}
          </button>
        </form>

        {/* Display user data or error */}
        <div className="mt-6">
          <AsyncStateWrapper
            data={user}
            error={userError}
            loading={userLoading}
            onRetry={refetchUser}
            emptyMessage="No user data found"
          >
            {(userData) => (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium">{userData.first_name} {userData.last_name}</h3>
                <p className="text-gray-600">{userData.email}</p>
                <p className="text-sm text-gray-500">ID: {userData.id}</p>
              </div>
            )}
          </AsyncStateWrapper>
        </div>
      </div>

      {/* User Update Form - only show if we have user data */}
      {user && (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Update User</h2>
          {updateError && <ErrorMessage error={updateError} />}
          
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                defaultValue={user.first_name || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773]"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                defaultValue={user.last_name || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773]"
              />
            </div>
            <button
              type="submit"
              disabled={updateLoading}
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E7A5F] focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:ring-offset-2 disabled:opacity-50"
            >
              {updateLoading ? 'Updating...' : 'Update User'}
            </button>
          </form>
        </div>
      )}

      {/* Error triggering examples */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Error Triggers</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Database Error</h3>
            <button
              onClick={triggerError}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Trigger Database Error
            </button>
            <p className="mt-2 text-sm text-gray-500">
              This will try to query a non-existent table to demonstrate error handling.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 