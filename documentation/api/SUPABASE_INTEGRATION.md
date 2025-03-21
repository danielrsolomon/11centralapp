# Supabase Integration Guide

This document explains how Supabase is integrated into the E11EVEN Central App, with a focus on the differences between frontend and backend usage.

## Client-Side vs Server-Side Supabase Clients

The application uses two separate Supabase clients for different environments:

### Frontend Client

- **Location**: `src/services/supabase.ts`
- **Environment Variables**: 
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` 
- **Storage**: Uses browser's `localStorage` for session management
- **Purpose**: User authentication, data fetching with RLS (Row Level Security)

### Backend Client (API Server)

- **Location**: `src/api/supabaseAdmin.ts`
- **Environment Variables**: 
  - `SUPABASE_URL` (or fallback to `VITE_SUPABASE_URL`)
  - `SUPABASE_SERVICE_ROLE_KEY` (or fallback to `SUPABASE_KEY`)
- **Storage**: Uses a custom in-memory storage provider to avoid `localStorage` dependency
- **Purpose**: Admin-level operations, bypassing RLS, server-side validations

## Memory Storage Provider

The backend uses a custom memory storage provider to avoid `localStorage` which is not available in Node.js:

```typescript
// Custom memory storage for server-side use
const memoryStorage = new Map<string, string>();

const customStorageAdapter = {
  getItem: (key: string): string | null => {
    return memoryStorage.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    memoryStorage.delete(key);
  }
};

// Create client with custom storage
supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    storage: customStorageAdapter
  }
});
```

## Authentication Flow

The authentication flow works as follows:

1. User logs in through the frontend using the Supabase client
2. Frontend stores the session token in localStorage
3. For API calls, the token is sent in the Authorization header
4. The API server verifies the token using the `/api/auth/session` endpoint
5. If valid, the user session data is returned to the frontend

## API Authentication Endpoints

### GET /api/auth/session

- **Purpose**: Retrieves user session data based on the token in the Authorization header
- **Request**: 
  ```
  GET /api/auth/session
  Authorization: Bearer <token>
  ```
- **Response**: User data and session information
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        // ... other user data
      },
      "session": {
        "access_token": "token",
        "token_type": "bearer",
        "expires_at": 1620000000000
      }
    }
  }
  ```

### POST /api/auth/validate-token

- **Purpose**: Validates a token without returning full user data
- **Request Body**: 
  ```json
  { 
    "token": "your-token"
  }
  ```
- **Response**: Token validity status and user ID if valid
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "userId": "user-uuid"
    }
  }
  ```

## Troubleshooting

### Common Issues

- **"localStorage is not defined"**: This error occurs when trying to use the browser-based Supabase client in a Node.js environment. Make sure to use the `supabaseAdmin` client for server-side operations.

- **"Invalid token"**: Make sure you're passing the token correctly in the Authorization header: `Authorization: Bearer <token>`.

- **Missing Routes**: If API endpoints like `/api/auth/session` return 404, check that the auth routes are properly mounted in the API server.

### Best Practices

1. **Separate Clients**: Always use the appropriate client for each environment:
   - Frontend: `import { supabase } from '@/services/supabase';`
   - Backend: `import { supabaseAdmin } from '../supabaseAdmin';`

2. **Token Management**: Never store or log sensitive tokens in client-side code.

3. **Error Handling**: Always handle authentication errors gracefully, with appropriate redirects to login screens. 