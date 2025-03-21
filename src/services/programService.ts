import { BaseDataService } from './baseDataService';
import { Program, Course, Lesson } from '../types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import api from './apiService';
import { storageService } from './storageService';

/**
 * Service for managing programs via API endpoints
 * This service has been refactored to use the centralized API service
 * instead of direct Supabase calls, providing a more consistent approach
 * to data access and error handling.
 */
class ProgramService extends BaseDataService<Program> {
  constructor() {
    super('programs', 'university');
  }

  /**
   * Get programs by department
   * @param departmentId The ID of the department
   * @returns The programs belonging to the department
   */
  async getProgramsByDepartment(departmentId: string): Promise<{
    data: Program[] | null;
    error: PostgrestError | null;
  }> {
    try {
      // API request to get programs by department
      const response = await api.get(`/university/programs/department/${departmentId}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || 'Failed to get programs by department',
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
      console.error('Error in getProgramsByDepartment:', error);
      return {
        data: null,
        error: {
          message: 'Failed to get programs by department',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Create a program with thumbnail
   * @param programData The program data to create
   * @param thumbnailFile Optional thumbnail file to upload
   * @param departmentIds Optional array of department IDs to associate with the program
   * @returns The created program
   */
  async createProgramWithThumbnail(
    programData: Omit<Program, 'id' | 'created_at' | 'updated_at'>,
    thumbnailFile?: File | null,
    departmentIds?: string[]
  ): Promise<{
    success: boolean;
    data: Program | null;
    error: PostgrestError | null;
  }> {
    try {
      let thumbnailUrl = null;
      
      // Step 1: Upload thumbnail if provided
      if (thumbnailFile) {
        console.log('ProgramService: Uploading thumbnail');
        const uploadResult = await storageService.uploadFile(
          'program-thumbnails', // Use the bucket constant directly
          thumbnailFile,
          `program_thumbnails/${Date.now()}_${thumbnailFile.name.replace(/[^a-zA-Z0-9-_.]/g, '_')}`, // Add filename to path for better traceability
          ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] // allowed types
        );
        
        if (!uploadResult.success || uploadResult.error) {
          console.error('ProgramService: Error uploading thumbnail:', uploadResult.error);
          return {
            success: false,
            data: null,
            error: {
              message: 'Failed to upload thumbnail',
              details: uploadResult.error?.message || 'Unknown upload error',
              hint: '',
              code: 'UPLOAD_ERROR',
              name: 'PostgrestError',
            },
          };
        }
        
        // Ensure we have a valid public URL
        if (!uploadResult.data || !uploadResult.data.publicUrl) {
          console.error('ProgramService: Thumbnail upload successful but no public URL returned');
          return {
            success: false,
            data: null,
            error: {
              message: 'Thumbnail upload successful but no URL available',
              details: 'The storage service did not return a public URL',
              hint: '',
              code: 'URL_NOT_AVAILABLE',
              name: 'PostgrestError',
            },
          };
        }
        
        thumbnailUrl = uploadResult.data.publicUrl;
        console.log('ProgramService: Thumbnail uploaded successfully:', thumbnailUrl);
      }
      
      // Step 2: Create program with thumbnail URL
      const programWithThumbnail = {
        ...programData,
        thumbnail_url: thumbnailUrl,
      };
      
      console.log('ProgramService: Creating program with data:', programWithThumbnail);
      const { data: program, error: createError } = await this.create(programWithThumbnail);
      
      if (createError) {
        console.error('ProgramService: Error creating program:', createError);
        return {
          success: false,
          data: null,
          error: createError,
        };
      }
      
      // Step 3: Associate program with departments if provided
      if (departmentIds && departmentIds.length > 0 && program) {
        console.log('ProgramService: Associating program with departments:', departmentIds);
        
        try {
          const departmentRelations = departmentIds.map(departmentId => ({
            program_id: program.id,
            department_id: departmentId
          }));
          
          const response = await api.post('/university/program-departments', departmentRelations);
          
          if (!response.success) {
            console.warn('ProgramService: Warning - Failed to associate program with departments:', response.error);
            // Don't fail the whole operation if department association fails
          }
        } catch (deptError) {
          console.warn('ProgramService: Warning - Error associating program with departments:', deptError);
          // Don't fail the whole operation if department association fails
        }
      }
      
      // Confirm the program has the thumbnail URL set
      if (program && thumbnailUrl && !program.thumbnail_url) {
        console.warn('ProgramService: Warning - Program created but thumbnail_url not set in response');
        // Ensure the returned program has the thumbnail URL
        program.thumbnail_url = thumbnailUrl;
      }
      
      return {
        success: true,
        data: program,
        error: null,
      };
    } catch (error) {
      console.error('ProgramService: Error in createProgramWithThumbnail:', error);
      return {
        success: false,
        data: null,
        error: {
          message: 'Failed to create program with thumbnail',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Get program with all courses, lessons, and modules
   * @param programId The ID of the program
   * @returns The program with all its courses, lessons, and modules
   */
  async getProgramWithCourses(programId: string): Promise<{
    data: (Program & { courses: (Course & { lessons: Lesson[] })[] }) | null;
    error: PostgrestError | null;
  }> {
    try {
      // API request to get program with all related data
      const response = await api.get(`/university/programs/${programId}/complete`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || 'Failed to get program with courses',
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
      console.error('Error in getProgramWithCourses:', error);
      return {
        data: null,
        error: {
          message: 'Failed to get program with courses',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Get published programs
   * @param options Optional parameters for filtering and sorting
   * @returns The published programs
   */
  async getPublishedPrograms(options?: {
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  }): Promise<{
    data: Program[] | null;
    error: PostgrestError | null;
  }> {
    try {
      // API request to get published programs
      const queryParams = new URLSearchParams();
      
      if (options?.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      
      if (options?.orderBy) {
        queryParams.append('orderBy', options.orderBy.column);
        queryParams.append('order', options.orderBy.ascending ? 'asc' : 'desc');
      }
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`/university/programs/published${queryString}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || 'Failed to get published programs',
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
      console.error('Error in getPublishedPrograms:', error);
      return {
        data: null,
        error: {
          message: 'Failed to get published programs',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }

  /**
   * Get programs by creator
   * @param creatorId The ID of the creator
   * @returns The programs created by the specified user
   */
  async getProgramsByCreator(creatorId: string): Promise<{
    data: Program[] | null;
    error: PostgrestError | null;
  }> {
    try {
      // API request to get programs by creator
      const response = await api.get(`/university/programs/creator/${creatorId}`);
      
      if (!response.success) {
        return {
          data: null,
          error: {
            message: response.error?.message || 'Failed to get programs by creator',
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
      console.error('Error in getProgramsByCreator:', error);
      return {
        data: null,
        error: {
          message: 'Failed to get programs by creator',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
  }
}

// Export an instance of the service
export const programService = new ProgramService(); 