"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.programService = exports.ProgramService = exports.updateProgramSchema = exports.createProgramSchema = void 0;
const supabase_1 = require("../../services/supabase");
const zod_1 = require("zod");
/**
 * Validation schemas for Programs
 */
exports.createProgramSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    thumbnail_url: zod_1.z.string().url('Invalid thumbnail URL').optional(),
    published: zod_1.z.boolean().default(false),
    order: zod_1.z.number().int().nonnegative().optional()
});
exports.updateProgramSchema = exports.createProgramSchema.partial();
/**
 * Backend service for Programs entity
 *
 * This service encapsulates all database operations for the Programs entity
 * and follows the service layer architecture pattern.
 */
class ProgramService {
    /**
     * Get all programs with optional ordering
     */
    async getAllPrograms() {
        try {
            // Order by the order field if it exists
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .select('*')
                .order('order', { ascending: true });
            return { data, error };
        }
        catch (error) {
            console.error('Error in getAllPrograms:', error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error fetching programs',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
    /**
     * Get a single program by ID with its associated courses
     */
    async getProgramById(id) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .select(`
          *, 
          courses(id, title, order)
        `)
                .eq('id', id)
                .single();
            return { data, error };
        }
        catch (error) {
            console.error(`Error in getProgramById(${id}):`, error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error fetching program',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
    /**
     * Get published programs (for students)
     */
    async getPublishedPrograms() {
        try {
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .select('*')
                .eq('published', true)
                .order('order', { ascending: true });
            return { data, error };
        }
        catch (error) {
            console.error('Error in getPublishedPrograms:', error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error fetching published programs',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
    /**
     * Create a new program
     */
    async createProgram(programData) {
        try {
            // Validate input data against schema
            const validationResult = exports.createProgramSchema.safeParse(programData);
            if (!validationResult.success) {
                return {
                    data: null,
                    error: {
                        message: 'Invalid program data',
                        details: JSON.stringify(validationResult.error.format()),
                        hint: '',
                        code: 'VALIDATION_ERROR',
                        name: 'PostgrestError'
                    }
                };
            }
            // Ensure published has a default value if not provided
            const programToCreate = {
                ...programData,
                published: programData.published ?? false // Use nullish coalescing to provide default
            };
            // Get the maximum order value to place new program at the end
            const { data: maxOrderResult, error: maxOrderError } = await supabase_1.supabase
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
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .insert(programToCreate)
                .select()
                .single();
            return { data, error };
        }
        catch (error) {
            console.error('Error in createProgram:', error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error creating program',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
    /**
     * Update an existing program
     */
    async updateProgram(id, programData) {
        try {
            // Validate input data against schema
            const validationResult = exports.updateProgramSchema.safeParse(programData);
            if (!validationResult.success) {
                return {
                    data: null,
                    error: {
                        message: 'Invalid program data',
                        details: JSON.stringify(validationResult.error.format()),
                        hint: '',
                        code: 'VALIDATION_ERROR',
                        name: 'PostgrestError'
                    }
                };
            }
            // Check if program exists before attempting to update
            const { data: existingProgram, error: checkError } = await supabase_1.supabase
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
                    }
                };
            }
            // Update the program in the database
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .update(programData)
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        }
        catch (error) {
            console.error(`Error in updateProgram(${id}):`, error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error updating program',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
    /**
     * Delete a program
     */
    async deleteProgram(id) {
        try {
            // Check if program exists before attempting to delete
            const { data: existingProgram, error: checkError } = await supabase_1.supabase
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
                    }
                };
            }
            // Check if there are courses using this program
            // This prevents deletion of programs that are in use
            const { data: courses, error: courseError } = await supabase_1.supabase
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
                    }
                };
            }
            // Delete the program from the database
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .delete()
                .eq('id', id);
            return { data, error };
        }
        catch (error) {
            console.error(`Error in deleteProgram(${id}):`, error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error deleting program',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
    /**
     * Reorder programs
     */
    async reorderPrograms(programIds) {
        try {
            // Verify all programs exist before attempting to reorder
            const { data: programs, error: programError } = await supabase_1.supabase
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
                    }
                };
            }
            // Verify all provided programs exist in the database
            const existingProgramIds = programs.map((p) => p.id);
            const invalidPrograms = programIds.filter((id) => !existingProgramIds.includes(id));
            if (invalidPrograms.length > 0) {
                return {
                    data: null,
                    error: {
                        message: `Some program IDs are invalid: ${invalidPrograms.join(', ')}`,
                        details: '',
                        hint: '',
                        code: 'INVALID_PROGRAMS',
                        name: 'PostgrestError'
                    }
                };
            }
            // Update order for each program
            const updatePromises = programIds.map((id, index) => supabase_1.supabase
                .from('programs')
                .update({ order: index })
                .eq('id', id));
            await Promise.all(updatePromises);
            // Fetch the updated programs to return in response
            const { data, error } = await supabase_1.supabase
                .from('programs')
                .select('id, title, order')
                .order('order', { ascending: true });
            return { data, error };
        }
        catch (error) {
            console.error('Error in reorderPrograms:', error);
            return {
                data: null,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error reordering programs',
                    details: error instanceof Error ? error.stack : '',
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError'
                }
            };
        }
    }
}
exports.ProgramService = ProgramService;
// Export a singleton instance
exports.programService = new ProgramService();
//# sourceMappingURL=programService.js.map