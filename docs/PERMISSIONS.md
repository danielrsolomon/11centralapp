# 11Central Permission System Documentation

## Overview

This document outlines the permission system in 11Central, focusing on how roles and permissions are checked throughout the application, particularly for content management operations.

## Role Hierarchy

The application recognizes several roles with different levels of access:

1. **Superadmin** - Full system access with all permissions
2. **Admin** - Administrative access with content management capabilities
3. **Manager Roles** - Various manager roles with specific permissions:
   - `manager`
   - `training_manager`
   - `content_manager`
   - `department_manager`
   - `supervisor`
4. **Regular Users** - Standard users with limited access

## Permission Checks

Permission checks are implemented in multiple layers:

1. **API Routes** - Initial permission verification based on user role
2. **Service Layer** - Secondary permission verification before performing operations
3. **UI Components** - Conditional rendering based on user permissions

## Recent Improvements

The permission system has been enhanced to ensure consistent recognition of the 'superadmin' role throughout the application:

### 1. Standardized Permission Checks

Permission checks now consistently handle the 'superadmin' role across all program management routes (POST, PUT, DELETE) and services.

### 2. Centralized Permission Utilities

Permission checks have been centralized in the `lib/auth/permission-utils.ts` file, providing reusable functions for role and permission validation:

- `hasAdminRole(user)` - Checks if a user has admin privileges
- `hasManagerRole(user)` - Checks if a user has any manager role
- `canCreateContent(user)` - Checks if a user can create content
- `canEditContent(user)` - Checks if a user can edit content
- `canDeleteContent(user)` - Checks if a user can delete content

### 3. Improved Error Handling

Permission errors are now properly categorized with `error.name = 'PermissionError'` to distinguish them from authentication errors, preventing unnecessary session termination.

### 4. Case-Insensitive Role Comparisons

Role checks are now case-insensitive, ensuring that 'Superadmin', 'SUPERADMIN', and 'superadmin' are all recognized properly.

## Verifying User Roles

To verify a user's role in the system, use the provided utility script:

```bash
node scripts/verify-user-role.js [userId] [roleToCheck]
```

Example:
```bash
node scripts/verify-user-role.js 550e8400-e29b-41d4-a716-446655440000 superadmin
```

This script will check if a user has the specified role and provide detailed information about their permissions.

## Troubleshooting Permission Issues

If a user is experiencing permission issues:

1. Verify the user's role in the database using the verification script
2. Check for case sensitivity issues in the role value
3. Ensure the user has the appropriate permissions in the `user_permissions` table
4. Review the server logs for permission denial messages

## Common Permission Errors

- **"Permission denied - requires admin privileges"** - The user doesn't have admin or superadmin roles
- **"Permission denied - requires content management permissions"** - The user doesn't have the necessary role or explicit content permissions
- **"Permission denied - user role not authorized"** - The user's role isn't included in the allowed roles list

## Implementation Example

Here's an example of how permission checks are implemented:

```typescript
// In API route handler
const { data: userData } = await supabase.auth.getUser();
const { data: user } = await supabase
  .from('users')
  .select('id, email, role, is_admin, preferences')
  .eq('id', userData.user?.id)
  .single();

// Check permissions
if (
  !hasAdminRole(user) && 
  !hasManagerRole(user) && 
  !canCreateContent(user)
) {
  return Response.json(
    { error: 'Permission denied - requires content management permissions' },
    { status: 403 }
  );
}
``` 