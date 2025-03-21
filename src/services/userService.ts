import { BaseDataService } from './baseDataService';
import { User } from '../types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';

class UserService extends BaseDataService<User> {
  constructor() {
    super('users');
  }

  /**
   * Get user with their roles and permissions
   */
  async getUserWithRoles(userId: string): Promise<{ 
    data: (User & { roles: string[] }) | null; 
    error: PostgrestError | null 
  }> {
    try {
      const { data: user, error } = await this.getById(userId);
      
      if (error || !user) {
        return { data: null, error };
      }

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (rolesError) {
        return { data: null, error: rolesError };
      }

      // Get role details
      const roleIds = userRoles.map(ur => ur.role_id);
      
      if (roleIds.length === 0) {
        return { 
          data: { 
            ...user, 
            roles: [] 
          }, 
          error: null 
        };
      }
      
      const { data: roles, error: rolesDataError } = await supabase
        .from('roles')
        .select('name')
        .in('id', roleIds);
        
      if (rolesDataError) {
        return { data: null, error: rolesDataError };
      }
      
      // Extract role names
      const roleNames = roles.map(role => role.name);

      return { 
        data: { 
          ...user, 
          roles: roleNames 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error in getUserWithRoles:', error);
      return {
        data: null,
        error: error instanceof Error 
          ? { code: 'custom', message: error.message, details: '', hint: '', name: 'PostgrestError' } 
          : { code: 'unknown', message: 'Unknown error', details: '', hint: '', name: 'PostgrestError' }
      };
    }
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(departmentId: string): Promise<{ 
    data: User[] | null; 
    error: PostgrestError | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('department_id', departmentId);

      if (error) {
        return { data: null, error };
      }

      if (data.length === 0) {
        return { data: [], error: null };
      }

      const userIds = data.map(ur => ur.user_id);
      
      return await supabase
        .from('users')
        .select('*')
        .in('id', userIds);
    } catch (error) {
      console.error('Error in getUsersByDepartment:', error);
      return {
        data: null,
        error: {
          message: 'Failed to get users by department',
          details: error instanceof Error ? error.message : String(error),
          hint: '',
          code: 'UNKNOWN_ERROR',
          name: 'PostgrestError'
        }
      };
    }
  }

  /**
   * Check if a user has specific permissions
   */
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    try {
      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (rolesError || !userRoles || userRoles.length === 0) {
        return false;
      }

      const roleIds = userRoles.map(ur => ur.role_id);

      // Get role permissions
      const { data: rolePermissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('permissions(code)')
        .in('role_id', roleIds)
        .eq('permissions.code', permissionCode);

      // Return true only if permissions exist and there are no errors
      return !permissionsError && rolePermissions && rolePermissions.length > 0;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  async getUserRoles(userId: string) {
    try {
      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (rolesError) {
        return { data: null, error: rolesError };
      }

      // Get role details
      const roleIds = userRoles.map(ur => ur.role_id);
      
      if (roleIds.length === 0) {
        return { data: { roles: [] }, error: null };
      }
      
      const { data: roles, error: rolesDataError } = await supabase
        .from('roles')
        .select('name')
        .in('id', roleIds);
        
      if (rolesDataError) {
        return { data: null, error: rolesDataError };
      }
      
      // Extract role names
      const roleNames = roles.map(role => role.name);

      return { 
        data: { 
          roles: roleNames 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error in getUserRoles:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }
}

// Export singleton instance
export const userService = new UserService(); 