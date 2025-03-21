"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentService = void 0;
const supabaseAdmin_1 = require("../supabaseAdmin");
exports.contentService = {
    /**
     * Get the complete content hierarchy for the content tree
     *
     * This method fetches all programs, courses, lessons, and modules
     * and transforms them into a hierarchical structure suitable for display
     * in the ContentTree component.
     *
     * @returns A promise containing the hierarchical tree structure and any errors
     */
    getContentHierarchy: async () => {
        try {
            console.log('Server ContentService: Fetching content hierarchy');
            // Get all published programs with sorting by order
            const { data: programs, error: programsError } = await supabaseAdmin_1.supabaseAdmin
                .from('programs')
                .select('id, title, order, status')
                .eq('status', 'published')
                .order('order', { ascending: true });
            if (programsError) {
                console.error('Server ContentService: Error fetching programs:', programsError);
                return {
                    error: programsError.message || 'Failed to fetch programs',
                    data: []
                };
            }
            if (!programs || programs.length === 0) {
                // Return empty array if no programs found
                return {
                    error: null,
                    data: []
                };
            }
            // Build the hierarchical tree structure
            const tree = await Promise.all(programs.map(async (program) => {
                try {
                    // Get courses for this program
                    const { data: courses, error: coursesError } = await supabaseAdmin_1.supabaseAdmin
                        .from('courses')
                        .select('id, title, order, status')
                        .eq('program_id', program.id)
                        .order('order', { ascending: true });
                    if (coursesError) {
                        console.error(`Server ContentService: Error fetching courses for program ${program.id}:`, coursesError);
                        return {
                            id: program.id,
                            title: program.title,
                            type: 'program',
                            parentId: null,
                            order: program.order,
                            status: program.status,
                            children: []
                        };
                    }
                    // Build courses with their lessons
                    const coursesWithLessons = await Promise.all((courses || []).map(async (course) => {
                        try {
                            // Get lessons for this course
                            const { data: lessons, error: lessonsError } = await supabaseAdmin_1.supabaseAdmin
                                .from('lessons')
                                .select('id, title, order, status')
                                .eq('course_id', course.id)
                                .order('order', { ascending: true });
                            if (lessonsError) {
                                console.error(`Server ContentService: Error fetching lessons for course ${course.id}:`, lessonsError);
                                return {
                                    id: course.id,
                                    title: course.title,
                                    type: 'course',
                                    parentId: program.id,
                                    order: course.order,
                                    status: course.status,
                                    children: []
                                };
                            }
                            // Build lessons with their modules
                            const lessonsWithModules = await Promise.all((lessons || []).map(async (lesson) => {
                                try {
                                    // Get modules for this lesson
                                    const { data: modules, error: modulesError } = await supabaseAdmin_1.supabaseAdmin
                                        .from('modules')
                                        .select('id, title, order, status')
                                        .eq('lesson_id', lesson.id)
                                        .order('order', { ascending: true });
                                    if (modulesError) {
                                        console.error(`Server ContentService: Error fetching modules for lesson ${lesson.id}:`, modulesError);
                                        return {
                                            id: lesson.id,
                                            title: lesson.title,
                                            type: 'lesson',
                                            parentId: course.id,
                                            order: lesson.order,
                                            status: lesson.status,
                                            children: []
                                        };
                                    }
                                    // Return lesson with its modules
                                    return {
                                        id: lesson.id,
                                        title: lesson.title,
                                        type: 'lesson',
                                        parentId: course.id,
                                        order: lesson.order,
                                        status: lesson.status,
                                        children: (modules || []).map(module => ({
                                            id: module.id,
                                            title: module.title,
                                            type: 'module',
                                            parentId: lesson.id,
                                            order: module.order,
                                            status: module.status
                                        }))
                                    };
                                }
                                catch (lessonError) {
                                    console.error(`Server ContentService: Error processing lesson ${lesson.id}:`, lessonError);
                                    // Return a valid lesson object despite the error
                                    return {
                                        id: lesson.id,
                                        title: lesson.title,
                                        type: 'lesson',
                                        parentId: course.id,
                                        order: lesson.order,
                                        status: lesson.status,
                                        children: []
                                    };
                                }
                            }));
                            // Return course with its lessons
                            return {
                                id: course.id,
                                title: course.title,
                                type: 'course',
                                parentId: program.id,
                                order: course.order,
                                status: course.status,
                                children: lessonsWithModules
                            };
                        }
                        catch (courseError) {
                            console.error(`Server ContentService: Error processing course ${course.id}:`, courseError);
                            // Return a valid course object despite the error
                            return {
                                id: course.id,
                                title: course.title,
                                type: 'course',
                                parentId: program.id,
                                order: course.order,
                                status: course.status,
                                children: []
                            };
                        }
                    }));
                    // Return program with its courses
                    return {
                        id: program.id,
                        title: program.title,
                        type: 'program',
                        parentId: null,
                        order: program.order,
                        status: program.status,
                        children: coursesWithLessons
                    };
                }
                catch (programError) {
                    console.error(`Server ContentService: Error processing program ${program.id}:`, programError);
                    // Return a valid program object despite the error
                    return {
                        id: program.id,
                        title: program.title,
                        type: 'program',
                        parentId: null,
                        order: program.order,
                        status: program.status,
                        children: []
                    };
                }
            }));
            return {
                error: null,
                data: tree || [] // Ensure we always return an array
            };
        }
        catch (error) {
            console.error('Server ContentService: Error building content hierarchy:', error);
            return {
                error: error instanceof Error ? error.message : 'Unknown error building content hierarchy',
                data: [] // Return empty array instead of null
            };
        }
    }
};
//# sourceMappingURL=contentService.js.map