import { Module } from '../types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import api from './apiService';

/**
 * Service for managing modules (lessons and content units) via API endpoints
 * This service has been refactored to use the centralized API service
 * instead of direct Supabase calls, providing a more consistent approach
 * to data access and error handling.
 */
class ModuleService {
  /**
   * Get a module by ID
   * @param moduleId The ID of the module
   * @returns The module
   */
  async getModuleById(moduleId: string) {
    try {
      // API request to get a module by ID
      const response = await api.get(`/university/modules/${moduleId}`);
      
      if (!response.success) {
        console.error('Error fetching module:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch module',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching module:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching module',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Get modules by course ID
   * @param courseId The ID of the course
   * @returns The modules belonging to the course
   */
  async getModulesByCourse(courseId: string) {
    try {
      // API request to get modules by course
      const response = await api.get(`/university/courses/${courseId}/modules`);
      
      if (!response.success) {
        console.error('Error fetching modules:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch modules',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching modules:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching modules',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Create a new module
   * @param module The module to create
   * @returns The created module
   */
  async createModule(module: Omit<Module, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // API request to create a module
      const response = await api.post('/university/modules', module);
      
      if (!response.success) {
        console.error('Error creating module:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to create module',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error creating module:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error creating module',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Update an existing module
   * @param moduleId The ID of the module to update
   * @param updates The updates to apply
   * @returns The updated module
   */
  async updateModule(moduleId: string, updates: Partial<Omit<Module, 'id' | 'created_at' | 'updated_at'>>) {
    try {
      // API request to update a module
      const response = await api.put(`/university/modules/${moduleId}`, updates);
      
      if (!response.success) {
        console.error('Error updating module:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to update module',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error updating module:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error updating module',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Delete a module
   * @param moduleId The ID of the module to delete
   * @returns Success indicator
   */
  async deleteModule(moduleId: string) {
    try {
      // API request to delete a module
      const response = await api.delete(`/university/modules/${moduleId}`);
      
      if (!response.success) {
        console.error('Error deleting module:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to delete module',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error deleting module:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error deleting module',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Reorder modules within a course
   * @param courseId The ID of the course
   * @param moduleIds The ordered list of module IDs
   * @returns The updated modules
   */
  async reorderModules(courseId: string, moduleIds: string[]) {
    try {
      // API request to reorder modules
      const response = await api.put(`/university/courses/${courseId}/reorder-modules`, { module_ids: moduleIds });
      
      if (!response.success) {
        console.error('Error reordering modules:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to reorder modules',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error reordering modules:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error reordering modules',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Get modules by type
   * @param moduleType The type of modules to get
   * @returns The modules of the specified type
   */
  async getModulesByType(moduleType: string) {
    try {
      // API request to get modules by type
      const response = await api.get(`/university/modules/type/${moduleType}`);
      
      if (!response.success) {
        console.error('Error fetching modules by type:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch modules by type',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching modules by type:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching modules by type',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Get modules by lesson ID
   * @param lessonId The ID of the lesson
   * @returns The modules belonging to the lesson
   */
  async getModulesByLesson(lessonId: string) {
    try {
      // API request to get modules by lesson
      const response = await api.get(`/university/modules?lessonId=${lessonId}`);
      
      if (!response.success) {
        console.error('Error fetching modules by lesson:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch modules by lesson',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching modules by lesson:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching modules by lesson',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Get all modules
   * @returns All modules
   */
  async getAllModules() {
    try {
      // API request to get all modules
      const response = await api.get('/university/modules');
      
      if (!response.success) {
        console.error('Error fetching all modules:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch all modules',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching all modules:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching all modules',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }
}

export const moduleService = new ModuleService(); 