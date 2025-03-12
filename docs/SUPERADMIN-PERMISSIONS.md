# Superadmin Role Permissions Implementation

This document outlines the changes made to ensure that users with the 'superadmin' role have consistent and proper permissions throughout the 11Central application.

## Problem Overview

The 'superadmin' role was inconsistently handled across different parts of the application:

1. Some API endpoints and services didn't explicitly recognize 'superadmin' as an admin-level role
2. Row-Level Security (RLS) policies in the database didn't include 'superadmin' in permission checks
3. Permission utilities didn't consistently handle the 'superadmin' role case-insensitively
4. Frontend components had inconsistent handling of 'superadmin' permissions

## Solution Implementation

### 1. Permission Utilities

- Created centralized permission utility functions in `lib/auth/permission-utils.ts`:
  - Defined standard role arrays including `ADMIN_ROLES` and `MANAGER_ROLES`
  - Implemented case-insensitive role checking with `hasRole()` function
  - Created utilities for common permission checks: `canCreateContent()`, `canEditContent()`, `canDeleteContent()`
  - Added permission denial logging for better debugging

### 2. Database RLS Policies

- Created a new migration `20240620000002_update_programs_rls.sql` that:
  - Drops existing policies to avoid conflicts
  - Creates comprehensive policies for all operations (SELECT, INSERT, UPDATE, DELETE)
  - Explicitly includes 'superadmin' role in all relevant policies using case-insensitive checks
  - Adds logging tables to track permission issues

### 3. API Route Updates

- Updated all Learning Management API routes (`programs`, `courses`, etc.) to:
  - Use centralized permission utilities consistently
  - Include preferences in user data queries for complete permission checks
  - Provide descriptive error messages that mention 'superadmin' as a valid role
  - Use proper error handling that doesn't terminate sessions for permission errors

### 4. Frontend Components

- Updated hooks and components to correctly identify 'superadmin' permissions
- Improved error messaging to be more descriptive about permission requirements

### 5. Testing

- Created `test-superadmin-rls.js` script to verify that RLS policies work correctly for 'superadmin' users
- The script tests all CRUD operations against the 'programs' table with 'superadmin' role

## Complete List of Modified Files

1. Database:
   - `/supabase/migrations/20240620000002_update_programs_rls.sql` (new)

2. Backend API Routes:
   - `/app/api/learning/programs/route.ts`
   - `/app/api/learning/courses/route.ts`
   - `/app/api/auth/me/route.ts`

3. Services & Utilities:
   - `/lib/auth/permission-utils.ts`
   - `/lib/services/learning/program-service.ts`
   - `/lib/hooks/useUserPermissions.ts`
   - `/middleware.ts`

4. Scripts & Documentation:
   - `/scripts/normalize-superadmin-roles.js` (new)
   - `/scripts/test-superadmin-rls.js` (new)
   - `/docs/programs-rls-policy.md` (new)
   - `/docs/SUPERADMIN-PERMISSIONS.md` (this file)

## Key Implementation Details

### Case-Insensitive Role Checking

All role checks now use case-insensitive comparison:

```javascript
// Before
if (userData.role === 'admin' || userData.role === 'superadmin') {
  // Allow access
}

// After - using the utilities
if (hasRole(userData, ['admin', 'superadmin'])) {
  // Allow access
}
```

### Row-Level Security Policies

The new RLS policies use a case-insensitive check for 'superadmin':

```sql
-- Example INSERT policy
CREATE POLICY "Authorized roles can insert programs"
ON programs FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (
      -- Case-insensitive check for superadmin
      LOWER(role) = 'superadmin' OR
      role = 'admin' OR 
      role = 'training_manager' OR
      role = 'content_manager' OR
      is_admin = true
    )
  )
);
```

### API Permission Checks

All API endpoints now use the centralized utility functions:

```javascript
// Using centralized permission function
if (!canCreateContent(unifiedUserData)) {
  // Log permission denial
  logPermissionDenial(unifiedUserData, 'create program');
  
  // Return 403 with descriptive message
  return NextResponse.json(
    { 
      error: 'Permission denied - requires content management permissions',
      requiresAuth: false, // Flag to indicate it's not an auth error
      details: 'You need admin, superadmin, manager, or content creation permissions to create programs'
    }, 
    { status: 403 }
  );
}
```

## How to Verify

1. Run the normalization script to ensure 'superadmin' roles are consistently formatted:
   ```
   node scripts/normalize-superadmin-roles.js
   ```

2. Run the RLS test script to verify that database policies are correctly implemented:
   ```
   node scripts/test-superadmin-rls.js
   ```

3. Login as a superadmin user and verify that you can:
   - View all programs (including draft/unpublished)
   - Create new programs
   - Edit existing programs
   - Delete programs

## Future Considerations

1. Consider moving more of the permission logic to RLS policies to reduce duplication in application code
2. Implement more comprehensive permission logging and debugging tools
3. Create a unified permission management interface for administrators
4. Consider moving from role-based to permission-based access control for finer-grained access management 