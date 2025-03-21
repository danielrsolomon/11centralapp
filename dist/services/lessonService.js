"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lessonService = void 0;
const apiService_1 = __importDefault(require("./apiService"));
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
    async getLessonById(lessonId) {
        try {
            // API request to get lesson by ID
            const response = await apiService_1.default.get(`/university/lessons/${lessonId}`);
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error fetching lesson:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error fetching lesson',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Get lessons by course ID
     * @param courseId The ID of the course
     * @returns The lessons belonging to the course
     */
    async getLessonsByCourse(courseId) {
        try {
            // API request to get lessons by course
            const response = await apiService_1.default.get(`/university/courses/${courseId}/lessons`);
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error fetching lessons:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error fetching lessons',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Create a new lesson
     * @param lesson The lesson to create
     * @returns The created lesson
     */
    async createLesson(lesson) {
        try {
            // API request to create a lesson
            const response = await apiService_1.default.post('/university/lessons', lesson);
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error creating lesson:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error creating lesson',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Update an existing lesson
     * @param lessonId The ID of the lesson to update
     * @param updates The updates to apply
     * @returns The updated lesson
     */
    async updateLesson(lessonId, updates) {
        try {
            // API request to update a lesson
            const response = await apiService_1.default.put(`/university/lessons/${lessonId}`, updates);
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error updating lesson:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error updating lesson',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Delete a lesson
     * @param lessonId The ID of the lesson to delete
     * @returns Success indicator
     */
    async deleteLesson(lessonId) {
        try {
            // API request to delete a lesson
            const response = await apiService_1.default.delete(`/university/lessons/${lessonId}`);
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error deleting lesson:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error deleting lesson',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
    /**
     * Reorder lessons within a course
     * @param courseId The ID of the course
     * @param lessonIds The ordered list of lesson IDs
     * @returns The updated lessons
     */
    async reorderLessons(courseId, lessonIds) {
        try {
            // API request to reorder lessons
            const response = await apiService_1.default.put(`/university/courses/${courseId}/reorder-lessons`, { lesson_ids: lessonIds });
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
                    }
                };
            }
            return { data: response.data, error: null };
        }
        catch (err) {
            console.error('Unexpected error reordering lessons:', err);
            return {
                data: null,
                error: err instanceof Error ? {
                    message: err.message,
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                } : {
                    message: 'Unknown error reordering lessons',
                    name: 'PostgrestError',
                    details: '',
                    hint: '',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    }
}
exports.lessonService = new LessonService();
//# sourceMappingURL=lessonService.js.map