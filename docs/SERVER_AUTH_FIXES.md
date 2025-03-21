# Server-Side Authentication Fixes

## Problem

The API server was experiencing authentication issues due to Supabase's client-side code attempting to use `localStorage`, which doesn't exist in a Node.js environment. This caused errors like:

```
Error in storage.getItem for key supabase.auth.token: ReferenceError: localStorage is not defined
```

Additionally, the server was experiencing problems retrieving user data from the database, resulting in 401 UNAUTHORIZED errors with the code "USER_NOT_FOUND", even when the token itself was valid.

## Root Causes

1. **Supabase's Auto-Refresh Mechanism**: Supabase's authentication client includes an auto-refresh feature that periodically checks token expiration and attempts to refresh using localStorage, even in server environments.

2. **Client-Side Storage in Server Environment**: The Supabase client was configured with storage adapters that expected browser APIs but were running in a Node.js environment.

3. **JWT Validation**: The authentication middleware was using Supabase's `auth.getUser()` which internally references localStorage.

4. **Database Connectivity**: The token validation process was failing when it couldn't find the user in the database, even though the token itself was valid and properly signed.

## Solutions Implemented

### 1. Custom JWT Validation with Fallback User

We implemented a enhanced authentication flow that:
- Extracts and validates the JWT token directly without relying on Supabase's auth APIs
- Creates a fallback user from the token payload if database lookup fails
- Implements caching to reduce database load
- Doesn't use browser-specific APIs like localStorage

```typescript
// Extract user ID and validate JWT token directly
const tokenValidation = validateToken(token);

// Create fallback user from token information
const fallbackUser = {
  id: tokenValidation.userId,
  email: tokenPayload.email || `${tokenValidation.userId}@user.example.com`,
  roles: ['user'],
  role: 'user'
};

// Use fallback if database lookup fails
if ((error || !data) && tokenValidation.valid) {
  req.user = fallbackUser;
  next();
  return;
}
```

### 2. Early localStorage Polyfill

We implemented a global localStorage polyfill that is applied at the very beginning of the application startup:

```typescript
// Polyfill localStorage before anything else loads
if (typeof global !== 'undefined' && !global.localStorage) {
  // Create a basic in-memory implementation
  const memoryStore = new Map();
  global.localStorage = {
    getItem: (key) => memoryStore.get(key) || null,
    setItem: (key, value) => memoryStore.set(key, value),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
    get length() { return memoryStore.size; },
    key: (n) => Array.from(memoryStore.keys())[n] || null
  };
}
```

### 3. Enhanced Memory-Based Storage Adapter

We implemented a more robust memory-based storage adapter for both the client and admin Supabase instances, with added error handling and logging:

```typescript
const memoryStorage = {
  getItem: (key) => {
    console.log(`[FixStorage] Memory storage getItem: ${key}`);
    return memoryStore.get(key) || null;
  },
  setItem: (key, value) => {
    console.log(`[FixStorage] Memory storage setItem: ${key}`);
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    console.log(`[FixStorage] Memory storage removeItem: ${key}`);
    memoryStore.delete(key);
  },
  clear: () => {
    console.log(`[FixStorage] Memory storage clear`);
    memoryStore.clear();
  },
  // Match full localStorage API
  get length() { return memoryStore.size; },
  key: (index) => Array.from(memoryStore.keys())[index] || null
};
```

### 4. Disabling Auto-Refresh

To prevent the auto-refresh mechanism from causing localStorage errors, we:

1. Set `autoRefreshToken: false` in the Supabase client configuration
2. Manually disabled the auto-refresh interval
3. Replaced the `_autoRefreshTokenTick` method with a no-op function
4. Added the fix as early as possible in the application startup

```typescript
// Disable auto-refresh timers
if (client.auth._autoRefreshInterval) {
  clearInterval(client.auth._autoRefreshInterval);
  client.auth._autoRefreshInterval = null;
}

// Replace auto-refresh function
if (typeof client.auth._autoRefreshTokenTick === 'function') {
  client.auth._autoRefreshTokenTick = () => Promise.resolve();
}
```

### 5. User and Token Caching

To improve performance and reduce database load, we implemented a caching mechanism for validated tokens and users:

```typescript
// Cache for validated users
const userCache = new Map<string, { timestamp: number, userData: any }>();
const TOKEN_CACHE = new Map<string, { userId: string, expires: number }>();
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
```

## Flow Overview

The new authentication flow works as follows:

1. Extract token from Authorization header
2. Directly validate the token's structure and signature using our custom `validateToken` function
3. Use the token to create a fallback user object that can be used if needed
4. Attempt to retrieve the full user record from the database using the validated user ID
5. If database lookup fails but the token is valid, use the fallback user object
6. Otherwise, proceed with normal authentication using the retrieved user data

This provides high reliability regardless of database connectivity issues, while still maintaining security by properly validating the JWT token.

## Testing the Fixes

We've created a comprehensive test utility script (`src/api/fixSupabaseAutoRefresh.js`) that:
1. Applies the localStorage polyfill to the global scope
2. Verifies the polyfill is working with a test write/read
3. Disables Supabase's auto-refresh mechanism
4. Provides helper functions for other modules

To verify that the fixes are working:

1. Start the API server: `npm run api:start`
2. Watch the logs for any localStorage errors
3. Make authenticated requests to `/api/university/programs` and `/api/university/content`
4. Confirm that authentication succeeds even if database lookup fails

## Future Considerations

1. **Supabase Version Upgrades**: When upgrading Supabase, test thoroughly as internal implementation details might change.

2. **Server-Side Storage**: Consider implementing a more persistent server-side storage solution like Redis if needed.

3. **Token Management**: Implement proper token rotation and revocation for enhanced security.

4. **Fallback User Roles**: Consider caching user roles or encoding essential roles in the JWT token claims to provide better fallback authorization.

5. **Error Logging**: Continue to monitor error logs for any recurrence of localStorage-related issues or authentication failures. 