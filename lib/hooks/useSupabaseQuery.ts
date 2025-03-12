'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase-client'
import { withErrorHandling, withRetry, FormattedError } from '@/lib/error-handling'

interface UseSupabaseQueryOptions<T> {
  enabled?: boolean
  retry?: boolean
  maxRetries?: number
  showToastOnError?: boolean
  context?: string
  onSuccess?: (data: T) => void
  onError?: (error: FormattedError) => void
  suspense?: boolean
}

/**
 * Custom hook for handling Supabase queries with error handling
 * 
 * @param queryFn Function that returns a Supabase query
 * @param options Query options
 * @returns Object containing data, error, loading state, and refetch function
 * 
 * @example
 * const { data, error, loading, refetch } = useSupabaseQuery(
 *   () => supabase.from('users').select('id, name, email').eq('id', userId),
 *   { context: 'fetchUserProfile' }
 * );
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: UseSupabaseQueryOptions<T> = {}
) {
  const {
    enabled = true,
    retry = true,
    maxRetries = 3,
    showToastOnError = true,
    context = 'query',
    onSuccess,
    onError,
    suspense = false
  } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<FormattedError | null>(null)
  const [loading, setLoading] = useState<boolean>(!suspense)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let result
      
      if (retry) {
        // Use retry logic for fetching data
        result = await withErrorHandling(
          () => withRetry(() => queryFn(), maxRetries),
          context,
          showToastOnError
        )
      } else {
        // Execute without retry
        result = await withErrorHandling(queryFn, context, showToastOnError)
      }

      if (result.error) {
        setError(result.error)
        onError?.(result.error)
      } else {
        setData(result.data)
        onSuccess?.(result.data as T)
      }
    } catch (err: any) {
      console.error(`Error in ${context} query:`, err)
    } finally {
      setLoading(false)
    }
  }, [queryFn, retry, maxRetries, context, showToastOnError, onSuccess, onError])

  useEffect(() => {
    if (enabled) {
      execute()
    }
  }, [enabled, execute])

  const refetch = useCallback(() => {
    return execute()
  }, [execute])

  return { data, error, loading, refetch }
}

/**
 * Custom hook for handling Supabase mutations with error handling
 * 
 * @param mutationFn Function that returns a Supabase query
 * @param options Mutation options
 * @returns Object containing mutate function, error, and loading state
 * 
 * @example
 * const { mutate, error, loading } = useSupabaseMutation(
 *   (newData) => supabase.from('users').update(newData).eq('id', userId),
 *   { context: 'updateUserProfile' }
 * );
 * 
 * // Then call it like:
 * mutate({ name: 'New Name', email: 'new@example.com' });
 */
export function useSupabaseMutation<T, U = any>(
  mutationFn: (variables: U) => Promise<{ data: T | null; error: any }>,
  options: UseSupabaseQueryOptions<T> = {}
) {
  const {
    retry = false,
    maxRetries = 1,
    showToastOnError = true,
    context = 'mutation',
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<FormattedError | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const mutate = useCallback(
    async (variables: U) => {
      setLoading(true)
      setError(null)

      try {
        let result
        
        if (retry) {
          // Use retry logic for mutations if specified
          result = await withErrorHandling(
            () => withRetry(() => mutationFn(variables), maxRetries),
            context,
            showToastOnError
          )
        } else {
          // Execute without retry
          result = await withErrorHandling(
            () => mutationFn(variables),
            context,
            showToastOnError
          )
        }

        if (result.error) {
          setError(result.error)
          onError?.(result.error)
          return { success: false, error: result.error }
        } else {
          setData(result.data)
          onSuccess?.(result.data as T)
          return { success: true, data: result.data }
        }
      } catch (err: any) {
        console.error(`Error in ${context} mutation:`, err)
        return { success: false, error: err }
      } finally {
        setLoading(false)
      }
    },
    [mutationFn, retry, maxRetries, context, showToastOnError, onSuccess, onError]
  )

  return { mutate, data, error, loading }
}

export default useSupabaseQuery 