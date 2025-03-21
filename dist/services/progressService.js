"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressService = void 0;
const supabase_1 = require("./supabase");
const baseDataService_1 = require("./baseDataService");
class ProgressService extends baseDataService_1.BaseDataService {
    constructor() {
        super('user_progress');
    }
    /**
     * Get a user's progress for a specific program
     */
    async getUserProgramProgress(userId, programId) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('user_program_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('program_id', programId)
                .maybeSingle();
            return { data, error };
        }
        catch (error) {
            console.error('Error in getUserProgramProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to get user program progress',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Get all progress records for a user across all programs
     */
    async getAllUserProgress(userId) {
        try {
            return await supabase_1.supabase
                .from('user_program_progress')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
        }
        catch (error) {
            console.error('Error in getAllUserProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to get all user progress',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Get a user's progress for a specific module
     */
    async getModuleProgress(userId, moduleId) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('module_id', moduleId)
                .maybeSingle();
            return { data, error };
        }
        catch (error) {
            console.error('Error in getModuleProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to get module progress',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Update a user's progress for a module
     */
    async updateModuleProgress(userId, moduleId, updates) {
        try {
            // First check if a progress record exists
            const { data: existingProgress, error: checkError } = await this.getModuleProgress(userId, moduleId);
            if (checkError) {
                return { data: null, error: checkError };
            }
            if (existingProgress) {
                // Update existing record
                return await supabase_1.supabase
                    .from('user_progress')
                    .update(updates)
                    .eq('user_id', userId)
                    .eq('module_id', moduleId)
                    .select()
                    .single();
            }
            else {
                // Create new record
                return await supabase_1.supabase
                    .from('user_progress')
                    .insert({
                    user_id: userId,
                    module_id: moduleId,
                    ...updates,
                    attempts: updates.attempts || 1,
                    status: updates.status || 'in_progress',
                    completion_percentage: updates.completion_percentage || 0,
                })
                    .select()
                    .single();
            }
        }
        catch (error) {
            console.error('Error in updateModuleProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to update module progress',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Mark a module as completed
     */
    async completeModule(progressId, progressData) {
        try {
            // First, get the current progress entry to access user_id and program_id
            const { data: existingProgress, error: fetchError } = await supabase_1.supabase
                .from('user_progress')
                .select('*, module:modules(course:courses(program_id))')
                .eq('id', progressId)
                .single();
            if (fetchError) {
                console.error('Error fetching progress for completion:', fetchError);
                return {
                    data: null,
                    error: fetchError
                };
            }
            if (!existingProgress) {
                return {
                    data: null,
                    error: {
                        message: 'Progress entry not found',
                        details: `No progress found with ID ${progressId}`,
                        hint: '',
                        code: 'NOT_FOUND',
                        name: 'PostgrestError',
                    }
                };
            }
            // Update the progress to completed
            const { data, error } = await supabase_1.supabase
                .from('user_progress')
                .update({
                ...progressData,
                status: 'completed',
                completion_percentage: 100,
                completed_at: progressData.completed_at || new Date().toISOString(),
            })
                .eq('id', progressId)
                .select()
                .single();
            if (error) {
                return { data: null, error };
            }
            // Extract program_id from the nested join
            const programId = existingProgress.module?.course?.program_id;
            // If we have a program ID, calculate program progress
            if (programId && existingProgress.user_id) {
                console.log(`Calculating program progress for user ${existingProgress.user_id} and program ${programId}`);
                // Don't await this to prevent blocking the response
                // We want to update program progress asynchronously
                this.calculateProgramProgress(existingProgress.user_id, programId)
                    .then(result => {
                    if (result.error) {
                        console.error('Error calculating program progress:', result.error);
                    }
                    else {
                        console.log(`Program progress updated: ${result.data?.completionPercentage}%`);
                    }
                })
                    .catch(err => {
                    console.error('Unexpected error calculating program progress:', err);
                });
            }
            return { data, error: null };
        }
        catch (error) {
            console.error('Error in completeModule:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to complete module',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Calculate and update program progress based on module completions
     */
    async calculateProgramProgress(userId, programId) {
        try {
            console.log(`Calculating program progress for user ${userId} and program ${programId}`);
            const startTime = Date.now();
            // Use a more efficient query with a single DB call to get all required modules
            // Instead of separate queries for courses, lessons, and modules
            const { data: programModules, error: modulesError } = await supabase_1.supabase
                .from('modules')
                .select(`
          id,
          is_required,
          courses!inner(id, program_id)
        `)
                .eq('courses.program_id', programId)
                .eq('is_required', true);
            if (modulesError) {
                console.error('Error fetching program modules:', modulesError);
                return { data: null, error: modulesError };
            }
            if (!programModules || programModules.length === 0) {
                console.log('No required modules found for program');
                return {
                    data: { completionPercentage: 0, isCompleted: false },
                    error: null
                };
            }
            // Extract all module IDs
            const moduleIds = programModules.map(module => module.id);
            const totalModules = moduleIds.length;
            console.log(`Found ${totalModules} required modules for program`);
            // Get completed modules using a single query with the 'in' operator
            const { data: completedModules, error: progressError } = await supabase_1.supabase
                .from('user_progress')
                .select('module_id')
                .eq('user_id', userId)
                .in('module_id', moduleIds)
                .eq('status', 'completed');
            if (progressError) {
                console.error('Error fetching completed modules:', progressError);
                return { data: null, error: progressError };
            }
            const completedCount = completedModules?.length || 0;
            const completionPercentage = totalModules > 0
                ? Math.round((completedCount / totalModules) * 100)
                : 0;
            const isCompleted = completionPercentage === 100;
            console.log(`User completed ${completedCount}/${totalModules} modules (${completionPercentage}%)`);
            // Update user_program_progress with a single upsert operation
            const { error: updateError } = await supabase_1.supabase
                .from('user_program_progress')
                .upsert({
                user_id: userId,
                program_id: programId,
                status: isCompleted ? 'completed' : 'in_progress',
                completion_percentage: completionPercentage,
                started_at: new Date().toISOString(),
                completed_at: isCompleted ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,program_id',
                ignoreDuplicates: false
            });
            if (updateError) {
                console.error('Error updating program progress:', updateError);
                return { data: null, error: updateError };
            }
            const endTime = Date.now();
            console.log(`Program progress calculation completed in ${endTime - startTime}ms`);
            return {
                data: {
                    completionPercentage,
                    isCompleted
                },
                error: null
            };
        }
        catch (error) {
            console.error('Error in calculateProgramProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to calculate program progress',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Get progress entry by ID
     */
    async getProgressById(progressId, userId) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('user_progress')
                .select('*')
                .eq('id', progressId)
                .maybeSingle();
            return { data, error };
        }
        catch (error) {
            console.error('Error in getProgressById:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to get progress by ID',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Create a new progress entry
     */
    async createProgress(progressData) {
        try {
            return await supabase_1.supabase
                .from('user_progress')
                .insert({
                ...progressData,
                attempts: progressData.attempts || 1,
                completion_percentage: progressData.completion_percentage || 0,
            })
                .select()
                .single();
        }
        catch (error) {
            console.error('Error in createProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to create progress entry',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Delete a progress entry
     */
    async deleteProgress(progressId) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('user_progress')
                .delete()
                .eq('id', progressId)
                .select()
                .single();
            return { data, error };
        }
        catch (error) {
            console.error('Error in deleteProgress:', error);
            return {
                data: null,
                error: {
                    message: 'Failed to delete progress entry',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
}
// Export singleton instance
exports.progressService = new ProgressService();
//# sourceMappingURL=progressService.js.map