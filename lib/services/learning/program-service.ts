/**
 * Program Service Implementation
 * 
 * This service handles all program-related operations in the Learning Management Service.
 */

import { createLearningDatabaseClient, RequestContext, EnhancedClient } from '@/lib/database/clients';
import { programQueries, ListProgramsOptions } from './queries/programs';
import { Monitoring } from '@/lib/monitoring';
import { 
  canCreateContent, 
  canEditContent, 
  canDeleteContent, 
  logPermissionDenial,
  createPermissionError
} from '@/lib/auth/permission-utils';

/**
 * Program service implementation
 */
export class ProgramService {
  private context: RequestContext;
  private client: EnhancedClient;
  
  /**
   * Create a new program service
   * @param context Request context with user information
   */
  constructor(context: RequestContext = {}) {
    this.context = context;
    this.client = createLearningDatabaseClient(context);
  }
  
  /**
   * List programs accessible to a user
   * 
   * @param userId User ID to check access for
   * @param options Query options (filtering, pagination)
   * @returns Programs with pagination information
   */
  async listPrograms(userId: string, options: ListProgramsOptions = {}) {
    const timer = Monitoring.createTimer('lms', 'programService.listPrograms', 'query', {
      userId,
      departmentId: options.departmentId,
      status: options.status,
      limit: options.limit,
      offset: options.offset
    });
    
    try {
      // Get query and parameters
      const { query, countQuery, params } = programQueries.listPrograms(userId, options);
      
      // Execute the main query
      const { data: programs, error } = await this.client.executeRawQuery(query, params, {
        monitoringOperation: 'programs.list'
      });
      
      if (error) {
        throw error;
      }
      
      // Execute count query for pagination
      const { data: countData, error: countError } = await this.client.executeRawQuery(
        countQuery, 
        // Only use the params needed for the count query (exclude limit and offset)
        params.slice(0, params.length - 2), 
        { monitoringOperation: 'programs.count' }
      );
      
      if (countError) {
        throw countError;
      }
      
      // Create result object
      const result = {
        programs: programs || [],
        pagination: {
          total: countData?.[0]?.total || 0,
          offset: options.offset || 0,
          limit: options.limit || 10
        }
      };
      
      timer.stop();
      return result;
    } catch (error) {
      timer.stop();
      Monitoring.logError('lms', 'programService.listPrograms', error, { 
        userId, 
        options 
      });
      throw error;
    }
  }
  
