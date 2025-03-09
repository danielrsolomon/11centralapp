import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// User role constants
export const ROLES = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content_manager',
  INSTRUCTOR: 'instructor',
  USER: 'user'
};

// Helper function to check if user has a specific role
export async function userHasRole(role: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check user's roles in user_roles table
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
    
  if (error || !data) return false;
  return data.some(r => r.role === role);
}

// Helper to get current user with roles
export async function getCurrentUserWithRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // Get user's roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
    
  return {
    ...user,
    roles: roles?.map(r => r.role) || []
  };
} 