# Authentication Troubleshooting Guide

This document provides solutions for common authentication issues in the E11EVEN Central App.

## Common Issues

### 1. "Invalid Token" or "Token Expired" Errors

**Symptoms:**
- API returns 401 errors with message "Invalid or expired token"
- User is unexpectedly logged out

**Possible Causes:**
- Token has legitimately expired
- Token storage is corrupted
- Server-side session was removed

**Solutions:**
- Implement automatic token refresh in your auth provider
- Clear local storage and log in again
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in your environment
- Verify that server-side session storage is functioning

### 2. API Server Not Recognizing Authentication

**Symptoms:**
- Auth endpoints return 401 errors even with valid tokens
- Sessions API call fails

**Possible Causes:**
- API server is using a different Supabase project/URL
- Environment variables not loaded correctly
- Missing server-side session storage

**Solutions:**
- Verify `.env.local` contains the correct Supabase credentials
- Check both `VITE_SUPABASE_URL` and `SUPABASE_URL` are set correctly
- Restart the API server with `npm run api:start`
- Check for errors in the API server logs

### 3. "localStorage is not defined" Errors

**Symptoms:**
- API server logs show "localStorage is not defined" errors
- Authentication works but logs show warnings

**Cause:**
- This is normal in a Node.js environment and can be safely ignored
- The server-side custom storage adapter is handling this case correctly

**Solution:**
- No action needed, these are debug messages only
- The custom storage adapter in `supabaseAdmin.ts` handles server-side storage

### 4. Session Not Persisting Between Requests

**Symptoms:**
- User needs to log in repeatedly
- API calls return 401 even after successful login

**Possible Causes:**
- Client not storing the token correctly
- Token not included in API requests
- Server-side session storage failure

**Solutions:**
- Check that the Authorization header is formatted correctly: `Bearer <token>`
- Verify tokens are being stored in localStorage or sessionStorage
- Check that the session management endpoints are correctly implemented
- Validate that the server's session storage is working with tests

### 5. Development Login Failures

**Symptoms:**
- Cannot log in with test accounts in development
- API returns authentication errors

**Solutions:**
- Use the `/api/auth/dev-login` endpoint with test accounts:
  ```
  POST /api/auth/dev-login
  { "username": "test" }
  ```
- Available test accounts: `test`, `admin`, `daniel`
- This only works when `NODE_ENV=development`

## Running Authentication Tests

If you suspect authentication issues, run the auth tests to validate the system:

```bash
# Start the API server first
npm run api:start

# Run just the unit tests
npm run test:auth:unit

# Run the full authentication flow tests
npm run test:auth:integration

# Run all auth tests
npm run test:auth
```

## Server-Side Session Management

The server uses an in-memory session storage system to manage sessions. Note:

1. Sessions are not persisted across server restarts
2. Multiple server instances will not share session data
3. For production, consider implementing Redis or another shared storage

## Debugging Tools

For deeper authentication debugging:

```bash
# Check API server health
curl http://localhost:3001/api/health

# Test a token validation
curl -X POST http://localhost:3001/api/auth/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN"}'

# Get session information
curl http://localhost:3001/api/auth/session \
  -H "Authorization: Bearer YOUR_TOKEN"
``` 