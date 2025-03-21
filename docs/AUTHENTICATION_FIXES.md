# Authentication Fixes Documentation

## Background

The E11EVEN Central App experienced authentication issues on the server side where the Supabase client was attempting to use `localStorage`, which only exists in a browser environment. This led to errors like:

```
Error in storage.getItem for key supabase.auth.token: ReferenceError: localStorage is not defined
```

These errors prevented proper authentication for API endpoints, particularly in the `/api/university/` routes.

## Implemented Fixes

### 1. Server-Side Storage Adapters

We implemented and correctly configured memory storage adapters for both the client and admin Supabase instances:

- **MemoryStorageAdapter in `src/services/supabase.ts`**: Used for client-side code that may run on the server during SSR
- **ServerStorageAdapter in `src/api/supabaseAdmin.ts`**: Used exclusively for server-side authentication

The key difference is that these adapters use in-memory JavaScript `Map` objects rather than accessing browser's `localStorage`.

### 2. Authentication Middleware Improvements

The authentication middleware (`src/api/middleware/auth.ts`) was updated to:

- Properly extract and validate tokens from the `Authorization` header
- Add enhanced error logging for better debugging
- Provide more specific error responses based on the type of authentication failure
- Add additional validation of JWT format before making Supabase requests

### 3. Supabase Client Configuration

Both the main Supabase client and the Admin client were configured to:

- Completely disable auto-refreshing of tokens on the server side
- Disable session persistence on the server
- Disable session detection in URLs (another source of localStorage references)
- Use pure in-memory storage adapters that don't trigger localStorage errors

### 4. Frontend API Service Enhancement

We updated the frontend API service to properly send authentication tokens with every request:

- Added a `getAuthToken()` function to retrieve tokens from localStorage with token expiration checking
- Updated the `apiRequest()` function to include the token in the Authorization header
- Added token refresh and retry mechanism for 401 errors 
- Added automatic redirection to login for authentication failures
- Implemented token fallback mechanisms to try multiple storage locations

### 5. Auth Debugging and Self-Healing

To help diagnose and fix authentication issues, we added:

- A floating debug panel that shows the current auth state (only in development mode)
- Utilities to inspect auth tokens and validate they're being stored correctly
- A test endpoint to verify API authentication is working correctly
- Self-healing functionality that can automatically fix common auth issues
- A "Fix Issues" button that can clear invalid tokens and redirect to login

### 6. Session Refresh Improvements

The session refresh mechanism was significantly enhanced:

- Added a timeout to prevent requests from hanging indefinitely
- Implemented fallback refresh via direct Supabase API when server API fails
- Added better error handling and logging for refresh failures
- Added token validity checks before sending requests

## Token Flow

1. **Frontend**: The frontend stores authentication tokens in `localStorage` and sends them with each API request in the `Authorization: Bearer <token>` header.

2. **API Service**: 
   - The `getAuthToken()` function retrieves the token from localStorage and checks if it's expired
   - The token is added to the Authorization header in all API requests
   - If an authentication error (401) is received, the service attempts to refresh the token and retry
   - If refresh fails, the user is redirected to the login page

3. **API Server**: 
   - The `requireAuth` middleware extracts the token from the `Authorization` header
   - It validates the basic format of the JWT token before making Supabase calls
   - The token is passed to `supabaseAdmin.auth.getUser(token)` for validation
   - If valid, the user data is retrieved from the database and added to the request object

4. **Memory Storage**:
   - Server-side authentication operations use pure in-memory storage
   - Auto token refresh is disabled on the server to prevent localStorage access
   - Session persistence is disabled on the server to prevent localStorage access

## Troubleshooting

If authentication issues persist:

1. Use the auth debug panel in development to verify tokens are being stored and sent correctly
2. Click the "Test API" button to verify your current token is accepted by the server
3. If the test fails, click "Fix Issues" to attempt automatic resolution
4. Clear invalid tokens by clicking "Fix Issues" and log in again
5. Check server logs for specific error messages (now enhanced with better debugging)
6. Verify the `Authorization` header is correctly formatted as `Bearer <token>`
7. Ensure environment variables for Supabase URL and service key are correctly set
8. Check that the user exists in the database and has the `is_active` flag set to true

### Using the Auth Debug Panel

In development mode, a floating panel appears in the bottom right corner with auth status information. It provides:

- Indicator for whether auth session data exists in localStorage
- Validity check for the authentication token
- Token expiration information
- A "Test API" button to verify the API connection with the current token
- A "Fix Issues" button that attempts to automatically resolve common auth problems

## Self-Healing Mechanism

The app now includes self-healing functionality that can:

1. Detect invalid tokens and remove them
2. Identify expired tokens and attempt refresh
3. Test API connections with current tokens
4. Automatically redirect to login when authentication issues are detected
5. Clean up stale or corrupted authentication data

This mechanism runs automatically when the app starts and is also available through the debug panel's "Fix Issues" button.

## Notes for Future Development

When implementing new authentication features:

1. Never use browser-specific APIs like `localStorage` or `sessionStorage` in server-side code
2. Always use the provided memory storage adapters when initializing Supabase clients on the server
3. Remember that the authentication middleware now expects tokens exclusively from the `Authorization` header
4. Use the `api` service exported from `apiService.ts` for all API calls to ensure tokens are included
5. For components that need authenticated API access, make sure they are wrapped in the `AuthProvider`
6. Be aware of the automatic token refresh and self-healing mechanisms when debugging auth issues 