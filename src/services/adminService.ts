import { User, Program } from '../types/database.types';
import { supabase } from './supabase';
import { api } from './apiService';

// Mock implementations of API functions
const apiCreateUser = async ({ 
  email, 
  password, 
  userData, 
  roleId 
}: { 
  email: string; 
  password: string; 
  userData: any; 
  roleId: string;
}) => {
  console.log('Mock apiCreateUser called', { email, userData, roleId });
  return { success: true, data: { id: 'mock-user-id', ...userData } };
};

const apiUpdateUserRole = async ({ 
  userId, 
  roleId 
}: { 
  userId: string; 
  roleId: string;
}) => {
  console.log('Mock apiUpdateUserRole called', { userId, roleId });
  return { success: true };
};

const apiCreateProgram = async ({ 
  programData 
}: { 
  programData: any;
}) => {
  console.log('Mock apiCreateProgram called', { programData });
  return { success: true, data: { id: 'mock-program-id', ...programData } };
};

const apiUpdateProgram = async ({ 
  programId, 
  programData 
}: { 
  programId: string; 
  programData: any;
}) => {
  console.log('Mock apiUpdateProgram called', { programId, programData });
  return { success: true };
};

const apiPublishProgram = async ({ 
  programId 
}: { 
  programId: string;
}) => {
  console.log('Mock apiPublishProgram called', { programId });
  return { success: true };
};

// User management
export const createNewUser = async (
  email: string, 
  password: string, 
  userData: Partial<User>, 
  roleId: string
) => {
  return await apiCreateUser({ 
    email, 
    password, 
    userData, 
    roleId 
  });
};

export const assignUserRole = async (userId: string, roleId: string) => {
  return await apiUpdateUserRole({ userId, roleId });
};

// Content management
export const createNewProgram = async (programData: Partial<Program>) => {
  return await apiCreateProgram({ programData });
};

export const updateExistingProgram = async (programId: string, programData: Partial<Program>) => {
  return await apiUpdateProgram({ programId, programData });
};

export const publishExistingProgram = async (programId: string) => {
  return await apiPublishProgram({ programId });
};

/**
 * Fix order columns in content tables
 * 
 * This method calls the API endpoint that adds 'order' columns to content tables
 * (programs, courses, lessons, modules) if they don't exist.
 * 
 * This replaces the legacy fix-order-columns.ts direct database manipulation
 * with a proper API-based approach.
 * 
 * @returns Promise with success status and error information if applicable
 */
export const fixOrderColumns = async (): Promise<{ success: boolean; error: Error | null }> => {
  try {
    console.log('AdminService: Calling API to fix order columns');
    
    const response = await api.post('/admin/schema/fix-order-columns', {});
    
    if (!response.success) {
      console.error('AdminService: Failed to fix order columns:', response.error);
      return {
        success: false,
        error: new Error(response.error?.message || 'Failed to fix order columns')
      };
    }
    
    console.log('AdminService: Successfully fixed order columns');
    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('AdminService: Error in fixOrderColumns:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error fixing order columns')
    };
  }
}; 