# Authentication Flow Fixes for University Endpoints

## Issue Summary

The application was experiencing UNAUTHORIZED (401) errors when accessing the `/university/programs` and `/university/content` endpoints. Users were not able to access university content despite being logged in properly. Additionally, the server was encountering `localStorage is not defined` errors because the server-side Supabase client was attempting to use browser-specific localStorage.

## Root Causes

1. **Duplicate Route Definitions**: In the `src/api/routes/university/programs.ts` file, there were multiple, conflicting route definitions for the same endpoints:
   - For `GET /api/university/programs`: One with authentication (line 73-100) and one without
   - For `GET /api/university/programs/:programId`: One with authentication (line 174-234) and one without (line 446-471)
   - For `GET /api/university/programs/published`: Missing `requireAuth` middleware

2. **Authentication Middleware Missing**: Several routes were defined without the `requireAuth` middleware, allowing unauthenticated access.

3. **Database Column Error**: The API was trying to sort by an 'order' column that doesn't exist in the programs table, causing 500 errors.

4. **Server-side localStorage References**: The Supabase client in `src/services/supabase.ts` was using browser-specific localStorage, which doesn't exist in Node.js environments, causing runtime errors.

5. **Inconsistent Supabase Client Usage**: The auth middleware was using the frontend Supabase client (`supabase`) instead of the server-side admin client (`supabaseAdmin`).

## Fixes Applied

1. **Consolidated Routes**: Eliminated duplicate route definitions to ensure there's only one handler per route pattern.

2. **Added Authentication Middleware**: Applied the `requireAuth` middleware to all routes in the university module, including:
   - Main programs routes (`GET /api/university/programs`)
   - Program details routes (`GET /api/university/programs/:programId`)
   - Published programs routes (`GET /api/university/programs/published`)
   - Content-related routes (`/api/university/content/*`)

3. **Added Fallback Ordering**: Implemented fallback logic to handle the missing 'order' column:
   - First attempts to order by the 'order' column
   - If the database returns an error about the missing column, falls back to ordering by 'created_at'
   - This prevents 500 errors and ensures consistent sorting

4. **Fixed Type Errors**: Corrected type definitions in route handlers to ensure proper request and response typing.

5. **Replaced localStorage with MemoryStorageAdapter**: Updated the Supabase client in `src/services/supabase.ts` to use a memory-based storage adapter instead of browser-specific localStorage:
   - Created a `MemoryStorageAdapter` class that implements the Supabase storage interface
   - Replaced all localStorage references with the memory adapter
   - Ensured consistent session storage behavior across server and client

6. **Updated Authentication Middleware**: Modified the `requireAuth` middleware in `src/api/middleware/auth.ts` to:
   - Use the server-side `supabaseAdmin` client instead of the frontend `supabase` client
   - Maintain consistent token validation and user retrieval logic
   - Provide clear error messages for authentication failures

## Authentication Flow

1. The frontend stores authentication tokens in localStorage under the key 'authSession'.
2. When making API requests, the frontend sends the token in the 'Authorization' header using the Bearer scheme.
3. The API's `requireAuth` middleware validates the token and loads user data:
   - Checks for the presence of the Authorization header with a Bearer token
   - Verifies the token with the Supabase Admin client
   - Loads user data from the 'users' table
   - Adds the user object to the request for use in route handlers
   - Returns 401 Unauthorized if any step fails
4. The server-side Supabase client uses a memory-based storage adapter instead of localStorage, ensuring compatibility with Node.js environments.

## Testing Results

After implementing the fixes, the API endpoints now correctly:
1. Return 401 Unauthorized when no token is provided
2. Return 401 Unauthorized when an invalid token is provided
3. Process the request successfully when a valid token is provided
4. No longer encounter "localStorage is not defined" errors in server logs

All university endpoints now consistently enforce authentication, ensuring that only authenticated users can access university content, and the server operates without browser-specific dependencies.

## Recommendations

1. **Consistent Authentication**: Ensure all routes that should be protected have the `requireAuth` middleware applied.
2. **Route Organization**: Avoid creating duplicate routes with different middleware configurations.
3. **Database Schema Management**: Keep API code in sync with the database schema, or add fallback mechanisms for backward compatibility.
4. **Frontend Token Management**: Ensure the frontend correctly stores and sends authentication tokens with each request.
5. **Environment-Aware Storage**: Use environment-appropriate storage adapters (memory-based for server, localStorage for client) when implementing authentication.
6. **Consistent Supabase Client Usage**: Use `supabaseAdmin` for server-side operations and `supabase` for client-side operations. 