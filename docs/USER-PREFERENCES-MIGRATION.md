# User Preferences Migration Guide

## Overview

This document outlines the changes made to fix references to a non-existent `preferences` column in the `users` table. The issue was causing PostgreSQL error 42703 (column "preferences" of relation "users" does not exist) when attempting to query user data with preferences.

## Problem

The code was attempting to query a `preferences` column directly from the `users` table:

```sql
SELECT id, email, role, is_admin, preferences FROM users
```

However, the actual user preferences are stored in a separate `user_preferences` table, not as a column in the `users` table.

## Solution

The following changes were made:

1. Removed `preferences` from all `SELECT` queries on the `users` table
2. Added separate queries to the `user_preferences` table when needed
3. Updated data structures to include preferences under `user_preferences` instead of `preferences`
4. Updated permission utilities to check for preferences in the correct locations

## Modified Files

1. **API Routes**:
   - `/app/api/learning/programs/route.ts`
   - `/app/api/learning/courses/route.ts`

2. **Utility Functions**:
   - `/lib/auth/permission-utils.ts`

## How to Work with User Preferences

### Querying User Preferences

Always query preferences from the separate `user_preferences` table:

```javascript
// CORRECT way to get user preferences
const { data: userPreferences, error: preferencesError } = await supabase
  .from('user_preferences')
  .select('*')
  .eq('user_id', userId)
  .single();

// Handle the case where no preferences exist yet
if (preferencesError && preferencesError.code !== 'PGRST116') {
  console.warn('Error fetching user preferences:', preferencesError);
}

// Use the preferences
const unifiedUserData = {
  ...userData,
  user_preferences: userPreferences || {} // Store under user_preferences
};
```

### Checking Permissions

When checking if a user has permission to perform an action:

```javascript
// CORRECT way to check permissions
if (canCreateContent(user)) {
  // Allow the action
}
```

The `canCreateContent`, `canEditContent`, and `canDeleteContent` functions in `permission-utils.ts` have been updated to check for permissions in the correct locations, with priority given to the `user_preferences` field.

### User Preferences Table Structure

The `user_preferences` table includes:

- Content creation/editing/deletion permissions
- Notification preferences
- Other user-specific settings

## Error Prevention

This migration fixed the PostgreSQL error 42703 by:

1. Removing references to the non-existent column
2. Querying the correct table for preferences data
3. Providing graceful fallbacks when preferences aren't found

## Testing

After applying these changes, program creation now works properly for users with appropriate permissions, without encountering database errors related to the non-existent `preferences` column. 