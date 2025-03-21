import { supabase } from '../../services/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Validation schemas for Programs
 */
export const createProgramSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  thumbnail_url: z.string().url('Invalid thumbnail URL').optional(),
  published: z.boolean().default(false),
  order: z.number().int().nonnegative().optional()
});

export const updateProgramSchema = createProgramSchema.partial();

export type Program = {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  published: boolean;
  order?: number;
  created_at: string;
  updated_at: string;
};

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

/**
 * Backend service for Programs entity
 * 
 * This service encapsulates all database operations for the Programs entity
 * and follows the service layer architecture pattern.
 */
export class ProgramService {
  /**
   * Get all programs with optional ordering
   */
  async getAllPrograms() {
    try {
      // Order by the order field if it exists
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('order', { ascending: true });
      
      return { data, error };
    } catch (error) {
      console.error('Error in getAllPrograms:', error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error fetching programs',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }

  /**
   * Get a single program by ID with its associated courses
   */
  async getProgramById(id: string) {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          *, 
          courses(id, title, order)
        `)
        .eq('id', id)
        .single();
      
      return { data, error };
    } catch (error) {
      console.error(`Error in getProgramById(${id}):`, error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error fetching program',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }

  /**
   * Get published programs (for students)
   */
  async getPublishedPrograms() {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('published', true)
        .order('order', { ascending: true });
      
      return { data, error };
    } catch (error) {
      console.error('Error in getPublishedPrograms:', error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error fetching published programs',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }

  /**
   * Create a new program
   */
  async createProgram(programData: CreateProgramInput) {
    try {
      // Validate input data against schema
      const validationResult = createProgramSchema.safeParse(programData);
      if (!validationResult.success) {
        return {
          data: null,
          error: {
            message: 'Invalid program data',
            details: JSON.stringify(validationResult.error.format()),
            hint: '',
            code: 'VALIDATION_ERROR',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }

      // Ensure published has a default value if not provided
      const programToCreate = {
        ...programData,
        published: programData.published ?? false // Use nullish coalescing to provide default
      };

      // Get the maximum order value to place new program at the end
      const { data: maxOrderResult, error: maxOrderError } = await supabase
        .from('programs')
        .select('order')
        .order('order', { ascending: false })
        .limit(1);
      
      if (maxOrderError) {
        console.error('Error fetching max order for programs:', maxOrderError);
      }
      
      // Set order to max + 1 if not provided
      if (programToCreate.order === undefined) {
        programToCreate.order = maxOrderResult && maxOrderResult.length > 0
          ? (maxOrderResult[0].order || 0) + 1
          : 0;
      }

      // Insert the program into the database
      const { data, error } = await supabase
        .from('programs')
        .insert(programToCreate)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error in createProgram:', error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error creating program',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }

  /**
   * Update an existing program
   */
  async updateProgram(id: string, programData: UpdateProgramInput) {
    try {
      // Validate input data against schema
      const validationResult = updateProgramSchema.safeParse(programData);
      if (!validationResult.success) {
        return {
          data: null,
          error: {
            message: 'Invalid program data',
            details: JSON.stringify(validationResult.error.format()),
            hint: '',
            code: 'VALIDATION_ERROR',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }

      // Check if program exists before attempting to update
      const { data: existingProgram, error: checkError } = await supabase
        .from('programs')
        .select('id')
        .eq('id', id)
        .single();
      
      // Handle case where program doesn't exist
      if (checkError || !existingProgram) {
        return {
          data: null,
          error: {
            message: 'Program not found',
            details: '',
            hint: '',
            code: 'PROGRAM_NOT_FOUND',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }

      // Update the program in the database
      const { data, error } = await supabase
        .from('programs')
        .update(programData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error(`Error in updateProgram(${id}):`, error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error updating program',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }

  /**
   * Delete a program
   */
  async deleteProgram(id: string) {
    try {
      // Check if program exists before attempting to delete
      const { data: existingProgram, error: checkError } = await supabase
        .from('programs')
        .select('id')
        .eq('id', id)
        .single();
      
      // Handle case where program doesn't exist
      if (checkError || !existingProgram) {
        return {
          data: null,
          error: {
            message: 'Program not found',
            details: '',
            hint: '',
            code: 'PROGRAM_NOT_FOUND',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }
      
      // Check if there are courses using this program
      // This prevents deletion of programs that are in use
      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('program_id', id)
        .limit(1);
        
      if (!courseError && courses && courses.length > 0) {
        return {
          data: null,
          error: {
            message: 'Cannot delete a program with associated courses',
            details: '',
            hint: 'Remove associated courses first',
            code: 'PROGRAM_HAS_COURSES',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }
      
      // Delete the program from the database
      const { data, error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error(`Error in deleteProgram(${id}):`, error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error deleting program',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }

  /**
   * Reorder programs
   */
  async reorderPrograms(programIds: string[]) {
    try {
      // Verify all programs exist before attempting to reorder
      const { data: programs, error: programError } = await supabase
        .from('programs')
        .select('id');
      
      // Handle database errors
      if (programError) {
        return {
          data: null,
          error: programError
        };
      }
      
      if (!programs) {
        return {
          data: null,
          error: {
            message: 'No programs found',
            details: '',
            hint: '',
            code: 'NO_PROGRAMS_FOUND',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }
      
      // Verify all provided programs exist in the database
      const existingProgramIds = programs.map((p: { id: string }) => p.id);
      const invalidPrograms = programIds.filter((id: string) => !existingProgramIds.includes(id));
      
      if (invalidPrograms.length > 0) {
        return {
          data: null,
          error: {
            message: `Some program IDs are invalid: ${invalidPrograms.join(', ')}`,
            details: '',
            hint: '',
            code: 'INVALID_PROGRAMS',
            name: 'PostgrestError'
          } as PostgrestError
        };
      }
      
      // Update order for each program
      const updatePromises = programIds.map((id: string, index: number) => 
        supabase
          .from('programs')
          .update({ order: index })
          .eq('id', id)
      );
      
      await Promise.all(updatePromises);
      
      // Fetch the updated programs to return in response
      const { data, error } = await supabase
        .from('programs')
        .select('id, title, order')
        .order('order', { ascending: true });
      
      return { data, error };
    } catch (error) {
      console.error('Error in reorderPrograms:', error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error reordering programs',
          details: error instanceof Error ? error.stack : '',
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        } as PostgrestError
      };
    }
  }
}

// Export a singleton instance
export const programService = new ProgramService(); 