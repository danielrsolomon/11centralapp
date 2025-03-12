# User Preferences in 11Central

## Overview

This document explains how user preferences are stored and accessed in the 11Central application, including recent changes to resolve the "Error fetching user profile with code: '42703'" issue.

## The Preferences Structure

User preferences are stored in a dedicated `user_preferences` table, not as a column in the `users` table. The application includes several types of preferences:

1. **Notification Preferences** (email, text, app notifications)
2. **Content Permissions** (creation, editing, deletion rights)
3. **UI Preferences** (display options, theme settings)

## Recent Fixes - Column Not Found (42703) Error

The application was previously trying to access a non-existent `preferences` column in the `users` table, causing SQL errors with the PostgreSQL error code 42703 ("undefined column"). This led to:

1. 500 errors from the `/api/auth/me` endpoint
2. Users being forcibly redirected to `/auth/login`
3. Permission checks failing, preventing content creation and management

### Solution Implemented

We've made the following changes to resolve these issues:

1. **Updated Data Access**: 
   - Modified all code to fetch preferences from the `user_preferences` table instead of `users.preferences`
   - Created unified user objects that combine user data and preferences data

2. **Error Handling**:
   - Updated the `/api/auth/me` endpoint to return graceful fallbacks instead of 500 errors
   - Modified `SessionErrorDetector` to ignore database column errors (42703)
   - Prevented forced logouts by returning 200 status codes with partial data

3. **Permission Utilities**:
   - Enhanced permission check functions to handle missing preferences gracefully
   - Added support for both `preferences` and `user_preferences` in user objects
   - Implemented comprehensive error handling in permission checks

4. **Database Migration**:
   - Created a migration script to ensure the `user_preferences` table exists
   - Added logic to migrate any data from `preferences` column if it exists
   - Set up proper database policies for the table

## How Preferences Are Now Accessed

The updated code pattern for accessing user preferences is:

```typescript
// In API routes
const { data: userData } = await supabase
  .from('users')
  .select('id, email, role, is_admin')
  .eq('id', user.id)
  .single();

const { data: userPreferences } = await supabase
  .from('user_preferences')
  .select('*')
  .eq('user_id', user.id)
  .single();

// Combine for permission checks
const unifiedUser = {
  ...userData,
  preferences: userPreferences || undefined
};

// Use permission utilities
if (canCreateContent(unifiedUser)) {
  // Allow content creation
}
```

## Preventing Future Issues

1. **Error Detection**: The `SessionErrorDetector` component has been enhanced to distinguish between genuine auth errors and database schema issues, preventing unnecessary logouts.

2. **Graceful Fallbacks**: The `/api/auth/me` endpoint now returns basic user data and default permissions even when errors occur, ensuring the app remains functional.

3. **Robust Permission Checks**: All permission utilities now have comprehensive error handling to prevent crashes if preference data is missing or structured differently.

## Testing the Fix

After deploying these changes:

1. Users should be able to access `/dashboard/university/content` without being redirected or logged out
2. The 500 error from `/api/auth/me` should no longer occur
3. Users with appropriate roles (admin, manager, superadmin) should be able to create content
4. Database errors should no longer trigger session termination 