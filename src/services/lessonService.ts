import { Lesson } from '../types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import api from './apiService';

/**
 * Service for managing lessons via API endpoints
 * This service uses the centralized API service
 * instead of direct Supabase calls, providing a more consistent approach
 * to data access and error handling.
 */
class LessonService {
  /**
   * Get a lesson by ID
   * @param lessonId The ID of the lesson
   * @returns The lesson and its modules
   */
  async getLessonById(lessonId: string) {
    try {
      // API request to get lesson by ID
      const response = await api.get(`/university/lessons/${lessonId}`);
      
      if (!response.success) {
        console.error('Error fetching lesson:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch lesson',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching lesson:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching lesson',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Get lessons by course ID
   * @param courseId The ID of the course
   * @returns The lessons belonging to the course
   */
  async getLessonsByCourse(courseId: string) {
    try {
      // API request to get lessons by course
      const response = await api.get(`/university/courses/${courseId}/lessons`);
      
      if (!response.success) {
        console.error('Error fetching lessons:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to fetch lessons',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching lessons:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error fetching lessons',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Create a new lesson
   * @param lesson The lesson to create
   * @returns The created lesson
   */
  async createLesson(lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // API request to create a lesson
      const response = await api.post('/university/lessons', lesson);
      
      if (!response.success) {
        console.error('Error creating lesson:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to create lesson',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error creating lesson:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error creating lesson',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Update an existing lesson
   * @param lessonId The ID of the lesson to update
   * @param updates The updates to apply
   * @returns The updated lesson
   */
  async updateLesson(lessonId: string, updates: Partial<Omit<Lesson, 'id' | 'created_at' | 'updated_at'>>) {
    try {
      // API request to update a lesson
      const response = await api.put(`/university/lessons/${lessonId}`, updates);
      
      if (!response.success) {
        console.error('Error updating lesson:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to update lesson',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error updating lesson:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error updating lesson',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Delete a lesson
   * @param lessonId The ID of the lesson to delete
   * @returns Success indicator
   */
  async deleteLesson(lessonId: string) {
    try {
      // API request to delete a lesson
      const response = await api.delete(`/university/lessons/${lessonId}`);
      
      if (!response.success) {
        console.error('Error deleting lesson:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to delete lesson',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error deleting lesson:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error deleting lesson',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }

  /**
   * Reorder lessons within a course
   * @param courseId The ID of the course
   * @param lessonIds The ordered list of lesson IDs
   * @returns The updated lessons
   */
  async reorderLessons(courseId: string, lessonIds: string[]) {
    try {
      // API request to reorder lessons
      const response = await api.put(`/university/courses/${courseId}/reorder-lessons`, { lesson_ids: lessonIds });
      
      if (!response.success) {
        console.error('Error reordering lessons:', response.error);
        return { 
          data: null, 
          error: {
            message: response.error?.message || 'Failed to reorder lessons',
            details: response.error?.details || '',
            hint: '',
            code: response.error?.code || 'UNKNOWN_ERROR',
            name: 'PostgrestError',
          } as PostgrestError 
        };
      }

      return { data: response.data, error: null };
    } catch (err) {
      console.error('Unexpected error reordering lessons:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { 
          message: err.message,
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError : { 
          message: 'Unknown error reordering lessons',
          name: 'PostgrestError',
          details: '',
          hint: '',
          code: 'UNKNOWN_ERROR'
        } as PostgrestError
      };
    }
  }
}

export const lessonService = new LessonService(); 