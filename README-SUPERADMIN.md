# 11Central Superadmin Permission Fixes

This document summarizes the changes made to ensure the 'superadmin' role is consistently recognized throughout the application as having full permissions for program creation, editing, and deletion.

## Overview of Changes

1. **Created Centralized Permission Utilities** 
   - Added `lib/auth/permission-utils.ts` with standardized functions for role checking
   - Implemented case-insensitive role comparisons
   - Added comprehensive permission helpers for content management

2. **Updated Program API Routes**
   - Modified permission checks in POST, PUT, and DELETE routes
   - Now consistently checking for 'superadmin' role in all routes
   - Improved error messages with clear permission requirements

3. **Enhanced Program Service Layer**
   - Refactored permission checks in createProgram, updateProgram, and deleteProgram methods
   - Removed redundant code by using centralized permission utilities
   - Added better error categorization with 'PermissionError' type

4. **Improved Error Handling**
   - Updated SessionErrorDetector to properly distinguish permission errors from auth errors
   - Enhanced usePrograms hook to handle 403 responses correctly
   - Added specific error handling for permission-related issues

5. **Added Verification Tools**
   - Created scripts/verify-user-role.js to check user roles in Supabase
   - Added documentation for permission system in docs/PERMISSIONS.md

## Testing Superadmin Access

To verify that a user with the 'superadmin' role has the proper permissions:

1. Ensure the user's role is set to 'superadmin' in the Supabase users table:
   ```bash
   node scripts/verify-user-role.js USER_ID superadmin
   ```

2. Log in as that user and attempt to create, edit, and delete programs
   - The operations should succeed without permission errors
   - The user should remain logged in even when accessing restricted content

## Technical Implementation Details

### Permission Utility Functions

The new permission utilities provide a standardized way to check user roles:

```typescript
// Check if user has admin privileges
export function hasAdminRole(user: any): boolean {
  if (!user) return false;
  if (user.is_admin === true) return true;
  return hasAnyRole(user, ADMIN_ROLES);
}

// Check if user can create content
export function canCreateContent(user: any): boolean {
  if (!user) return false;
  if (hasAdminRole(user) || hasManagerRole(user)) return true;
  return Boolean(
    user.preferences?.permissions?.createContent ||
    user.preferences?.content_creation === true
  );
}
```

### API Route Implementation

The API routes now use these utilities for permission checking:

```typescript
// Use centralized permission utility to check if user can create content
if (!canCreateContent(userData)) {
  // Log the permission denial but don't terminate the session
  logPermissionDenial(userData, 'create program');
  
  // Return 403 with descriptive message but don't trigger session termination
  return NextResponse.json(
    { 
      error: 'Permission denied - requires content management permissions',
      requiresAuth: false, // Flag to indicate it's not an auth error
      details: 'You need admin, manager, or content creation permissions to create programs'
    }, 
    { status: 403 }
  );
}
```

### Error Handling Improvements

SessionErrorDetector now properly handles permission errors:

```typescript
// Skip if the error is specifically a permission error (not an auth error)
if (errorObj && isPermissionError(errorObj)) {
  logger.debug('Ignoring permission error, not a session issue', { 
    error: errorMsg,
    name: errorObj.name 
  });
  return;
}
```

## Next Steps

1. Continue monitoring for any permission-related issues in production
2. Consider expanding the permission system to other parts of the application
3. Add unit tests for the permission utility functions
4. Create an admin UI for managing user roles and permissions 

# Superadmin Role Documentation

## Overview

The superadmin role is the highest level of permission in the 11Central application. Superadmins have full access to all functionality, including all administrative operations and content creation capabilities, regardless of other permission settings.

## Role Hierarchy

The role hierarchy in 11Central is as follows (from highest to lowest permissions):

1. **Superadmin** - Full system access and capabilities
2. **Admin** - Administrative capabilities, but may be restricted from some superadmin-only features
3. **Manager Roles** - Various manager roles with specific permissions:
   - Department Manager
   - Training Manager
   - Content Manager
   - Supervisor
4. **Standard User** - Basic access with limited permissions

## Database Implementation

In the database, users with superadmin privileges have the following attributes:

- `role` field set to `"superadmin"` (case-sensitive, should always be lowercase)
- `is_admin` flag set to `true`

Both attributes should be set correctly for optimal operation. The application code will generally check both attributes when determining permissions.

## Permission Checks

Superadmin permissions are checked in several ways throughout the application:

1. **Direct Role Check**:
   ```javascript
   if (user.role.toLowerCase() === 'superadmin') {
     // Superadmin-specific operation
   }
   ```

2. **Admin Role Check** (includes superadmin):
   ```javascript
   if (hasAdminRole(user)) {
     // Admin operation (superadmins can do this too)
   }
   ```

3. **Content Creation Check**:
   ```javascript
   if (canCreateContent(user)) {
     // Content creation operation
   }
   ```

## Utility Functions

The application includes several permission utility functions to standardize permission checks:

- `hasAdminRole(user)` - Checks if the user has admin privileges (including superadmin)
- `hasManagerRole(user)` - Checks if the user has any manager-level role
- `canCreateContent(user)` - Checks if the user can create content (all superadmins can)
- `canEditContent(user)` - Checks if the user can edit content (all superadmins can)
- `canDeleteContent(user)` - Checks if the user can delete content (all superadmins can)

## Adding Superadmin Role to a User

To promote a user to superadmin, use the provided utility script:

```bash
node scripts/add-superadmin-role.js <user_email|user_id>
```

This script will:
1. Locate the user in the database
2. Set their role to "superadmin"
3. Set their is_admin flag to true

## Normalizing Superadmin Roles

If there are inconsistencies in how the superadmin role is stored (e.g., "SuperAdmin" vs "superadmin"), use the normalization script:

```bash
node scripts/normalize-superadmin-roles.js
```

This script identifies users with superadmin roles in non-standard formats and normalizes them to the lowercase "superadmin" value.

## Common Issues and Troubleshooting

### Permission Denied Errors

If a superadmin user is receiving 403 Permission Denied errors when attempting to create content:

1. Check the user's role in the database (should be "superadmin")
2. Verify the is_admin flag is set to true
3. Examine route-specific permission checks in the API code
4. Review any custom preferences overrides in the user's profile

### Session Authentication Issues

Superadmins should never be logged out due to permission errors. If this occurs:

1. Check the SessionErrorDetector component to ensure it correctly identifies permission errors
2. Verify the error handling in authentication middleware
3. Examine error response objects to ensure they are properly marked as permission errors rather than auth errors

## Best Practices

1. Reserve superadmin roles for system administrators only
2. Use the utility scripts to add or normalize superadmin roles rather than direct database updates
3. Preserve the case-sensitivity of the role value as "superadmin" (all lowercase)
4. When implementing new features, ensure permission checks consider the superadmin role 