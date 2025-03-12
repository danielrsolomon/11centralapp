/**
 * Programs Service - Database Queries
 * 
 * This file contains all the database queries used by the Programs Service.
 * These are raw SQL queries optimized for performance and feature completeness.
 */

import { RequestContext } from '@/lib/database/clients';

/**
 * Options for listing programs
 */
export interface ListProgramsOptions {
  departmentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Program queries
 */
export const programQueries = {
  /**
   * List programs accessible to a user
   * 
   * @param userId User ID to check access for
   * @param options Query options (filtering, pagination)
   * @returns SQL query, count query, and parameters
   */
  listPrograms: (userId: string, options: ListProgramsOptions = {}) => {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    
    let query = `
      SELECT 
        p.*,
        d.name as department_name,
        COALESCE(
          (SELECT (COUNT(DISTINCT c.id) FILTER (WHERE ucp.completion_status = 'completed'))::float / 
           NULLIF(COUNT(DISTINCT c.id), 0) * 100, 0) as completion_percentage,
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT c.id) FILTER (WHERE ucp.completion_status = 'completed') as completed_courses
      FROM programs p
      INNER JOIN departments d ON p.department_id = d.id
      LEFT JOIN courses c ON c.program_id = p.id
      LEFT JOIN user_program_progress upp ON upp.program_id = p.id AND upp.user_id = $1
      LEFT JOIN user_course_progress ucp ON ucp.course_id = c.id AND ucp.user_id = $1
    `;
    
    // Join to user_roles for permission check
    query += `
      -- Join to user_roles to check permissions
      INNER JOIN user_roles ur ON ur.department_id = p.department_id AND ur.user_id = $1
    `;
    
    // Start building WHERE clause
    let whereClause = '';
    const params = [userId];
    let paramIndex = 2;
    
    // Add department filter if provided
    if (options.departmentId) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `p.department_id = $${paramIndex}`;
      params.push(options.departmentId);
      paramIndex++;
    }
    
    // Add status filter if provided
    if (options.status) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += `p.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }
    
    // Add WHERE clause to query if needed
    query += whereClause;
    
    // Group by and order
    query += `
      GROUP BY p.id, d.name
      ORDER BY p.created_at DESC
    `;
    
    // Add pagination
    query += `
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(String(limit), String(offset));
    
    // Add counting query for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM programs p
      INNER JOIN departments d ON p.department_id = d.id
      INNER JOIN user_roles ur ON ur.department_id = p.department_id AND ur.user_id = $1
    `;
    
    // Add WHERE clause to count query if needed
    countQuery += whereClause;
    
    return {
      query,
      countQuery,
      params
    };
  },

  /**
   * Get detailed program information including courses
   * 
   * @param programId Program ID to retrieve
   * @param userId User ID for completion status
   * @returns SQL query and parameters
   */
  getProgramDetails: (programId: string, userId: string) => {
    const query = `
      SELECT 
        p.*,
        d.name as department_name,
        json_agg(
          json_build_object(
            'id', c.id,
            'title', c.title,
            'description', c.description,
            'order', c.display_order,
            'completed', COALESCE(
              (SELECT COUNT(*) FILTER (WHERE ucp.completion_status = 'completed') 
               FROM user_course_progress ucp 
               WHERE ucp.course_id = c.id AND ucp.user_id = $2) > 0, 
              false
            )
          ) ORDER BY c.display_order
        ) as courses,
        COALESCE(upp.completion_percentage, 0) as completion_percentage
      FROM programs p
      INNER JOIN departments d ON p.department_id = d.id
      LEFT JOIN courses c ON c.program_id = p.id
      LEFT JOIN user_program_progress upp ON upp.program_id = p.id AND upp.user_id = $2
      WHERE p.id = $1
      -- Join to user_roles for permission check
      AND EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.department_id = p.department_id AND ur.user_id = $2
      )
      GROUP BY p.id, d.name, upp.completion_percentage
    `;
    
    return {
      query,
      params: [programId, userId]
    };
  },
  
  /**
   * Create a new program
   * 
   * @param title Program title
   * @param description Program description
   * @param departmentId Department ID
   * @param imageUrl Optional image URL
   * @param createdBy User ID of creator
   * @returns SQL query and parameters
   */
  createProgram: (
    title: string, 
    description: string, 
    departmentId: string, 
    imageUrl: string | null = null,
    createdBy: string
  ) => {
    const query = `
      INSERT INTO programs(
        title, 
        description, 
        department_id, 
        image_url, 
        created_by,
        status
      )
      VALUES($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `;
    
    return {
      query,
      params: [title, description, departmentId, imageUrl, createdBy]
    };
  },
  
  /**
   * Update an existing program
   * 
   * @param programId Program ID to update
   * @param data Fields to update
   * @returns SQL query and parameters
   */
  updateProgram: (
    programId: string, 
    data: {
      title?: string, 
      description?: string, 
      departmentId?: string, 
      imageUrl?: string | null,
      status?: string
    }
  ) => {
    // Build SET clause and parameters dynamically
    const setClauses: string[] = [];
    const params: any[] = [programId];
    let paramIndex = 2;
    
    if (data.title !== undefined) {
      setClauses.push(`title = $${paramIndex}`);
      params.push(data.title);
      paramIndex++;
    }
    
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }
    
    if (data.departmentId !== undefined) {
      setClauses.push(`department_id = $${paramIndex}`);
      params.push(data.departmentId);
      paramIndex++;
    }
    
    if (data.imageUrl !== undefined) {
      setClauses.push(`image_url = $${paramIndex}`);
      params.push(data.imageUrl);
      paramIndex++;
    }
    
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;
    }
    
    // Always update updated_at timestamp
    setClauses.push(`updated_at = NOW()`);
    
    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }
    
    const query = `
      UPDATE programs
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    return {
      query,
      params
    };
  },
  
  /**
   * Delete a program
   * 
   * @param programId Program ID to delete
   * @returns SQL query and parameters
   */
  deleteProgram: (programId: string) => {
    const query = `
      DELETE FROM programs
      WHERE id = $1
      RETURNING id
    `;
    
    return {
      query,
      params: [programId]
    };
  }
};