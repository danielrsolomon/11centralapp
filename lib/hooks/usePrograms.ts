import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import logger from '@/lib/logger';
import { isPermissionError, createPermissionError } from '@/lib/auth/permission-utils';

// Define the types for program data
export interface Program {
  id: string;
  title: string;
  description: string;
  status: string;
  thumbnail_url?: string;
  department_id?: string;
  department_name?: string;
  departments?: string[];
  courses_count?: number;
  total_courses?: number;
  completion_percentage?: number;
  completed_courses?: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  archived_at?: string;
  archived_by?: string;
}

// Define the types for API responses
export interface ProgramsResponse {
  programs: Program[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
  };
  debug?: any; // For optional debug information
}

// Define the types for filter options
export interface ProgramFilters {
  departmentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  adminView?: boolean;
  searchQuery?: string;
  debug?: boolean; // Add debug option
}

/**
 * Default fetcher function for useSWR with enhanced error handling
 * 
 * @param url - The URL to fetch data from
 * @returns The parsed JSON response
 * @throws Error if the request fails
 */
const fetcher = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache' // Ensure fresh data
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      error.message = `${error.message} - ${errorText}`;
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error fetching data from API', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Custom hook to fetch and manage program data.
 * Uses the /api/learning/programs API endpoint.
 * 
 * @param filters - Object containing filter parameters
 * @returns Object with program data, loading state, error state, and CRUD functions
 */