  /**
   * Get detailed program information
   * 
   * @param programId Program ID to retrieve
   * @param userId User ID for authorization and completion status
   * @returns Detailed program information with courses
   */
  async getProgramDetails(programId: string, userId: string) {
    const timer = Monitoring.createTimer('lms', 'programService.getProgramDetails', 'query', {
      programId,
      userId
    });
    
    try {
      // Get query and parameters
      const { query, params } = programQueries.getProgramDetails(programId, userId);
      
      // Execute the query
      const { data, error } = await this.client.executeRawQuery(query, params, {
        monitoringOperation: 'programs.getDetails'
      });
      
      if (error) {
        throw error;
      }
      
      // Program not found or user doesn't have access
      if (!data || data.length === 0) {
        const notFoundError = new Error('Program not found or access denied');
        // Add custom property to identify the error type
        (notFoundError as any).code = 'NOT_FOUND_OR_ACCESS_DENIED';
        throw notFoundError;
      }
      
      // Return the first (and only) result
      timer.stop();
      return data[0];
    } catch (error) {
      timer.stop();
      Monitoring.logError('lms', 'programService.getProgramDetails', error, {
        programId,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Create a new program
   * 
   * @param title Program title
   * @param description Program description
   * @param departmentId Department ID
   * @param imageUrl Optional image URL
   * @returns Created program
   */
  async createProgram(title: string, description: string, departmentId: string, imageUrl?: string) {
    // Convert context to user-like object for permission checks
    const userContext = {
      id: this.context.userId,
      email: this.context.userEmail,
      role: this.context.userRoles?.[0] || '',
      is_admin: this.context.isAdmin || this.context.isSuperAdmin,
      preferences: {
        permissions: this.context.permissions
      }
    };
    
    // Use centralized permission function
    if (!canCreateContent(userContext)) {
      // Log permission denial
      logPermissionDenial(userContext, 'create program');
      
      // Throw specific permission error that won't be interpreted as auth error
      throw createPermissionError('Permission denied: Requires admin, manager, or content creation permissions');
    }
    
    const timer = Monitoring.createTimer('lms', 'programService.createProgram', 'mutation', {
      title,
      departmentId
    });
    
    try {
      // Get query and parameters
      const { query, params } = programQueries.createProgram(
        title,
        description,
        departmentId,
        imageUrl || null,
        this.context.userId || 'system'
      );
      
      // Execute the query
      const { data, error } = await this.client.executeRawQuery(query, params, {
        monitoringOperation: 'programs.create'
      });
      
      if (error) {
        throw error;
      }
      
      // Log program creation
      Monitoring.logEvent('lms', 'program.created', {
        programId: data?.[0]?.id,
        title,
        departmentId,
        createdBy: this.context.userId
      });
      
      timer.stop();
      return data?.[0];
    } catch (error) {
      timer.stop();
      Monitoring.logError('lms', 'programService.createProgram', error, {
        title,
        departmentId
      });
      throw error;
    }
  }
  
  /**
   * Update an existing program
   * 
   * @param programId Program ID to update
   * @param data Fields to update
   * @returns Updated program
   */
  async updateProgram(programId: string, data: {
    title?: string;
    description?: string;
    departmentId?: string;
    imageUrl?: string | null;
    status?: string;
  }) {
    // Convert context to user-like object
    const userContext = {
      id: this.context.userId,
      email: this.context.userEmail,
      role: this.context.userRoles?.[0] || '',
      is_admin: this.context.isAdmin || this.context.isSuperAdmin,
      preferences: {
        permissions: this.context.permissions
      }
    };
    
    // Use centralized permission function
    if (!canEditContent(userContext)) {
      logPermissionDenial(userContext, 'update program');
      throw createPermissionError('Permission denied: Requires admin, manager, or content editing permissions');
    }
    
    const timer = Monitoring.createTimer('lms', 'programService.updateProgram', 'mutation', {
      programId
    });
    
    try {
      // Get query and parameters
      const { query, params } = programQueries.updateProgram(programId, data);
      
      // Execute the query
      const { data: updatedProgram, error } = await this.client.executeRawQuery(query, params, {
        monitoringOperation: 'programs.update'
      });
      
      if (error) {
        throw error;
      }
      
      // Program not found
      if (!updatedProgram || updatedProgram.length === 0) {
        throw new Error('Program not found');
      }
      
      // Log program update
      Monitoring.logEvent('lms', 'program.updated', {
        programId,
        updatedBy: this.context.userId,
        fields: Object.keys(data)
      });
      
      timer.stop();
      return updatedProgram[0];
    } catch (error) {
      timer.stop();
      Monitoring.logError('lms', 'programService.updateProgram', error, {
        programId,
        data
      });
      throw error;
    }
  }
  
  /**
   * Delete a program
   * 
   * @param programId Program ID to delete
   * @returns Deleted program ID
   */
  async deleteProgram(programId: string) {
    // Convert context to user-like object
    const userContext = {
      id: this.context.userId,
      email: this.context.userEmail,
      role: this.context.userRoles?.[0] || '',
      is_admin: this.context.isAdmin || this.context.isSuperAdmin,
      preferences: {
        permissions: this.context.permissions
      }
    };
    
    // Use centralized permission function
    if (!canDeleteContent(userContext)) {
      logPermissionDenial(userContext, 'delete program');
      throw createPermissionError('Permission denied: Requires admin, manager, or content deletion permissions');
    }
    
    const timer = Monitoring.createTimer('lms', 'programService.deleteProgram', 'mutation', {
      programId
    });
    
    try {
      // Get query and parameters
      const { query, params } = programQueries.deleteProgram(programId);
      
      // Execute the query
      const { data, error } = await this.client.executeRawQuery(query, params, {
        monitoringOperation: 'programs.delete'
      });
      
      if (error) {
        throw error;
      }
      
      // Program not found
      if (!data || data.length === 0) {
        throw new Error('Program not found');
      }
      
      // Log program deletion
      Monitoring.logEvent('lms', 'program.deleted', {
        programId,
        deletedBy: this.context.userId
      });
      
      timer.stop();
      return { id: programId };
    } catch (error) {
      timer.stop();
      Monitoring.logError('lms', 'programService.deleteProgram', error, {
        programId
      });
      throw error;
    }
  }
} 