/**
 * @deprecated This service is deprecated and will be removed in a future version.
 * It makes direct Supabase database calls which violates the API-first architecture.
 * 
 * For new development, use the API service layer instead:
 * import { api } from './apiService';
 * 
 * Example of proper API-first approach:
 *   // Instead of using baseDataService methods
 *   const { data, error } = await programService.getAll();
 * 
 *   // Use apiService methods
 *   const { data, error } = await api.get('/university/programs');
 * 
 * This service will be maintained only for legacy components until they can be migrated.
 */

import { PostgrestError } from '@supabase/supabase-js';
import api from './apiService';

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Base service class for data operations
 * @deprecated Use API service instead of direct database access
 */
export class BaseDataService<T extends BaseEntity> {
  protected tableName: string;
  protected baseEndpoint: string;

  constructor(tableName: string, modulePrefix: string = '') {
    this.tableName = tableName;
    // Create endpoint based on table name, e.g., 'programs' -> '/university/programs'
    this.baseEndpoint = modulePrefix ? `/${modulePrefix}/${tableName}` : `/${tableName}`;
  }

  /**
   * Get all records with optional filtering
   */
  async getAll(options?: {
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const queryParams = new URLSearchParams();
      
      // Apply filters if provided
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          queryParams.append(`filter[${key}]`, value.toString());
        });
      }

      // Apply ordering if provided
      if (options?.orderBy) {
        queryParams.append('orderBy', options.orderBy.column);
        queryParams.append('order', options.orderBy.ascending ? 'asc' : 'desc');
      }

      // Apply limit if provided
      if (options?.limit) {
        queryParams.append('limit', options.limit.toString());
      }

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`${this.baseEndpoint}${queryString}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || 'Failed to fetch data',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          },
        };
      }
      
      return {
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: 'Failed to fetch data',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string): Promise<{ data: T | null; error: PostgrestError | null }> {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const response = await api.get(`${this.baseEndpoint}/${id}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || `Failed to fetch ${this.tableName} by ID`,
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          },
        };
      }
      
      return {
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: `Failed to fetch ${this.tableName} by ID`,
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Create a new record
   */
  async create(record: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: T | null; error: PostgrestError | null }> {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const response = await api.post(this.baseEndpoint, record);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || `Failed to create ${this.tableName}`,
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          },
        };
      }
      
      return {
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: `Failed to create ${this.tableName}`,
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Update an existing record
   */
  async update(id: string, updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<{ data: T | null; error: PostgrestError | null }> {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const response = await api.put(`${this.baseEndpoint}/${id}`, updates);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || `Failed to update ${this.tableName}`,
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          },
        };
      }
      
      return {
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: `Failed to update ${this.tableName}`,
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<{ data: T | null; error: PostgrestError | null }> {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const response = await api.delete(`${this.baseEndpoint}/${id}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || `Failed to delete ${this.tableName}`,
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          },
        };
      }
      
      return {
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: `Failed to delete ${this.tableName}`,
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Get records with search on specified columns
   */
  async search(
    searchTerm: string,
    columns: string[],
    options?: { limit?: number }
  ): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const queryParams = new URLSearchParams();
      
      queryParams.append('searchTerm', searchTerm);
      queryParams.append('columns', columns.join(','));
      
      // Apply limit if provided
      if (options?.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`${this.baseEndpoint}/search${queryString}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || `Failed to search ${this.tableName}`,
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          },
        };
      }
      
      return {
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: `Failed to search ${this.tableName}`,
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }
} 