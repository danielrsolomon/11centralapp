"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseService = void 0;
const apiService_1 = __importDefault(require("./apiService"));
/**
 * Service for managing courses via API endpoints
 * This service has been refactored to use the centralized API service
 * instead of direct Supabase calls, providing a more consistent approach
 * to data access and error handling.
 */
class CourseService {
    /**
     * Get all courses for a specific program
     * @param programId The ID of the program
     * @returns The courses belonging to the program
     */
    async getCoursesByProgram(programId) {
        try {
            // API request to get courses by program
            const response = await apiService_1.default.get(`/university/courses/program/${programId}`);
            if (!response.success) {
                console.error('Error fetching courses:', response.error);
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to fetch courses',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error fetching courses:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error fetching courses',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Get a course by ID, optionally including its modules
     * @param courseId The ID of the course
     * @param includeModules Whether to include the course's modules
     * @returns The course and optionally its modules
     */
    async getCourseById(courseId, includeModules = false) {
        try {
            // API request to get course by ID
            const endpoint = includeModules
                ? `/university/courses/${courseId}?includeModules=true`
                : `/university/courses/${courseId}`;
            const response = await apiService_1.default.get(endpoint);
            if (!response.success) {
                console.error('Error fetching course:', response.error);
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to fetch course',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error fetching course:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error fetching course',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Get all modules for a specific course
     * @param courseId The ID of the course
     * @returns The modules belonging to the course
     */
    async getCourseModules(courseId) {
        try {
            // API request to get modules by course
            const response = await apiService_1.default.get(`/university/courses/${courseId}/modules`);
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error fetching modules:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error fetching modules',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Create a new course
     * @param course The course to create
     * @returns The created course
     */
    async createCourse(course) {
        try {
            // API request to create a course
            const response = await apiService_1.default.post('/university/courses', course);
            if (!response.success) {
                console.error('Error creating course:', response.error);
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to create course',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error creating course:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error creating course',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Update an existing course
     * @param courseId The ID of the course to update
     * @param updates The updates to apply
     * @returns The updated course
     */
    async updateCourse(courseId, updates) {
        try {
            // API request to update a course
            const response = await apiService_1.default.put(`/university/courses/${courseId}`, updates);
            if (!response.success) {
                console.error('Error updating course:', response.error);
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to update course',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error updating course:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error updating course',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Delete a course
     * @param courseId The ID of the course to delete
     * @returns Success indicator
     */
    async deleteCourse(courseId) {
        try {
            // API request to delete a course
            const response = await apiService_1.default.delete(`/university/courses/${courseId}`);
            if (!response.success) {
                console.error('Error deleting course:', response.error);
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to delete course',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error deleting course:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error deleting course',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Reorder courses within a program
     * @param programId The ID of the program
     * @param courseIds The ordered list of course IDs
     * @returns The updated courses
     */
    async reorderCourses(programId, courseIds) {
        try {
            // API request to reorder courses
            const response = await apiService_1.default.put(`/university/programs/${programId}/reorder-courses`, { course_ids: courseIds });
            if (!response.success) {
                console.error('Error reordering courses:', response.error);
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to reorder courses',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error reordering courses:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error reordering courses',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
}
exports.courseService = new CourseService();
//# sourceMappingURL=courseService.js.map