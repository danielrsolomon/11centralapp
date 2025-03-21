# Authentication Flow Documentation

This document describes the authentication flow between the frontend application and API server in the E11EVEN Central app.

## Overview

The E11EVEN Central app uses a modern authentication system that leverages Supabase Auth for user management and JWT-based authentication. The flow is designed to work seamlessly across both client and server environments.

### Key Components

- **Frontend Auth Provider**: Manages authentication state in the React application
- **API Auth Endpoints**: Handle authentication requests from the frontend
- **Server-Side Session Management**: Stores and validates user sessions on the server
- **Supabase Integration**: Provides the underlying authentication service

## Authentication Flow

### 1. Login Process

1. User enters credentials in the login form
2. Frontend sends credentials to `/api/auth/login` endpoint
3. API validates credentials with Supabase 
4. On success, API returns user and session data
5. Frontend stores the session token in localStorage
6. Auth state is updated in the Auth Provider context

### 2. Session Validation

1. On app initialization, the Auth Provider checks for an existing token
2. If a token exists, it's sent to `/api/auth/session` with the Authorization header
3. API validates the token with Supabase
4. If valid, the API returns user data and refreshed session information
5. Frontend updates its auth state with the user information

### 3. Protected Requests

1. Frontend includes the Authorization header with the token in all API requests
2. API endpoints that require authentication validate the token
3. If invalid, a 401 error is returned
4. If valid, the request proceeds with the authenticated user context

### 4. Logout Process

1. User clicks logout
2. Frontend sends request to `/api/auth/logout` with current token
3. API invalidates the token in Supabase and removes server-side session
4. Frontend clears the local session storage
5. Auth state is updated to reflect the logged-out state

## Implementation Details

### Frontend Authentication

The frontend uses an Auth Provider context that:

```typescript
// src/providers/auth-provider.tsx
// Key functionality:
// 1. Initializes auth state by checking for existing sessions
// 2. Provides login/logout methods
// 3. Exposes user and auth state to components
```

Components access auth state using the `useAuth` hook:

```typescript
const { user, isLoading, error, login, logout } = useAuth();
```

### API Authentication Endpoints

#### GET /api/auth/session

- **Purpose**: Validates a token and returns the corresponding user session
- **Authentication**: Requires valid token in Authorization header
- **Response**: User data and session information
- **Status Codes**: 
  - 200: Valid session
  - 401: Invalid or missing token

#### POST /api/auth/login

- **Purpose**: Authenticates user credentials and creates a new session
- **Body**: `{ email: string, password: string }`
- **Response**: User data and session token
- **Status Codes**:
  - 200: Successful login
  - 401: Invalid credentials

#### POST /api/auth/logout

- **Purpose**: Invalidates the current session
- **Authentication**: Optional token in Authorization header
- **Response**: Success message
- **Status Codes**:
  - 200: Successfully logged out

#### GET /api/auth/user

- **Purpose**: Retrieves user data for the authenticated user
- **Authentication**: Requires valid token in Authorization header
- **Response**: User data
- **Status Codes**:
  - 200: User data retrieved successfully
  - 401: Invalid or missing token

### Server-Side Session Management

The API server uses an in-memory session storage system:

```typescript
// src/api/utils/sessionStorage.ts
// Features:
// 1. Interface for storage operations (getItem, setItem, removeItem)
// 2. In-memory implementation using Map
// 3. Helper functions for managing user sessions
```

This can be extended to use a persistent storage solution like Redis for production environments.

## Security Considerations

1. **Token Storage**: 
   - Tokens are stored in localStorage on the client
   - Consider using secure HTTP-only cookies in production

2. **Token Validation**:
   - All tokens are validated on every request
   - Short expiration times reduce risk from stolen tokens

3. **Server-Side Sessions**:
   - The current implementation uses in-memory storage
   - For production, implement a persistent and scalable solution

## Testing Authentication Flow

### Manual Testing

1. **Login Flow**:
   ```
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'
   ```

2. **Session Validation**:
   ```
   curl http://localhost:3001/api/auth/session \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **Accessing User Data**:
   ```
   curl http://localhost:3001/api/auth/user \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

4. **Logout**:
   ```
   curl -X POST http://localhost:3001/api/auth/logout \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

### Automated Testing

Implement automated tests for:
- Login with valid and invalid credentials
- Token validation
- Session expiration and refresh
- Access to protected resources

## Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**:
   - Check if the token is included in the Authorization header
   - Verify the token hasn't expired
   - Ensure the token format is correct (Bearer prefix)

2. **Missing User Data**:
   - Check browser console for errors
   - Verify the API is returning the expected user structure
   - Check network requests for API communication issues

3. **Session Persistence Problems**:
   - Clear localStorage and try logging in again
   - Check for errors in the auth provider initialization
   - Verify the session token format is correct

## Future Improvements

1. **Persistent Server-Side Storage**:
   - Implement Redis-based session storage for production
   - Add session replication for multi-instance deployments

2. **Enhanced Security**:
   - Add CSRF protection
   - Implement rate limiting for login attempts
   - Add device tracking and session management

3. **Auth Features**:
   - Password reset flow
   - Email verification
   - Multi-factor authentication 