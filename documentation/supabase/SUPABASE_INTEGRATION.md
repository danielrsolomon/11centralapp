# Supabase Integration Guide for E11EVEN Central App

**Last Updated: 2024-03-21**

## Table of Contents
- [Introduction and Architecture](#introduction-and-architecture)
- [Setup and Configuration](#setup-and-configuration)
- [API-Based Authentication](#api-based-authentication)
- [Data Access Patterns](#data-access-patterns)
- [Module-Specific Implementation](#module-specific-implementation)
  - [University Module](#university-module)
  - [Scheduling Module](#scheduling-module)
  - [Chat Module](#chat-module)
- [Security Considerations](#security-considerations)
- [Real-time Features](#real-time-features)
- [Migration from Direct Calls to API Routes](#migration-from-direct-calls-to-api-routes)
- [Troubleshooting](#troubleshooting)

## Introduction and Architecture

The E11EVEN Central application utilizes Supabase for authentication, database access, and real-time features. However, to ensure security, maintainability, and separation of concerns, **all Supabase operations must be performed through API routes** rather than directly from the client.

### API-First Architecture

Our application follows an API-first architecture for all Supabase operations:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    React UI     │────▶│   API Routes    │────▶│    Supabase     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Client-side             Server-side           External Service
```

This architecture provides several benefits:
- **Security**: Sensitive operations and credentials are kept server-side
- **Consistency**: Business logic is centralized in the API
- **Maintainability**: Frontend code is simplified and focused on presentation
- **Flexibility**: Backend implementation details can change without affecting clients

### Minimal Client-Side Supabase Usage

The **only** permitted direct Supabase client usage on the frontend is for:

1. **Session management** (through auth state listeners)
   - `supabase.auth.getSession()` - Get current session
   - `supabase.auth.setSession()` - Store session from API response
   - `supabase.auth.onAuthStateChange()` - Listen for auth changes

2. **Real-time subscriptions** (when required for performance)
   - `supabase.channel()` - Subscribe to real-time updates
   - `supabase.from('channel').on()` - Listen for specific events

All other operations, including:
- Authentication (signup, login, password reset)
- Database queries and mutations
- Storage operations
- User management
- Role and permission checks

**MUST** go through the API routes.

## Setup and Configuration

### Server-Side Setup

The API server uses `supabaseAdmin` client with service role credentials:

```typescript
// src/api/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})
```

### Client-Side Setup

The client uses a minimal Supabase instance with anonymous key:

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})
```

## API-Based Authentication

Authentication is handled through the API rather than directly with Supabase on the client.

```typescript
// Instead of this (❌ NOT ALLOWED):
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})

// Do this (✅ CORRECT):
const { data, error } = await api.post('/auth/login', {
  email, password
})
```

The authentication endpoints are in `/api/routes/auth/index.ts` and include:
- `/auth/login` - Email/password login
- `/auth/signup` - User registration
- `/auth/logout` - User logout
- `/auth/user` - Get current user
- `/auth/reset-password` - Password reset
- `/auth/change-password` - Password change
- `/auth/session` - Get and refresh session

## Data Access Patterns

### The Correct Pattern

1. Client-side service makes HTTP request to API endpoint
2. API route authenticates the user
3. API validates the request
4. API uses `supabaseAdmin` to interact with the database
5. API formats and returns the response

Example:
```typescript
// Client-side service
const getPrograms = async () => {
  try {
    const response = await api.get('/university/programs/published');
    
    if (!response.success) {
      return { error: response.error?.message, programs: null };
    }
    
    return { programs: response.data };
  } catch (error) {
    return { error: error.message, programs: null };
  }
};

// Server-side API route
router.get('/programs/published', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('programs')
      .select('*')
      .eq('status', 'published');
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: { message: error.message } 
    });
  }
});
```

## Module-Specific Implementation

### University Module

The University module **must** use API routes for all operations:

- Program, course, lesson, and module management
- Content hierarchy retrieval
- User progress tracking
- Content archiving/restoring

**Client Services:**
- `src/services/universityService.ts` provides API-based methods for all university operations

**API Routes:**
- `/api/university/programs` - Program management
- `/api/university/courses` - Course management
- `/api/university/lessons` - Lesson management
- `/api/university/modules` - Module management
- `/api/university/progress` - User progress tracking
- `/api/university/content` - Content management operations

### Scheduling Module

The Scheduling module **must** use API routes for all operations:

- Appointment creation, retrieval, updates, and cancellation
- Availability management
- Service management

**Client Services:**
- `src/services/scheduleService.ts` provides API-based methods for all scheduling operations

**API Routes:**
- `/api/schedule/appointments` - Appointment management
- `/api/schedule/availability` - Provider availability management
- `/api/schedule/services` - Service management

**Using the Scheduling Service:**

```typescript
// Example of using scheduleService to create an appointment
const createAppointment = async (appointmentData) => {
  const response = await scheduleService.createAppointment({
    provider_id: "provider-uuid",
    service_id: "service-uuid",
    date: "2024-04-01",
    start_time: "13:00",
    end_time: "14:00",
    notes: "Optional notes"
  });
  
  if (!response.success) {
    console.error('Failed to create appointment:', response.error);
    return;
  }
  
  console.log('Appointment created:', response.data);
};
```

### Chat Module

The Chat module uses API routes for most operations but leverages Supabase's real-time features for message delivery.

**Client Services:**
- `src/services/chatService.ts` provides API-based methods for chat operations
- Limited real-time subscriptions for message delivery

**API Routes:**
- `/api/chat/rooms` - Chat room management
- `/api/chat/messages` - Message management
- `/api/chat/participants` - Chat participant management

## Security Considerations

Using the API-first approach greatly enhances security:

1. **No exposed credentials**: Service role keys remain server-side only
2. **Enhanced authorization**: API routes implement additional authorization checks
3. **Input validation**: All client inputs are validated before database operations
4. **Error sanitization**: Detailed error messages are sanitized before client responses
5. **Audit logging**: API routes can implement comprehensive logging

## Real-time Features

Real-time features require direct Supabase client usage, but should be minimal:

```typescript
// Acceptable use of direct Supabase client for real-time
const setupChatSubscription = (roomId, onNewMessage) => {
  return supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `room_id=eq.${roomId}`
    }, onNewMessage)
    .subscribe();
};
```

Even with real-time features, all write operations should use the API routes.

## Migration from Direct Calls to API Routes

We're in the process of migrating all direct Supabase calls to use API routes. If you find any direct database calls in the codebase (outside of real-time subscriptions or session management), please refactor them.

## Common Pitfalls to Avoid

1. **Direct Database Access**: Never use `supabase.from()` to directly query tables from the client, except in permitted real-time subscriptions.

2. **Direct Authentication Methods**: Never use `supabase.auth.signIn()`, `supabase.auth.signUp()`, etc., directly from client code.

3. **Bypassing API with Utils**: Avoid creating utility functions that use direct Supabase access as a way to bypass the API-first approach.

4. **Inconsistent Error Handling**: Always follow the standardized error response format in API routes.

5. **Using Service Role Keys in Client**: Never expose the `SUPABASE_SERVICE_ROLE_KEY` in client-side code, even in environment variables.

## Troubleshooting

### API Response Errors

If you encounter errors when using API endpoints, check:

1. Authentication: Ensure the user is authenticated and the access token is valid
2. Request format: Verify the request payload matches the expected schema
3. Permissions: Confirm the user has the required permissions for the operation
4. Network: Check for any network connectivity issues

### Real-time Subscription Issues

For real-time subscription problems:

1. Channel format: Ensure channel names follow the correct format
2. Reconnection: Implement reconnection logic in case of disconnects
3. Event types: Verify you're listening for the correct event types
4. Filters: Check that your filters are correctly targeting the data you want

### Session Management

For session-related issues:

1. Token expiration: Handle token refreshes correctly
2. Session sync: Ensure frontend and backend session state stays in sync
3. Session persistence: Properly persist sessions in localStorage if required 