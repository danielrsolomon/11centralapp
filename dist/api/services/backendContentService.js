"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendContentService = void 0;
const supabaseAdmin_1 = require("../supabaseAdmin");
/**
 * Backend Content Service for handling content-related operations
 */
exports.backendContentService = {
    /**
     * Get content hierarchy
     * @returns ServiceResponse with hierarchical content tree data
     */
    async getContentHierarchy() {
        try {
            console.log('BackendContentService: Fetching content hierarchy data');
            // Fetch programs with courses, lessons, and modules
            const { data: programs, error: programsError } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .select(`
          id, 
          title, 
          description,
          thumbnail_url,
          published,
          order,
          courses (
            id, 
            title, 
            description,
            order,
            published,
            lessons (
              id, 
              title, 
              description,
              order,
              published,
              modules (
                id, 
                title, 
                description,
                order
              )
            )
          )
        `)
                .order('order', { ascending: true });
            if (programsError) {
                console.error('BackendContentService: Error fetching programs for hierarchy', programsError);
                return { data: null, error: programsError };
            }
            if (!programs || !Array.isArray(programs)) {
                console.error('BackendContentService: Programs data is not an array or is empty');
                return {
                    data: [],
                    error: new Error('Invalid programs data format')
                };
            }
            // Transform the data into a hierarchical tree structure
            const contentTree = programs.map((program) => {
                const programItem = {
                    id: program.id,
                    title: program.title,
                    type: 'program',
                    description: program.description,
                    thumbnail_url: program.thumbnail_url,
                    published: program.published,
                    order: program.order,
                    children: []
                };
                if (program.courses && Array.isArray(program.courses)) {
                    programItem.children = program.courses.map((course) => {
                        const courseItem = {
                            id: course.id,
                            title: course.title,
                            type: 'course',
                            description: course.description,
                            parent_id: program.id,
                            published: course.published,
                            order: course.order,
                            children: []
                        };
                        if (course.lessons && Array.isArray(course.lessons)) {
                            courseItem.children = course.lessons.map((lesson) => {
                                const lessonItem = {
                                    id: lesson.id,
                                    title: lesson.title,
                                    type: 'lesson',
                                    description: lesson.description,
                                    parent_id: course.id,
                                    published: lesson.published,
                                    order: lesson.order,
                                    children: []
                                };
                                if (lesson.modules && Array.isArray(lesson.modules)) {
                                    lessonItem.children = lesson.modules.map((module) => {
                                        return {
                                            id: module.id,
                                            title: module.title,
                                            type: 'module',
                                            description: module.description,
                                            parent_id: lesson.id,
                                            order: module.order,
                                            children: []
                                        };
                                    }).sort((a, b) => (a.order || 0) - (b.order || 0));
                                }
                                return lessonItem;
                            }).sort((a, b) => (a.order || 0) - (b.order || 0));
                        }
                        return courseItem;
                    }).sort((a, b) => (a.order || 0) - (b.order || 0));
                }
                return programItem;
            }).sort((a, b) => (a.order || 0) - (b.order || 0));
            console.log(`BackendContentService: Successfully built content tree with ${contentTree.length} programs`);
            return { data: contentTree, error: null };
        }
        catch (error) {
            console.error('BackendContentService: Unexpected error in getContentHierarchy', error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Get all programs
     * @param filterPublished - When true, only returns published programs
     * @returns ServiceResponse with array of programs
     */
    async getAllPrograms(filterPublished = false) {
        try {
            console.log(`BackendContentService: Fetching all programs${filterPublished ? ' (published only)' : ''}`);
            let query = supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .select('*')
                .order('order', { ascending: true });
            if (filterPublished) {
                query = query.eq('published', true);
            }
            const { data, error } = await query;
            if (error) {
                console.error('BackendContentService: Error fetching programs', error);
                return { data: null, error };
            }
            return { data: data || [], error: null };
        }
        catch (error) {
            console.error('BackendContentService: Unexpected error in getAllPrograms', error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Get a program by ID
     * @param programId - The ID of the program to fetch
     * @param includeCourses - When true, includes associated courses
     * @returns ServiceResponse with the program data
     */
    async getProgramById(programId, includeCourses = false) {
        try {
            console.log(`BackendContentService: Fetching program ${programId}${includeCourses ? ' with courses' : ''}`);
            const query = includeCourses
                ? supabaseAdmin_1.supabaseAdmin
                    .from('programs')
                    .select(`
              *,
              courses (
                *
              )
            `)
                    .eq('id', programId)
                    .single()
                : supabaseAdmin_1.supabaseAdmin
                    .from('programs')
                    .select('*')
                    .eq('id', programId)
                    .single();
            const { data, error } = await query;
            if (error) {
                console.error(`BackendContentService: Error fetching program ${programId}`, error);
                return { data: null, error };
            }
            return { data, error: null };
        }
        catch (error) {
            console.error(`BackendContentService: Unexpected error in getProgramById ${programId}`, error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Get programs by department
     * @param departmentId - The ID of the department
     * @returns ServiceResponse with array of programs in the department
     */
    async getProgramsByDepartment(departmentId) {
        try {
            console.log(`BackendContentService: Fetching programs for department ${departmentId}`);
            const { data, error } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .select('*')
                .eq('department_id', departmentId)
                .order('order', { ascending: true });
            if (error) {
                console.error(`BackendContentService: Error fetching programs for department ${departmentId}`, error);
                return { data: null, error };
            }
            return { data: data || [], error: null };
        }
        catch (error) {
            console.error(`BackendContentService: Unexpected error in getProgramsByDepartment ${departmentId}`, error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Create a new program
     * @param programData - The program data to create
     * @returns ServiceResponse with the created program
     */
    async createProgram(programData) {
        try {
            console.log(`BackendContentService: Creating program "${programData.title}"`);
            const { data, error } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .insert(programData)
                .select()
                .single();
            if (error) {
                console.error('BackendContentService: Error creating program', error);
                return { data: null, error };
            }
            return { data, error: null };
        }
        catch (error) {
            console.error('BackendContentService: Unexpected error in createProgram', error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Update an existing program
     * @param programId - The ID of the program to update
     * @param programData - The updated program data
     * @returns ServiceResponse with the updated program
     */
    async updateProgram(programId, programData) {
        try {
            console.log(`BackendContentService: Updating program ${programId}`);
            const { data, error } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .update(programData)
                .eq('id', programId)
                .select()
                .single();
            if (error) {
                console.error(`BackendContentService: Error updating program ${programId}`, error);
                return { data: null, error };
            }
            return { data, error: null };
        }
        catch (error) {
            console.error(`BackendContentService: Unexpected error in updateProgram ${programId}`, error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Delete a program
     * @param programId - The ID of the program to delete
     * @returns ServiceResponse with the deletion result
     */
    async deleteProgram(programId) {
        try {
            console.log(`BackendContentService: Deleting program ${programId}`);
            // First check if the program exists
            const { data: existingProgram, error: checkError } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .select('id')
                .eq('id', programId)
                .single();
            if (checkError) {
                console.error(`BackendContentService: Error checking program ${programId}`, checkError);
                return { data: null, error: checkError };
            }
            if (!existingProgram) {
                console.error(`BackendContentService: Program ${programId} not found`);
                return { data: null, error: new Error('Program not found') };
            }
            const { error: deleteError } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .delete()
                .eq('id', programId);
            if (deleteError) {
                console.error(`BackendContentService: Error deleting program ${programId}`, deleteError);
                return { data: null, error: deleteError };
            }
            return { data: { id: programId }, error: null };
        }
        catch (error) {
            console.error(`BackendContentService: Unexpected error in deleteProgram ${programId}`, error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
    /**
     * Reorder programs
     * @param programIds - Array of program IDs in the desired order
     * @returns ServiceResponse with the updated programs
     */
    async reorderPrograms(programIds) {
        try {
            console.log(`BackendContentService: Reordering ${programIds.length} programs`);
            const updates = programIds.map((id, index) => ({
                id,
                order: index
            }));
            const { data, error } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .upsert(updates)
                .select();
            if (error) {
                console.error('BackendContentService: Error reordering programs', error);
                return { data: null, error };
            }
            return { data: data || [], error: null };
        }
        catch (error) {
            console.error('BackendContentService: Unexpected error in reorderPrograms', error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }
};
//# sourceMappingURL=backendContentService.js.map