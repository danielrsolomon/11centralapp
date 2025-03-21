import { Program, Course, Lesson, Module, UserProgress } from '../types/database.types';
import { api } from './apiService';
import { toast } from 'react-toastify';
import { authService } from './authService';

/**
 * University service for handling all university-related data operations
 * This service has been refactored to use the centralized API service
 * instead of direct Supabase calls, providing a more consistent approach
 * to data access and error handling.
 */

/**
 * Service for interacting with University content through API endpoints
 */
export const universityService = {
  /**
   * Handle authentication errors common to university endpoints
   * @param error The error object
   * @returns A standardized error object
   */
  handleAuthError(error: any) {
    // Check if it's an authentication error
    if (error?.code === 'UNAUTHORIZED' || error?.code === 'INVALID_TOKEN' || error?.message?.includes('Authentication required')) {
      console.error('Authentication error accessing university content:', error);
      
      // Show a user-friendly message
      toast.error('Please log in again to access university content', {
        toastId: 'university-auth-error',
        autoClose: 5000,
      });
      
      // Attempt to refresh the session
      authService.refreshSession().catch(() => {
        // If refresh fails, redirect to login
        console.log('Session refresh failed, redirecting to login');
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      });
      
      return {
        message: 'Authentication required to access university content',
        code: 'AUTH_REQUIRED',
        details: 'Please log in to view this content'
      };
    }
    
    // Return the original error
    return error;
  },
  
  /**
   * Get all published programs
   */
  async getPublishedPrograms() {
    try {
      const response = await api.get('/university/programs/published');
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error('Error in getPublishedPrograms:', error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Get a program by ID
   * @param programId - The ID of the program to fetch
   */
  async getProgram(programId: string) {
    try {
      const response = await api.get(`/university/programs/${programId}`);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in getProgram(${programId}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Get courses by program ID
   * @param programId - The ID of the program
   */
  async getCoursesByProgram(programId: string) {
    try {
      const response = await api.get(`/university/courses/program/${programId}`);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in getCoursesByProgram(${programId}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Get lessons by course ID
   * @param courseId - The ID of the course
   */
  async getLessonsByCourse(courseId: string) {
    try {
      const response = await api.get(`/university/courses/${courseId}/lessons`);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in getLessonsByCourse(${courseId}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Get modules by lesson ID
   * @param lessonId - The ID of the lesson
   */
  async getModulesByLesson(lessonId: string) {
    return api.get(`/university/lessons/${lessonId}/modules`);
  },

  /**
   * Get the complete content hierarchy
   */
  async getContentHierarchy() {
    try {
      const response = await api.get('/university/content/hierarchy');
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error('Error in getContentHierarchy:', error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Get user progress for a specific module
   * @param userId - The user ID
   * @param moduleId - The module ID
   */
  async getUserModuleProgress(userId: string, moduleId: string) {
    try {
      const response = await api.get(`/university/progress/user/${userId}/module/${moduleId}`);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in getUserModuleProgress(${userId}, ${moduleId}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Update user progress for a module
   * @param userId - The user ID
   * @param moduleId - The module ID
   * @param progressData - The progress data to update
   */
  async updateUserModuleProgress(userId: string, moduleId: string, progressData: any) {
    try {
      const response = await api.put(`/university/progress/user/${userId}/module/${moduleId}`, progressData);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in updateUserModuleProgress(${userId}, ${moduleId}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Archive a content item
   * @param id - The content item ID
   * @param type - The type of content (program, course, lesson, module)
   */
  async archiveContent(id: string, type: string) {
    return api.put('/university/content/archive', { id, type });
  },

  /**
   * Restore an archived content item
   * @param id - The content item ID
   * @param type - The type of content (program, course, lesson, module)
   */
  async restoreContent(id: string, type: string) {
    return api.put('/university/content/restore', { id, type });
  },

  /**
   * Get all archived content
   */
  async getArchivedContent() {
    try {
      const response = await api.get('/university/content/archived');
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error('Error in getArchivedContent:', error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },

  /**
   * Store user interaction with content
   * @param userId - The user ID
   * @param contentId - The content ID
   * @param contentType - The content type
   * @param action - The interaction action (view, download, etc.)
   */
  async trackContentInteraction(userId: string, contentId: string, contentType: string, action: string) {
    return api.post('/university/track/interaction', {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      action,
      timestamp: new Date().toISOString(),
    });
  },
  
  /**
   * Get user completion statistics
   * @param userId - The user ID
   */
  async getUserCompletionStats(userId: string) {
    try {
      const response = await api.get(`/university/stats/completion/${userId}`);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in getUserCompletionStats(${userId}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  },
  
  /**
   * Search for content across the university module
   * @param query - The search query
   */
  async searchContent(query: string) {
    try {
      const response = await api.get(`/university/search?query=${encodeURIComponent(query)}`);
      
      if (!response.success && response.error) {
        // Handle authentication errors
        this.handleAuthError(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in searchContent(${query}):`, error);
      return { 
        success: false, 
        error: this.handleAuthError(error)
      };
    }
  }
};

/**
 * Get the complete content hierarchy for the content tree
 * 
 * This method fetches all programs, courses, lessons, and modules
 * and transforms them into a hierarchical structure suitable for display
 * in the ContentTree component.
 * 
 * @returns A promise containing the hierarchical tree structure and any errors
 */
export const getContentHierarchy = async () => {
  try {
    console.log('UniversityService: Fetching content hierarchy');
    
    // Add a timeout to detect network issues early
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await api.get('/university/content/hierarchy', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      // Handle API error response
      if (!response.success) {
        console.error('UniversityService: Error fetching content hierarchy:', response.error);
        return {
          error: response.error?.message || 'Failed to fetch content hierarchy',
          data: [] // Return empty array instead of null
        };
      }
      
      // Handle empty or undefined response
      if (response.data === undefined || response.data === null) {
        console.error('UniversityService: Content hierarchy response data is empty or undefined');
        return {
          error: 'No content data received from server',
          data: [] // Return empty array
        };
      }
      
      // Explicitly check for valid data and provide fallback
      const contentData = response.data || [];
      
      // Verify data is an array
      if (!Array.isArray(contentData)) {
        console.error('UniversityService: Content hierarchy data is not an array:', contentData);
        // Try to fix malformed data if possible
        let fixedData = [];
        if (typeof contentData === 'object' && contentData !== null) {
          // If it's a non-null object, try to extract data property if it exists
          const dataProperty = contentData.data;
          if (Array.isArray(dataProperty)) {
            fixedData = dataProperty;
            console.log('UniversityService: Successfully extracted array from nested data property');
          }
        }
        
        return {
          error: fixedData.length > 0 ? null : 'Invalid content hierarchy format',
          data: fixedData // Return fixed data or empty array
        };
      }
      
      // Success case
      return {
        error: null,
        data: contentData
      };
    } catch (abortError) {
      clearTimeout(timeoutId);
      if ((abortError as Error).name === 'AbortError') {
        console.error('UniversityService: Request timed out after 15 seconds');
        return {
          error: 'Request timed out. Please try again.',
          data: []
        };
      }
      throw abortError; // re-throw for other errors
    }
  } catch (error) {
    console.error('UniversityService: Unexpected error fetching content hierarchy:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error fetching content hierarchy',
      data: [] // Return empty array instead of null
    };
  }
};

/**
 * Reorder content items of a specific type
 * 
 * This method updates the order of a content item (program, course, lesson, or module)
 * in the database to reflect changes made via drag and drop in the UI.
 * 
 * @param itemType The type of content item to reorder ('program', 'course', 'lesson', 'module')
 * @param itemId The ID of the item being reordered
 * @param newOrder The new order value for the item
 * @returns A promise containing success status and any errors
 */
export const reorderContent = async (
  itemType: 'program' | 'course' | 'lesson' | 'module',
  itemId: string,
  newOrder: number
) => {
  try {
    console.log(`UniversityService: Reordering ${itemType} with ID ${itemId} to position ${newOrder}`);
    
    const response = await api.put(`/university/content/${itemType}/${itemId}/reorder`, {
      order: newOrder
    });
    
    if (!response.success) {
      console.error(`UniversityService: Error reordering ${itemType}:`, response.error);
      return {
        error: response.error?.message || `Failed to reorder ${itemType}`,
        success: false
      };
    }
    
    return {
      error: null,
      success: true
    };
  } catch (error) {
    console.error(`UniversityService: Unexpected error reordering ${itemType}:`, error);
    return {
      error: error instanceof Error ? error.message : `Unknown error reordering ${itemType}`,
      success: false
    };
  }
};

/**
 * Batch reorder content items of a specific type
 * 
 * This method updates the order of multiple content items at once,
 * which is more efficient for reordering numerous items after drag and drop.
 * 
 * @param itemType The type of content items to reorder ('program', 'course', 'lesson', 'module')
 * @param items Array of objects containing item IDs and their new order values
 * @returns A promise containing success status and any errors
 */
export const batchReorderContent = async (
  itemType: 'program' | 'course' | 'lesson' | 'module',
  items: Array<{ id: string, order: number }>
) => {
  try {
    console.log(`UniversityService: Batch reordering ${items.length} ${itemType} items`);
    
    const response = await api.put(`/university/content/${itemType}/batch-reorder`, {
      items: items
    });
    
    if (!response.success) {
      console.error(`UniversityService: Error batch reordering ${itemType}:`, response.error);
      return {
        error: response.error?.message || `Failed to batch reorder ${itemType}`,
        success: false
      };
    }
    
    return {
      error: null,
      success: true
    };
  } catch (error) {
    console.error(`UniversityService: Unexpected error batch reordering ${itemType}:`, error);
    return {
      error: error instanceof Error ? error.message : `Unknown error batch reordering ${itemType}`,
      success: false
    };
  }
};

// Get the user's roles
export const getUserRoles = async (userId: string) => {
  try {
    const response = await api.get(`/admin/users-roles/${userId}`);
    
    if (!response.success) {
      console.error('Error fetching user roles:', response.error);
      return { 
        error: response.error?.message || 'Failed to fetch user roles',
        roles: null
      };
    }
    
    // Extract role names for simpler handling
    const roleNames = response.data?.map((role: any) => role.name) || [];
    
    return { roles: roleNames };
  } catch (error) {
    console.error('Unexpected error fetching user roles:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error fetching user roles',
      roles: null
    };
  }
};

/**
 * Archive a content item.
 * This is a standalone function alias for universityService.archiveContent
 * to maintain backward compatibility.
 * 
 * @param id - The content item ID
 * @param type - The type of content (program, course, lesson, module)
 * @returns A promise containing success status and any errors
 */
export const archiveContentItem = async (id: string, type: string) => {
  try {
    const response = await universityService.archiveContent(id, type);
    return {
      success: response.success,
      error: response.error
    };
  } catch (error) {
    console.error('Unexpected error archiving content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error archiving content'
    };
  }
};

// Check if the user is SuperAdmin and assign role if needed
export const checkAndAssignSuperAdmin = async (userId: string) => {
  try {
    const response = await api.get(`/admin/users-roles/check/${userId}/superadmin`);
    
    if (!response.success) {
      console.error('Error checking SuperAdmin status:', response.error);
      return { 
        error: response.error?.message || 'Failed to check SuperAdmin status',
        data: null
      };
    }
    
    return { data: response.data };
  } catch (error) {
    console.error('Unexpected error checking SuperAdmin status:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error checking SuperAdmin status',
      data: null
    };
  }
};
