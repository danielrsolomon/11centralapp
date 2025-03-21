# E11EVEN Central App API Documentation

<!-- 
  This document consolidates the following previous files:
  - API_DOCUMENTATION.md
  - API_ROUTES.md
  - API_ROUTES_SUMMARY.md
  
  Last Updated: 2024-05-20
-->

## Getting Started

This section provides step-by-step instructions for setting up and running the E11EVEN Central App API server locally.

### Installation

1. Clone the repository to your local machine
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Environment Configuration

1. Create a `.env.local` file in the project root directory (preferred) or use `.env.development` or `.env`
2. Add the following environment variables:

```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration (if needed separately)
DATABASE_URL=your_database_connection_string

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (for token validation, should match Supabase JWT secret)
JWT_SECRET=your_jwt_secret

# Storage Configuration
STORAGE_BUCKET=e11even-university-content

# Vite Configuration
VITE_API_URL=http://localhost:3001
```

Replace the placeholder values with your actual credentials from your Supabase project.

### Available Scripts

The following scripts are available in `package.json` for working with the API server:

- `npm run build:api`: Builds the API server using TypeScript compiler and the API-specific configuration in tsconfig.api.json
- `npm run start:api`: Starts the compiled API server in production mode (after building)
- `npm run dev:api`: Starts the API server in development mode with live reloading using tsx (not ts-node-esm)
- `npm run api:start`: Helper script that automatically loads environment variables and starts the API (recommended method)
- `npm run api:start:prod`: Starts the API server in production mode using the helper script
- `npm run dev:all`: Starts both the frontend and API server concurrently

### Starting the API Server

### Development Mode

```bash
# Recommended method
npm run api:start

# Alternative method
npm run dev:api
```

This will start the API server in development mode with live reloading. The server will be available at `http://localhost:3001`.

### Production Mode

```bash
# Build first
npm run build:api

# Method 1: Using the helper script (recommended)
npm run api:start:prod

# Method 2: Start directly
npm run start:api
```

The API server will start on the port specified in your environment variables (default: 3001).

You should see a message in the console indicating the server is running:

```
E11EVEN Central API server running on port 3001
```

If you are running the frontend application concurrently, you can use:

```bash
npm run dev:all
```

This command starts both the API server and the frontend development server.

### Recent API Updates

The API has been updated with the following improvements:

1. **Fixed ESM Module Support**: The API now properly supports ES modules with correct import/export syntax
2. **Standardized Response Format**: All API endpoints now return a consistent response format
3. **Improved Error Handling**: Better error handling, particularly for Supabase operations
4. **Environment Variable Management**: Enhanced environment variable loading from multiple sources
5. **Better TypeScript Support**: Fixed type definitions and improved TypeScript configuration

### Standardized API Response Format

All API responses now follow a standardized format:

#### Success Response

```json
{
  "success": true,
  "data": {
    // Response data goes here
    // Could be an object or an array
  }
}
```

#### Error Response

```json
{
  "success": false,
  "data": [], // Always an empty array in error responses
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional error details, may include stack trace in development
  }
}
```

## Error Handling

The API uses a standardized error handling approach. All errors are processed through the error handler middleware (`/src/api/middleware/error-handler.ts`).

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request parameters
- `INTERNAL_ERROR`: Server-side error
- `DATABASE_ERROR`: Database operation failed
- `SUPABASE_ERROR`: Error from Supabase operations
- `AUTHENTICATION_ERROR`: Authentication-related error

## Request & Response Format

### Request Format

Most endpoints accept JSON-formatted request bodies:

```
Content-Type: application/json
```

### Response Format

All API responses follow a consistent format as described above in the Standardized API Response Format section.

### Verifying the API is Running

To verify the API server is running correctly, you can make a simple request to the University module endpoint:

```bash
curl http://localhost:3001/api/university
```

If the server is running correctly, you should receive a JSON response with the following structure:

```json
{
  "success": true,
  "data": {
    "name": "University Module",
    "description": "Learning management system for E11EVEN Central",
    "endpoints": [
      "/api/university/programs",
      "/api/university/courses",
      "/api/university/modules",
      "/api/university/lessons",
      "/api/university/progress",
      "/api/university/content/hierarchy"
    ]
  }
}
```

### Frontend Integration

The frontend application communicates with the API server in the following ways:

1. **Development Mode**: When running in development mode, API requests from the frontend (running on port 5173 or 5174) are proxied to the API server (port 3001) via Vite's proxy configuration in `vite.config.ts`:

