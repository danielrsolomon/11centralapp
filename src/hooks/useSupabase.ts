import { useState, useEffect } from 'react';
import { PostgrestError } from '@supabase/supabase-js';

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: PostgrestError | null;
}

/**
 * A hook to handle Supabase queries with loading and error states
 * @param queryFn The function that returns a Promise with the Supabase query result
 * @param deps Dependencies array that will trigger a refetch when changed (similar to useEffect)
 * @returns An object containing the data, loading state, and error
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  deps: any[] = []
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const { data, error } = await queryFn();

        if (isMounted) {
          setState({
            data,
            isLoading: false,
            error,
          });
        }
      } catch (err) {
        console.error('Error in useSupabaseQuery:', err);
        
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: {
              message: 'An unexpected error occurred',
              details: err instanceof Error ? err.message : String(err),
              hint: '',
              code: 'UNKNOWN_ERROR',
              name: 'PostgrestError',
            },
          });
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, deps);

  return state;
}

/**
 * A hook to handle Supabase mutations with loading and error states
 * @returns An object with the mutate function and current state
 */
export function useSupabaseMutation<T, P>(
  mutationFn: (params: P) => Promise<{ data: T | null; error: PostgrestError | null }>
) {
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: PostgrestError | null;
  }>({
    data: null,
    isLoading: false,
    error: null,
  });

  const mutate = async (params: P) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await mutationFn(params);
      
      setState({
        data,
        isLoading: false,
        error,
      });

      return { data, error };
    } catch (err) {
      console.error('Error in useSupabaseMutation:', err);
      
      const error = {
        message: 'An unexpected error occurred',
        details: err instanceof Error ? err.message : String(err),
        hint: '',
        code: 'UNKNOWN_ERROR',
        name: 'PostgrestError',
      };
      
      setState({
        data: null,
        isLoading: false,
        error,
      });

      return { data: null, error };
    }
  };

  return { mutate, ...state };
} 