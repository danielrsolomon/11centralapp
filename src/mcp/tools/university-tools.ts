import { MCPTool } from '../types';
import { programService } from '../../services/programService';
import { courseService } from '../../services/courseService';
import { moduleService } from '../../services/moduleService';
import { progressService } from '../../services/progressService';

// Helper function to format data
const formatData = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    return `[Unserializable data: ${error.message}]`;
  }
};

// Programs
export const getPrograms: MCPTool = {
  name: 'getPrograms',
  description: 'Get all training programs',
  inputSchema: {
    type: 'object',
    properties: {
      departmentId: { type: 'string' },
      status: { type: 'string' },
      limit: { type: 'number' }
    }
  },
  handler: async (args) => {
    try {
      const { departmentId, status, limit } = args || {};
      const filters: Record<string, any> = {};
      
      if (departmentId) {
        filters.departments = departmentId;
      }
      
      if (status) {
        filters.status = status;
      }
      
      const { data, error } = await programService.getAll({
        filters,
        limit: limit || 100,
        orderBy: { column: 'created_at', ascending: false }
      });
      
      if (error) throw error;
      
      return {
        content: [{ type: 'text', text: formatData(data) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error fetching programs: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

export const createProgram: MCPTool = {
  name: 'createProgram',
  description: 'Create a new training program',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      departments: { 
        type: 'array',
        items: { type: 'string' }
      },
      status: { type: 'string' },
      thumbnail_url: { type: 'string' }
    },
    required: ['title', 'description', 'departments']
  },
  handler: async (args) => {
    try {
      const programData = {
        title: args.title,
        description: args.description,
        departments: args.departments,
        status: args.status || 'draft',
        thumbnail_url: args.thumbnail_url
      };
      
      const { data, error } = await programService.create(programData);
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully created program "${args.title}":\n${formatData(data)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error creating program: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

// Courses
export const getCourses: MCPTool = {
  name: 'getCourses',
  description: 'Get courses from a program',
  inputSchema: {
    type: 'object',
    properties: {
      programId: { type: 'string' },
      status: { type: 'string' }
    },
    required: ['programId']
  },
  handler: async (args) => {
    try {
      const { programId, status } = args;
      const filters: Record<string, any> = {
        program_id: programId
      };
      
      if (status) {
        filters.status = status;
      }
      
      const { data, error } = await courseService.getAll({
        filters,
        orderBy: { column: 'order_index', ascending: true }
      });
      
      if (error) throw error;
      
      return {
        content: [{ type: 'text', text: formatData(data) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error fetching courses: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

export const createCourse: MCPTool = {
  name: 'createCourse',
  description: 'Create a new course in a program',
  inputSchema: {
    type: 'object',
    properties: {
      programId: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      thumbnail_url: { type: 'string' },
      status: { type: 'string' },
      order_index: { type: 'number' }
    },
    required: ['programId', 'title', 'description']
  },
  handler: async (args) => {
    try {
      const courseData = {
        program_id: args.programId,
        title: args.title,
        description: args.description,
        thumbnail_url: args.thumbnail_url,
        status: args.status || 'draft',
        order_index: args.order_index || 0
      };
      
      const { data, error } = await courseService.create(courseData);
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully created course "${args.title}" in program ${args.programId}:\n${formatData(data)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error creating course: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

// User Progress
export const getUserProgress: MCPTool = {
  name: 'getUserProgress',
  description: 'Get a user\'s progress in courses and modules',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      courseId: { type: 'string' }
    },
    required: ['userId']
  },
  handler: async (args) => {
    try {
      const { userId, courseId } = args;
      
      let result;
      if (courseId) {
        // Get progress for a specific course
        const { data, error } = await progressService.getUserCourseProgress(userId, courseId);
        if (error) throw error;
        result = data;
      } else {
        // Get overall progress
        const { data, error } = await progressService.getUserProgress(userId);
        if (error) throw error;
        result = data;
      }
      
      return {
        content: [{ type: 'text', text: formatData(result) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error fetching user progress: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

export const updateProgress: MCPTool = {
  name: 'updateProgress',
  description: 'Update a user\'s progress in a module or lesson',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      moduleId: { type: 'string' },
      lessonId: { type: 'string' },
      completed: { type: 'boolean' },
      score: { type: 'number' }
    },
    required: ['userId', 'moduleId', 'lessonId', 'completed']
  },
  handler: async (args) => {
    try {
      const { userId, moduleId, lessonId, completed, score } = args;
      
      const progressData = {
        user_id: userId,
        module_id: moduleId,
        lesson_id: lessonId,
        completed,
        score: score || null,
        completed_at: completed ? new Date().toISOString() : null
      };
      
      const { data, error } = await progressService.updateProgress(progressData);
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully updated progress for user ${userId} on lesson ${lessonId}:\n${formatData(data)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error updating progress: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

// Export all university tools
export const universityTools = [
  getPrograms,
  createProgram,
  getCourses,
  createCourse,
  getUserProgress,
  updateProgress
]; 