```javascript
// vite.config.ts
export default {
  // ...
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
};
```

2. **Production Mode**: In production, both the frontend and API are served from the same origin, so no proxy configuration is needed.

If you're experiencing CORS issues during development, ensure the proxy is correctly configured and that the API server has appropriate CORS headers enabled.

## API Architecture

### Directory Structure

```
/src/api/
├── index.ts                 # Main entry point
├── server.ts                # Server startup script
├── types.ts                 # API-specific type definitions
├── supabaseAdmin.ts         # Server-side Supabase client
├── middleware/              # Middleware components
│   ├── auth.ts              # Authentication middleware
│   ├── error-handler.ts     # Error handling middleware
│   └── validation.ts        # Request validation middleware
├── routes/                  # API routes
│   ├── university/          # University module routes
│   ├── chat/                # Chat module routes
│   ├── schedule/            # Schedule module routes
│   ├── gratuity/            # Gratuity module routes
│   ├── admin/               # Admin module routes
│   └── index.ts             # Routes entry point
├── services/                # Service layer  
│   ├── baseDataService.ts   # Base service with common CRUD operations
│   ├── programService.ts    # Program-related operations
│   ├── courseService.ts     # Course-related operations
│   ├── moduleService.ts     # Module-related operations
│   ├── lessonService.ts     # Lesson-related operations
│   └── progressService.ts   # Progress tracking operations
└── utils/                   # Utility functions
    ├── response-formatter.ts # Response formatting utilities
    └── error-utils.ts       # Error handling utilities
```

## Troubleshooting

### Common API Server Issues

1. **Module Resolution Errors**:
   - Error message: `Unknown file extension '.ts'`
   - Solution: Ensure the `type` field in package.json is set to "module" and use `tsx` instead of `ts-node`

2. **Import Issues**:
   - Error message: `Cannot find module './foo' or its corresponding type declarations.`
   - Solution: Use the `.js` extension in imports (e.g., `import { bar } from './foo.js'`) even for TypeScript files

3. **Port Already in Use**:
   - Error message: `Error: listen EADDRINUSE: address already in use :::3001`
   - Solution: Kill any existing processes using port 3001 or change the PORT environment variable

4. **Authentication Errors**:
   - Error message: `{"success":false,"data":[],"error":{"code":"AUTH_ERROR","message":"Invalid JWT token"}}`
   - Solution: Ensure you're passing a valid JWT token in the Authorization header

5. **Database Connection Errors**:
   - Error message: `{"success":false,"data":[],"error":{"code":"SUPABASE_ERROR","message":"Failed to connect to database"}}`
   - Solution: Check your Supabase credentials in .env.local and ensure the database is accessible

## Table of Contents