export function usePrograms(filters: ProgramFilters = {}) {
  // Construct the API URL with filters
  const {
    departmentId,
    status,
    limit = 50,
    offset = 0,
    includeArchived = false,
    adminView = true,
    searchQuery = '',
    debug = false
  } = filters;
  
  // Build the query string
  const queryParams = new URLSearchParams();
  if (departmentId) queryParams.set('departmentId', departmentId);
  if (status) queryParams.set('status', status);
  queryParams.set('limit', limit.toString());
  queryParams.set('offset', offset.toString());
  queryParams.set('includeArchived', includeArchived.toString());
  queryParams.set('adminView', adminView.toString());
  if (debug) queryParams.set('debug', 'true');
  
  const apiUrl = `/api/learning/programs?${queryParams.toString()}`;
  
  // Cache key for mutations to use
  const cacheKeyPrefix = '/api/learning/programs';
  
  // Fetch programs with useSWR
  const { data, error, isLoading, isValidating, mutate: refreshPrograms } = useSWR<ProgramsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 401 (Unauthorized) or 403 (Forbidden)
        if (error.status === 401 || error.status === 403) return;
        
        // Only retry up to 3 times
        if (retryCount >= 3) return;
        
        // Retry after an increasing delay
        setTimeout(() => revalidate({ retryCount }), 3000 * (retryCount + 1));
      }
    }
  );
  
  // Log debug information if enabled
  useCallback(() => {
    if (debug && data?.debug) {
      logger.debug('Programs API debug info', data.debug);
    }
  }, [data, debug]);
  
  // Filter programs client-side by searchQuery if provided
  const filteredPrograms = data?.programs.filter(program => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      program.title.toLowerCase().includes(query) ||
      program.description.toLowerCase().includes(query) ||
      program.department_name?.toLowerCase().includes(query)
    );
  }) || [];
  
  /**
   * Create a new program
   * 
   * @param programData - The program data to create
   * @returns The created program
   * @throws Error if creation fails
   */
  const createProgram = useCallback(async (programData: Partial<Program>) => {
    try {
      logger.debug('Creating program', programData);
      
      const response = await fetch('/api/learning/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(programData),
      });

      // Handle 403 error specifically to avoid triggering auth errors
      if (response.status === 403) {
        // Parse the error response
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Permission denied' };
        }
        
        // Log the permission error but don't broadcast it as an auth error
        logger.warn('Permission denied for program creation', {
          status: response.status,
          error: errorData?.error || 'Permission denied',
          details: errorData?.details || 'You do not have permission to create programs',
          requiresAuth: errorData?.requiresAuth,
        });
        
        // Create a proper error object that won't trigger session termination
        throw createPermissionError(errorData?.details || 'You do not have permission to create programs');
      }
      
      // Handle other errors
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || 'Unknown error';
        } catch (e) {
          errorText = await response.text();
        }
        
        throw new Error(`Failed to create program: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      // Invalidate all program cache keys to ensure fresh data everywhere
      await mutate((key) => typeof key === 'string' && key.startsWith(cacheKeyPrefix), undefined, { revalidate: true });
      
      logger.debug('Program created successfully', { id: result.program.id });
      return result.program;
    } catch (error) {
      logger.error('Error creating program', error as Error);
      throw error;
    }
  }, [cacheKeyPrefix]);
  
  /**
   * Update an existing program
   * 
   * @param programId - The ID of the program to update
   * @param programData - The program data to update
   * @returns The updated program
   * @throws Error if update fails
   */
  const updateProgram = useCallback(async (programId: string, programData: Partial<Program>) => {
    try {
      logger.debug('Updating program', { id: programId, updates: Object.keys(programData) });
      
      const response = await fetch(`/api/learning/programs/${programId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(programData)
      });
      
      // Handle 403 errors specifically for permission issues
      if (response.status === 403) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Permission denied' };
        }
        
        logger.warn('Permission denied for program update', {
          programId,
          status: response.status,
          error: errorData?.error,
          details: errorData?.details,
        });
        
        throw createPermissionError(errorData?.details || 'You do not have permission to update this program');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update program: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      // Invalidate all program cache keys to ensure fresh data everywhere
      await mutate((key) => typeof key === 'string' && key.startsWith(cacheKeyPrefix), undefined, { revalidate: true });
      
      logger.debug('Program updated successfully', { id: programId });
      return result.program;
    } catch (error) {
      logger.error('Error updating program', error as Error);
      throw error;
    }
  }, [cacheKeyPrefix]);
  
  /**
   * Archive a program
   * 
   * @param programId - The ID of the program to archive
   * @returns The archived program
   * @throws Error if archiving fails
   */
  const archiveProgram = useCallback(async (programId: string) => {
    try {
      logger.debug('Archiving program', { id: programId });
      
      const response = await fetch(`/api/learning/programs/${programId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to archive program: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      // Invalidate all program cache keys to ensure fresh data everywhere
      await mutate((key) => typeof key === 'string' && key.startsWith(cacheKeyPrefix), undefined, { revalidate: true });
      
      logger.debug('Program archived successfully', { id: programId });
      return result.program;
    } catch (error) {
      logger.error('Error archiving program', error as Error);
      throw error;
    }
  }, [cacheKeyPrefix]);
  
  /**
   * Delete a program
   * 
   * @param programId - The ID of the program to delete
   * @param permanent - Whether to permanently delete or just mark as deleted
   * @returns Success status
   * @throws Error if deletion fails
   */
  const deleteProgram = useCallback(async (programId: string, permanent: boolean = false) => {
    try {
      logger.debug('Deleting program', { id: programId, permanent });
      
      const url = `/api/learning/programs/${programId}${permanent ? '?permanent=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      // Handle 403 errors specifically for permission issues
      if (response.status === 403) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Permission denied' };
        }
        
        logger.warn('Permission denied for program deletion', {
          programId,
          status: response.status,
          error: errorData?.error,
          details: errorData?.details,
        });
        
        throw createPermissionError(errorData?.details || 'You do not have permission to delete this program');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete program: ${response.status} ${errorText}`);
      }
      
      // Invalidate all program cache keys to ensure fresh data everywhere
      await mutate((key) => typeof key === 'string' && key.startsWith(cacheKeyPrefix), undefined, { revalidate: true });
      
      logger.debug('Program deleted successfully', { id: programId });
    } catch (error) {
      logger.error('Error deleting program', error as Error);
      throw error;
    }
  }, [cacheKeyPrefix]);
  
  /**
   * Restore an archived program
   * 
   * @param program - The program to restore
   * @throws Error if restoration fails
   */
  const restoreProgram = useCallback(async (program: Program) => {
    try {
      logger.debug('Restoring program', { id: program.id, title: program.title });
      
      const response = await fetch(`/api/learning/programs/${program.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to restore program: ${response.status} ${errorText}`);
      }
      
      // Invalidate all program cache keys to ensure fresh data everywhere
      await mutate((key) => typeof key === 'string' && key.startsWith(cacheKeyPrefix), undefined, { revalidate: true });
      
      logger.debug('Program restored successfully', { id: program.id });
    } catch (error) {
      logger.error('Error restoring program', error as Error);
      throw error;
    }
  }, [cacheKeyPrefix]);
  
  return {
    programs: filteredPrograms,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    refreshPrograms,
    createProgram,
    updateProgram,
    archiveProgram,
    deleteProgram,
    restoreProgram
  };
} 