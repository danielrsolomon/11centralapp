/**
 * Unified Database Types
 * 
 * This file exports all Supabase database types in a standardized way
 * for use across the application. It ensures type safety and consistency
 * in all database operations.
 */

import { Database } from './database.types';

// Define the public schema for easier access
export type PublicSchema = Database['public'];

// Table definitions
export type Tables = PublicSchema['Tables'];

// ----- TABLE ROW TYPES -----
// These types represent the data structure when reading from the database

export type Course = Tables['courses']['Row'];
export type Department = Tables['departments']['Row'];
export type Lesson = Tables['lessons']['Row'];
export type Module = Tables['modules']['Row'];
export type Program = Tables['programs']['Row'];
export type QuizAnswer = Tables['quiz_answers']['Row'];
export type QuizQuestion = Tables['quiz_questions']['Row'];
export type UserPreference = Tables['user_preferences']['Row'];
export type UserProgramProgress = Tables['user_program_progress']['Row'];
export type UserProgress = Tables['user_progress']['Row'];
export type UserQuizAttempt = Tables['user_quiz_attempts']['Row'];

// ----- TABLE INSERT TYPES -----
// These types represent the data structure when inserting into the database

export type CourseInsert = Tables['courses']['Insert'];
export type DepartmentInsert = Tables['departments']['Insert'];
export type LessonInsert = Tables['lessons']['Insert'];
export type ModuleInsert = Tables['modules']['Insert'];
export type ProgramInsert = Tables['programs']['Insert'];
export type QuizAnswerInsert = Tables['quiz_answers']['Insert'];
export type QuizQuestionInsert = Tables['quiz_questions']['Insert'];
export type UserPreferenceInsert = Tables['user_preferences']['Insert'];
export type UserProgramProgressInsert = Tables['user_program_progress']['Insert'];
export type UserProgressInsert = Tables['user_progress']['Insert'];
export type UserQuizAttemptInsert = Tables['user_quiz_attempts']['Insert'];

// ----- TABLE UPDATE TYPES -----
// These types represent the data structure when updating the database

export type CourseUpdate = Tables['courses']['Update'];
export type DepartmentUpdate = Tables['departments']['Update'];
export type LessonUpdate = Tables['lessons']['Update'];
export type ModuleUpdate = Tables['modules']['Update'];
export type ProgramUpdate = Tables['programs']['Update'];
export type QuizAnswerUpdate = Tables['quiz_answers']['Update'];
export type QuizQuestionUpdate = Tables['quiz_questions']['Update'];
export type UserPreferenceUpdate = Tables['user_preferences']['Update'];
export type UserProgramProgressUpdate = Tables['user_program_progress']['Update'];
export type UserProgressUpdate = Tables['user_progress']['Update'];
export type UserQuizAttemptUpdate = Tables['user_quiz_attempts']['Update'];

// ----- TABLE NAMES TYPE -----
// Type-safe table names for use with Supabase queries
export type TableName = keyof Tables;

// Convert table names to a more usable format for constants
export const TableNames = {
  COURSES: 'courses' as const,
  DEPARTMENTS: 'departments' as const,
  LESSONS: 'lessons' as const,
  MODULES: 'modules' as const,
  PROGRAMS: 'programs' as const,
  QUIZ_ANSWERS: 'quiz_answers' as const,
  QUIZ_QUESTIONS: 'quiz_questions' as const,
  USER_PREFERENCES: 'user_preferences' as const,
  USER_PROGRAM_PROGRESS: 'user_program_progress' as const,
  USER_PROGRESS: 'user_progress' as const,
  USER_QUIZ_ATTEMPTS: 'user_quiz_attempts' as const
  
  // Add these if they exist in your schema
  // USER_ROLES: 'user_roles' as const,
  // USERS: 'users' as const,
  // VENUES: 'venues' as const
} as const;

// Type representing all available table names as a union
export type TableNameUnion = typeof TableNames[keyof typeof TableNames];

// ----- TYPE MAPPINGS -----
// These maps are used to get the correct types for a given table name
export type TableRowTypeMap = {
  'courses': Course;
  'departments': Department;
  'lessons': Lesson;
  'modules': Module;
  'programs': Program;
  'quiz_answers': QuizAnswer;
  'quiz_questions': QuizQuestion;
  'user_preferences': UserPreference;
  'user_program_progress': UserProgramProgress;
  'user_progress': UserProgress;
  'user_quiz_attempts': UserQuizAttempt;
  
  // Add these if they exist in your schema
  // 'user_roles': UserRole;
  // 'users': User;
  // 'venues': Venue;
};

export type TableInsertTypeMap = {
  'courses': CourseInsert;
  'departments': DepartmentInsert;
  'lessons': LessonInsert;
  'modules': ModuleInsert;
  'programs': ProgramInsert;
  'quiz_answers': QuizAnswerInsert;
  'quiz_questions': QuizQuestionInsert;
  'user_preferences': UserPreferenceInsert;
  'user_program_progress': UserProgramProgressInsert;
  'user_progress': UserProgressInsert;
  'user_quiz_attempts': UserQuizAttemptInsert;
  
  // Add these if they exist in your schema
  // 'user_roles': UserRoleInsert;
  // 'users': UserInsert;
  // 'venues': VenueInsert;
};

export type TableUpdateTypeMap = {
  'courses': CourseUpdate;
  'departments': DepartmentUpdate;
  'lessons': LessonUpdate;
  'modules': ModuleUpdate;
  'programs': ProgramUpdate;
  'quiz_answers': QuizAnswerUpdate;
  'quiz_questions': QuizQuestionUpdate;
  'user_preferences': UserPreferenceUpdate;
  'user_program_progress': UserProgramProgressUpdate;
  'user_progress': UserProgressUpdate;
  'user_quiz_attempts': UserQuizAttemptUpdate;
  
  // Add these if they exist in your schema
  // 'user_roles': UserRoleUpdate;
  // 'users': UserUpdate;
  // 'venues': VenueUpdate;
};

// ----- UTILITY TYPES -----

/**
 * Get the row type for a specific table
 * @example type UserRow = TableRow<'users'>
 */
export type TableRow<T extends TableName> = Tables[T]['Row'];

/**
 * Get the insert type for a specific table
 * @example type NewUser = TableInsert<'users'>
 */
export type TableInsert<T extends TableName> = Tables[T]['Insert'];

/**
 * Get the update type for a specific table
 * @example type UpdateUser = TableUpdate<'users'>
 */
export type TableUpdate<T extends TableName> = Tables[T]['Update'];

// Re-export the Database type for direct use when needed
export type { Database };

// Export a default object with all types and constants for easier imports
export default {
  TableNames
}; 