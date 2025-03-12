# Changelog: User Preferences Fix

## Issue: PostgreSQL Error 42703

Error message: `column "preferences" of relation "users" does not exist`

This error occurred because the code was attempting to query a non-existent `preferences` column directly from the `users` table, but the actual user preferences are stored in a separate `user_preferences` table.

## Changes Made

### 1. API Routes

#### `/app/api/learning/programs/route.ts`

- Removed `preferences` from all `SELECT` queries on the `users` table
- Added separate queries to fetch user preferences from the `user_preferences` table
- Updated user object construction to include preferences under `user_preferences` key instead of `preferences`
- Added error handling for preference queries that gracefully handles missing preferences
- Updated the GET endpoint to correctly check for superadmin role without needing preferences

#### `/app/api/learning/courses/route.ts`

- Removed `preferences` from all `SELECT` queries on the `users` table 
- Added separate queries to fetch user preferences from the `user_preferences` table
- Updated user object construction to include preferences under `user_preferences` key instead of `preferences`
- Added error handling for preference queries that gracefully handles missing preferences

### 2. Permission Utilities

#### `/lib/auth/permission-utils.ts`

- Updated permission check functions (`canCreateContent`, `canEditContent`, `canDeleteContent`) to look for preferences in the correct locations
- Prioritized checking the `user_preferences` field over the legacy `preferences` field
- Added clear comments explaining the preference structure and backward compatibility
- Made minor improvements to the `canDeleteContent` function's role-based check logic
- Added proper error handling to prevent crashes when preference structures are missing

### 3. Documentation

#### `/docs/USER-PREFERENCES-MIGRATION.md` (new)

- Created a comprehensive guide explaining the issue and solution
- Added examples of correct ways to query and use user preferences
- Documented the structure of the `user_preferences` table
- Provided guidance on how to avoid similar issues in the future

#### `/docs/CHANGELOG-PREFERENCES-FIX.md` (this file)

- Detailed changelog of all changes made to fix the issue

## Testing Considerations

The changes ensure that:

1. No code attempts to access the non-existent `preferences` column from the `users` table
2. All permission checks correctly look for preferences in the `user_preferences` field first
3. Code handles the case where a user doesn't have any preferences set yet
4. Backward compatibility is maintained with any code still using the old structure

## Benefits

1. Fixed PostgreSQL error 42703 during program creation
2. Improved error handling for missing preferences
3. Made preference checking more consistent across the codebase
4. Better documented the correct way to work with user preferences
5. Maintained backward compatibility while fixing the issue

## Future Recommendations

1. Remove all legacy references to `preferences` after confirming all code has been updated
2. Consider adding a helper utility function for fetching user data with preferences
3. Standardize error handling for preference queries throughout the codebase
4. Add validation checks for user preference data to catch potential issues early 