1. [Introduction](#introduction)
2. [API Architecture](#api-architecture)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Request & Response Format](#request--response-format)
6. [University Module Endpoints](#university-module-endpoints)
7. [Chat Module Endpoints](#chat-module-endpoints)
8. [Schedule Module Endpoints](#schedule-module-endpoints)
9. [Gratuity Module Endpoints](#gratuity-module-endpoints)
10. [Admin Module Endpoints](#admin-module-endpoints)
11. [Usage Examples](#usage-examples)

## Introduction

The E11EVEN Central App API provides a comprehensive set of endpoints that power the application's functionality across different modules. This document serves as the authoritative reference for all API endpoints, their parameters, response formats, and usage examples.

The API follows a route-based architecture organized by functional modules (university, chat, schedule, gratuity, admin), with each endpoint following RESTful principles and consistent response formats.

## API Architecture

### Directory Structure

```
/src/api/
├── index.ts                 # Main entry point
├── types.ts                 # API-specific type definitions
├── supabaseAdmin.ts         # Server-side Supabase client
├── middleware/              # Middleware components
│   ├── auth.ts              # Authentication middleware
│   ├── error-handler.ts     # Error handling middleware
│   └── validation.ts        # Request validation middleware
├── routes/                  # API routes
│   ├── university/          # University module routes
│   ├── chat/                # Chat module routes
│   ├── schedule/            # Schedule module routes
│   ├── gratuity/            # Gratuity module routes
│   ├── admin/               # Admin module routes
│   └── index.ts             # Routes entry point
├── services/                # Service layer  
│   ├── baseDataService.ts   # Base service with common CRUD operations
│   ├── programService.ts    # Program-related operations
│   ├── courseService.ts     # Course-related operations
│   ├── moduleService.ts     # Module-related operations
│   ├── lessonService.ts     # Lesson-related operations
│   └── progressService.ts   # Progress tracking operations
└── utils/                   # Utility functions
    ├── response-formatter.ts # Response formatting utilities
    └── error-utils.ts       # Error handling utilities
```

### Service Layer Implementation

All API routes now use a service layer pattern for database operations. This provides:

1. **Separation of concerns** - Routes handle HTTP requests/responses while services handle data operations
2. **Code reusability** - Service methods can be reused across multiple routes
3. **Consistent error handling** - Centralized error management in the service layer
4. **Testability** - Services can be unit tested independently of the API routes

The service layer integrates with Supabase for database operations and is implemented with TypeScript for type safety.

#### Service Performance Optimizations

Recent optimizations to the service layer include:

1. **Efficient Database Queries** - Replaced multiple separate queries with optimized join queries
2. **Connection Pooling** - Implemented connection pooling for better resource utilization
3. **Caching** - Added strategic caching for frequently accessed data
4. **Asynchronous Processing** - Implemented asynchronous processing for non-blocking operations
5. **Thumbnail Processing** - Added image compression and size limits for improved performance

#### Testing Framework

Services are thoroughly tested using:

1. **Unit Tests** - Testing individual service methods in isolation
2. **Integration Tests** - Testing service interactions with the database
3. **Performance Tests** - Measuring and optimizing service performance

## Authentication

Authentication is implemented using JWT tokens provided by Supabase Auth. All protected routes require a valid JWT token in the Authorization header.

```
Authorization: Bearer <token>
```

### Auth Middleware

The auth middleware (`/src/api/middleware/auth.ts`) validates JWT tokens and adds the user information to the request object. It also provides role-based access control through the `requireRole` middleware.

```typescript
// Example usage in a route
router.get('/protected',
  requireAuth,                         // Requires valid JWT
  requireRole(['admin', 'SuperAdmin']), // Requires specific role(s)
  (req, res) => {
    // Route handler logic
  }
);
```

### Authentication Routes

#### POST /api/auth/login

Authenticate a user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      // Other user properties
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      // Other session properties
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "data": [],
  "error": {
    "message": "Invalid login credentials",
    "code": "AUTHENTICATION_ERROR"
  }
}
```

#### POST /api/auth/dev-login (Development Only)

A development-only endpoint that allows logging in using predefined test accounts.

**Request:**
```json
{
  "username": "test"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "test-user-uuid",
      "email": "test@example.com",
      // Other user properties
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      // Other session properties
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "data": [],
  "error": {
    "message": "Invalid test account. Available accounts: test, admin, daniel",
    "code": "AUTHENTICATION_ERROR"
  }
}
```

**Available Test Accounts:**
- test: test@example.com / password123
- admin: admin@example.com / admin123
- daniel: danielrsolomon@gmail.com / password123

> **Note**: The `/api/auth/dev-login` endpoint is only available in development mode and should never be deployed to production.

# Progress Tracking Endpoints

## Progress Module

The Progress Module API provides endpoints for tracking user progress through university content. This API integrates with the optimized progress tracking services.

### Progress Endpoints

#### GET /api/university/progress/module/:moduleId

Get a user's progress for a specific module.

**Implementation Notes:**
- Uses `progressService.getModuleProgress(userId, moduleId)`
- Returns detailed progress information including status, completion percentage, and attempt count

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "module_id": "uuid",
    "status": "in_progress | completed | failed",
    "completion_percentage": 75,
    "completed_at": "2024-05-20T15:30:00Z",
    "attempts": 1,
    "last_activity_at": "2024-05-20T15:30:00Z",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### POST /api/university/progress/module/:moduleId/complete

Mark a module as completed for the current user.

**Request Body:**
```json
{
  "completion_percentage": 100,
  "time_spent_seconds": 180
}
```

**Implementation Notes:**
- Uses `progressService.completeModule(progressId, progressData)`
- Automatically calculates program progress asynchronously
- Records timestamp and attempts

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "module_id": "uuid",
    "status": "completed",
    "completion_percentage": 100,
    "completed_at": "2024-05-20T15:30:00Z",
    "attempts": 1,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### GET /api/university/progress/program/:programId

Get a user's overall progress for a specific program.

**Implementation Notes:**
- Uses `progressService.getProgramProgress(userId, programId)`
- Returns aggregated program completion data

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "program_id": "uuid",
    "status": "in_progress | completed",
    "completion_percentage": 65,
    "started_at": "2024-05-01T10:00:00Z",
    "completed_at": null,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```