/**
 * Permission Utilities
 * 
 * Centralized utilities for checking user roles and permissions throughout the application.
 * These functions help ensure consistent permission checking logic across all components,
 * services, and API routes.
 */

/**
 * Standard manager role types recognized by the application
 */
export const MANAGER_ROLES = [
  'manager',
  'training_manager',
  'content_manager',
  'department_manager',
  'supervisor',
];

/**
 * Admin role types that have full system access
 * NOTE: 'superadmin' is automatically granted ALL permissions throughout the system.
 * The role check is case-insensitive.
 */
export const ADMIN_ROLES = ['admin', 'superadmin'];

/**
 * Check if a user has an admin role
 * @param user The user object to check
 * @returns boolean indicating if the user has admin privileges
 * 
 * NOTE: This function will return true for both 'admin' and 'superadmin' roles,
 * as well as when the is_admin flag is set to true.
 * The role check is case-insensitive, so 'SuperAdmin', 'SUPERADMIN', etc. will all match.
 */
export function hasAdminRole(user: any): boolean {
  if (!user) return false;
  
  // Check for is_admin flag first
  if (user.is_admin === true) return true;
  
  // Then check for admin/superadmin role
  return hasAnyRole(user, ADMIN_ROLES);
}

/**
 * Check if a user has any manager role
 * @param user The user object to check
 * @returns boolean indicating if the user has manager privileges
 */
export function hasManagerRole(user: any): boolean {
  return hasAnyRole(user, MANAGER_ROLES);
}

/**
 * Check if a user can create content based on their role and permissions
 * @param user The user object to check
 * @returns boolean indicating if the user can create content
 * 
 * NOTE: 'superadmin' role will ALWAYS return true here due to hasAdminRole check.
 * This function treats 'superadmin' as having full content creation privileges 
 * regardless of preference settings.
 */
export function canCreateContent(user: any): boolean {
  if (!user) return false;
  
  // Admin or manager roles can create content
  // This includes 'superadmin' via hasAdminRole check
  if (hasAdminRole(user) || hasManagerRole(user)) return true;
  
  // Safely check for explicit content creation permission in preferences
  // Gracefully handle missing preferences
  try {
    // IMPORTANT: We check user_preferences first (as this is the current db structure),
    // but maintain backward compatibility with the old preferences structure
    
    // New structure: user_preferences table
    if (user.user_preferences?.content_creation === true) return true;
    if (user.user_preferences?.permissions?.createContent === true) return true;
    
    // Legacy structure: preferences field (deprecated)
    // These checks are kept for backward compatibility but will gradually be removed
    if (user.preferences?.permissions?.createContent === true) return true;
    if (user.preferences?.content_creation === true) return true;
    
    return false;
  } catch (error) {
    // If any error occurs during preference checking, default to false
    console.warn('Error checking content creation permissions:', error);
    return false;
  }
}

/**
 * Check if a user can edit content based on their role and permissions
 * @param user The user object to check
 * @returns boolean indicating if the user can edit content
 * 
 * NOTE: 'superadmin' role will ALWAYS return true here due to hasAdminRole check.
 */
export function canEditContent(user: any): boolean {
  if (!user) return false;
  
  // Admin or manager roles can edit content
  // This includes 'superadmin' via hasAdminRole check
  if (hasAdminRole(user) || hasManagerRole(user)) return true;
  
  // Safely check for explicit content editing permission in preferences
  try {
    // IMPORTANT: We check user_preferences first (as this is the current db structure),
    // but maintain backward compatibility with the old preferences structure
    
    // New structure: user_preferences table
    if (user.user_preferences?.content_editing === true) return true;
    if (user.user_preferences?.permissions?.editContent === true) return true;
    
    // Legacy structure: preferences field (deprecated)
    if (user.preferences?.permissions?.editContent === true) return true;
    if (user.preferences?.content_editing === true) return true;
    
    return false;
  } catch (error) {
    // If any error occurs during preference checking, default to false
    console.warn('Error checking content editing permissions:', error);
    return false;
  }
}

/**
 * Check if a user can delete content based on their role and permissions
 * @param user The user object to check
 * @returns boolean indicating if the user can delete content
 * 
 * NOTE: 'superadmin' role will ALWAYS return true here due to hasAdminRole check.
 */
export function canDeleteContent(user: any): boolean {
  if (!user) return false;
  
  // Only admins can delete content by default
  // This includes 'superadmin' via hasAdminRole check
  if (hasAdminRole(user)) return true;
  
  // Department managers can delete content
  if (hasAnyRole(user, ['department_manager'])) return true;
  
  // Safely check for explicit content deletion permission in preferences
  try {
    // IMPORTANT: We check user_preferences first (as this is the current db structure),
    // but maintain backward compatibility with the old preferences structure
    
    // New structure: user_preferences table
    if (user.user_preferences?.content_deletion === true) return true;
    if (user.user_preferences?.permissions?.deleteContent === true) return true;
    
    // Legacy structure: preferences field (deprecated)
    if (user.preferences?.permissions?.deleteContent === true) return true;
    if (user.preferences?.content_deletion === true) return true;
    
    return false;
  } catch (error) {
    // If any error occurs during preference checking, default to false
    console.warn('Error checking content deletion permissions:', error);
    return false;
  }
}

/**
 * Check if a user has any of the specified roles
 * @param user The user object to check
 * @param roles Array of roles to check against
 * @returns boolean indicating if the user has any of the roles
 * 
 * NOTE: This function performs case-insensitive role comparison,
 * so 'Superadmin', 'SUPERADMIN', 'superadmin', etc. are all treated equally.
 */
export function hasAnyRole(user: any, roles: string[]): boolean {
  if (!user || !user.role || !roles.length) return false;
  
  const userRole = String(user.role).toLowerCase();
  return roles.some(role => role.toLowerCase() === userRole);
}

/**
 * Log a permission denial with relevant context
 * @param user The user who was denied
 * @param action The action they were attempting
 * @param requiredRoles The roles that would be needed
 */
export function logPermissionDenial(user: any, action: string, requiredRoles?: string[]): void {
  console.warn(
    `Permission denied: User ${user?.id || 'unknown'} with role ${
      user?.role || 'none'
    } attempted to ${action}${
      requiredRoles ? `. Required roles: ${requiredRoles.join(', ')}` : ''
    }`
  );
}

/**
 * Create a permission error that is distinct from authentication errors
 * @param message The error message
 * @returns A custom error with name set to 'PermissionError'
 */
export function createPermissionError(message: string): Error {
  const error = new Error(message);
  error.name = 'PermissionError';
  return error;
}

/**
 * Check if an error is a permission error
 * @param error The error to check
 * @returns boolean indicating if it's a permission error
 */
export function isPermissionError(error: any): boolean {
  return error?.name === 'PermissionError' || 
         error?.message?.toLowerCase().includes('permission denied');
} 