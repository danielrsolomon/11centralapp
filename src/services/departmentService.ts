import { supabase } from './supabase';
import { Department } from '../types/database.types';

/**
 * Service for managing departments
 */
class DepartmentService {
  /**
   * Get all departments
   * @returns List of all departments
   */
  async getAllDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching departments:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching departments:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching departments') 
      };
    }
  }

  /**
   * Get a department by ID
   * @param departmentId The ID of the department
   * @returns The department
   */
  async getDepartmentById(departmentId: string) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      if (error) {
        console.error('Error fetching department:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching department:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching department') 
      };
    }
  }

  /**
   * Get departments with user counts
   * @returns List of departments with user counts
   */
  async getDepartmentsWithUserCounts() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          users:users(id)
        `);

      if (error) {
        console.error('Error fetching departments with user counts:', error);
        return { data: null, error };
      }

      // Transform the data to include user count
      const departmentsWithCount = data?.map(dept => ({
        ...dept,
        user_count: Array.isArray(dept.users) ? dept.users.length : 0,
        users: undefined // Remove the users array
      }));

      return { data: departmentsWithCount, error: null };
    } catch (err) {
      console.error('Unexpected error fetching departments with user counts:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching departments with user counts') 
      };
    }
  }

  /**
   * Create a new department
   * @param department The department to create
   * @returns The created department
   */
  async createDepartment(department: Omit<Department, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...department,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating department:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error creating department:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error creating department') 
      };
    }
  }

  /**
   * Update an existing department
   * @param departmentId The ID of the department to update
   * @param updates The updates to apply
   * @returns The updated department
   */
  async updateDepartment(departmentId: string, updates: Partial<Omit<Department, 'id' | 'created_at'>>) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', departmentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating department:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error updating department:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error updating department') 
      };
    }
  }

  /**
   * Delete a department
   * @param departmentId The ID of the department to delete
   * @returns Whether the deletion was successful
   */
  async deleteDepartment(departmentId: string) {
    try {
      // Check if there are any users in this department
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('department_id', departmentId)
        .limit(1);

      if (usersError) {
        console.error('Error checking users in department:', usersError);
        return { 
          success: false, 
          error: usersError,
          message: 'Could not check if department has users'
        };
      }

      if (users && users.length > 0) {
        return { 
          success: false, 
          error: null,
          message: 'Cannot delete department with existing users. Reassign users first.'
        };
      }

      // No users in department, proceed with deletion
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

      if (error) {
        console.error('Error deleting department:', error);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Unexpected error deleting department:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err : new Error('Unknown error deleting department') 
      };
    }
  }

  /**
   * Get users in a department
   * @param departmentId The ID of the department
   * @returns Users in the department
   */
  async getUsersInDepartment(departmentId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url, created_at, is_active')
        .eq('department_id', departmentId)
        .order('last_name');

      if (error) {
        console.error('Error fetching users in department:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching users in department:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching users in department') 
      };
    }
  }
}

export const departmentService = new DepartmentService(); 