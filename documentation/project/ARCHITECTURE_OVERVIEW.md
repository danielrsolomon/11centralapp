# E11EVEN Central App Architecture Overview

<!-- 
  This document provides a comprehensive overview of the E11EVEN Central App architecture.
  It consolidates information from multiple architecture-related documents.
  
  Last Updated: 2024-03-17
-->

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Service Layer](#service-layer)
6. [API Routes Layer](#api-routes-layer)
7. [Middleware](#middleware)
8. [Database Architecture](#database-architecture)
9. [Authentication & Authorization](#authentication--authorization)
10. [Legacy Components](#legacy-components)
11. [Future Architecture Evolution](#future-architecture-evolution)

## Introduction

The E11EVEN Central App is a comprehensive workforce management platform that integrates multiple modules including University LMS, Chat, Schedule, Gratuity tracking, and Admin functionality. The application is built using modern web technologies and follows a service-based architecture pattern.

This document provides a comprehensive overview of the application's architecture, explaining how the different layers interact and how data flows through the system.

## System Architecture

### High-Level Architecture

The E11EVEN Central App follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                      │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────┐    │
│  │ University│ │  Chat     │ │ Schedule  │ │ Gratuity/Admin │    │
│  └──────────┘ └───────────┘ └───────────┘ └────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        Service Layer                             │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────┐    │
│  │University│ │  Chat     │ │ Schedule  │ │ Gratuity/Admin │    │
│  │ Services │ │ Services  │ │ Services  │ │   Services     │    │
│  └──────────┘ └───────────┘ └───────────┘ └────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        API Routes Layer                          │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────┐    │
│  │University│ │  Chat     │ │ Schedule  │ │ Gratuity/Admin │    │
│  │  Routes  │ │  Routes   │ │  Routes   │ │    Routes      │    │
│  └──────────┘ └───────────┘ └───────────┘ └────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        Database Layer                            │
│                     (Supabase PostgreSQL)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**: Each layer has a distinct responsibility
2. **Service-Oriented Architecture**: Business logic is encapsulated in services
3. **Route-Based API Structure**: API endpoints are organized by domain
4. **Type Safety**: TypeScript is used throughout the application
5. **Consistent Error Handling**: Standardized error handling patterns
6. **Responsive Design**: UI adapts to different screen sizes
7. **Security First**: Authentication, authorization, and data validation at multiple layers

## Frontend Architecture

### Component Structure

The frontend is built using React with TypeScript and follows a feature-based organization:

```
/src/
├── components/
│   ├── ui/                 # Reusable UI components (buttons, inputs, etc.)
│   ├── university/         # University module components
│   ├── chat/               # Chat module components
│   ├── schedule/           # Schedule module components
│   ├── gratuity/           # Gratuity module components
│   └── admin/              # Admin module components
├── hooks/                  # Custom React hooks
├── services/               # Service layer for data access
├── pages/                  # Route components
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
└── ...
```

### Routing Structure

The application uses React Router 6 for client-side routing with a route-based architecture:

```typescript
// Example routing configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "university",
        children: [
          { index: true, element: <UniversityDashboard /> },
          { path: "programs", element: <Programs /> },
          { path: "programs/:id", element: <ProgramDetail /> },
          // ...more university routes
        ]
      },
      {
        path: "chat",
        children: [
          { index: true, element: <ChatDashboard /> },
          { path: "rooms/:id", element: <ChatRoom /> },
          // ...more chat routes
        ]
      },
      // ...more module routes
    ]
  },
  {
    path: "/auth",
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <ForgotPassword /> }
    ]
  }
]);
```

### State Management

The application uses a combination of React's built-in state management (useState, useContext) and custom hooks for managing state. Each module has its own context providers as needed.

## Service Layer

The service layer abstracts data access and business logic from the API routes. This separation of concerns improves maintainability, testability, and code reuse.

### Service Layer Benefits

1. **Abstraction of Data Operations**: All database interactions are performed through service methods, isolating database-specific code.
2. **Business Logic Centralization**: Complex operations are contained within services rather than scattered across route handlers.
3. **Improved Testability**: Services can be unit tested independently from API routes.
4. **Consistent Error Handling**: All services implement standardized error handling patterns.
5. **Type Safety**: TypeScript interfaces enforce data consistency throughout the application.

### Service Layer Directory Structure

```
/src/services/
├── apiService.ts           # Central service for making API requests
├── baseDataService.ts      # Common CRUD operations
├── authService.ts          # Authentication operations
├── storageService.ts       # File uploads and storage
├── programService.ts       # Program operations
├── courseService.ts        # Course operations
├── moduleService.ts        # Module operations
├── lessonService.ts        # Lesson operations
├── progressService.ts      # Progress tracking operations
├── chatService.ts          # Chat operations
├── departmentService.ts    # Department operations
├── userService.ts          # User operations
├── adminService.ts         # Admin operations
└── supabase.ts             # Supabase client (for auth only)
```

### Service Implementation Pattern

All services follow a consistent implementation pattern:

1. **Inheritance from BaseDataService**: Provides common CRUD operations
2. **Strong Typing**: TypeScript interfaces for input/output
3. **Schema Validation**: Zod schemas for validating inputs
4. **Error Handling**: Consistent error wrapping and reporting
5. **Async/Await**: All database operations are async
6. **Performance Optimization**: Efficient queries with proper indexes

#### Example: Recent Updates to Service Layer

Recent updates to the service layer include:

1. **Optimized Database Queries**: Services now use more efficient join queries instead of multiple separate queries
2. **Enhanced Error Handling**: More detailed error reporting with specific error codes
3. **Performance Monitoring**: Services now include detailed performance logging
4. **Thumbnail Processing**: Improved handling of file uploads, including compression and validation
5. **Progress Calculation**: Optimized program progress calculation with better caching

### BaseDataService Pattern

The `BaseDataService` is an abstract class that provides common CRUD operations that other services inherit:

```typescript
export class BaseDataService<T> {
  constructor(protected readonly resource: string) {}

  async getAll(): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      const response = await api.get<T[]>(`/${this.resource}`);
      
      if (!response.success) {
        return {
          data: null,
          error: new Error(response.error?.message || 'Failed to fetch data')
        };
      }
      
      return {
        data: response.data,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  // Additional CRUD methods: getById, create, update, delete, etc.
}
```

### Service-specific Implementations

Domain-specific services extend BaseDataService and add specialized methods:

```typescript
// Example: Updated programService.ts with optimized thumbnail handling
class ProgramService extends BaseDataService<Program> {
  constructor() {
    super('university/programs');
  }

  async createProgramWithThumbnail(
    programData: CreateProgramInput,
    thumbnailFile: File
  ): Promise<{ data: Program | null; error: Error | null; success: boolean }> {
    try {
      // Step 1: Upload thumbnail and get URL
      const { data: uploadData, error: uploadError } = await this.uploadProgramThumbnail(
        thumbnailFile
      );
      
      if (uploadError || !uploadData?.url) {
        return {
          data: null,
          error: uploadError || new Error('Failed to upload thumbnail'),
          success: false
        };
      }
      
      // Step 2: Create program with thumbnail URL
      const { data, error } = await this.createProgram({
        ...programData,
        thumbnail_url: uploadData.url
      });
      
      return {
        data,
        error,
        success: !error && !!data
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
        success: false
      };
    }
  }

  // Other specialized methods
}
```

### Recent Performance Optimizations

Services now implement several performance optimizations:

1. **Query Optimization**: Using proper indexes and join queries
2. **Connection Pooling**: Reusing database connections
3. **Caching**: Implementing strategic caching for frequently accessed data
4. **Batched Operations**: Using batch operations for related data
5. **Compression**: Applying compression for large files and images

### Error Handling Pattern

Services implement a consistent error handling pattern:

```typescript
try {
  // Service operation
} catch (error) {
  logger.error('Operation failed', {
    service: 'ProgramService',
    method: 'getPrograms',
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString()
  });
  
  return {
    data: null,
    error: error instanceof Error 
      ? error 
      : new Error('An unexpected error occurred'),
    success: false
  };
}
```

## API Routes Layer

The API routes layer provides endpoints for data access and manipulation. It's organized by functional modules with a clear route hierarchy.

### API Directory Structure

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
│   │   ├── programs.ts      # Program routes
│   │   ├── courses.ts       # Course routes
│   │   ├── modules.ts       # Module routes
│   │   ├── lessons.ts       # Lesson routes
│   │   ├── progress.ts      # Progress tracking routes
│   │   └── index.ts         # Module entry point
│   ├── chat/                # Chat module routes
│   ├── schedule/            # Schedule module routes
│   ├── gratuity/            # Gratuity module routes
│   ├── admin/               # Admin module routes
│   └── index.ts             # Routes entry point
└── utils/                   # Utility functions
    ├── response-formatter.ts # Response formatting utilities
    └── error-utils.ts       # Error handling utilities
```

### Route Implementation Pattern

Each route module follows a consistent implementation pattern:

```typescript
// Example: src/api/routes/university/programs.ts
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../../api/supabaseAdmin';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { throwApiError } from '../../middleware/error-handler';
import { authAsyncHandler } from '../../middleware/express-utils';

const router = Router();

// Define validation schema for create/update operations
const programSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  status: z.enum(['draft', 'published']),
  departmentIds: z.array(z.string().uuid()).optional(),
});

/**
 * @route GET /api/university/programs
 * @desc Get all programs
 * @access Public (with RLS for unpublished)
 */
router.get('/', authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Implementation
  // ...
}));

/**
 * @route GET /api/university/programs/:id
 * @desc Get program by ID
 * @access Public (with RLS for unpublished)
 */
router.get('/:id', authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Implementation
  // ...
}));

/**
 * @route POST /api/university/programs
 * @desc Create a new program
 * @access Private (admin, training manager)
 */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'training_manager']),
  authAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Implementation with validation
    // ...
  })
);

// Additional routes for update, delete, etc.

export default router;
```

## Middleware

The application uses several middleware components to handle common concerns across API routes.

### Authentication Middleware

```typescript
// src/api/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';

// Extended request type with user information
export interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check user roles
export const requireRole = (roles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      // Get user roles from database
      const { data: userRoles, error } = await supabaseAdmin
        .from('user_roles')
        .select('role_name')
        .eq('user_id', req.user.id);
      
      if (error) throw error;
      
      // Check if user has required role
      const hasRole = userRoles.some(ur => 
        roles.includes(ur.role_name)
      );
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
```

### Error Handling Middleware

```typescript
// src/api/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

// Custom API error class
export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  
  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Function to throw API errors
export const throwApiError = (
  message: string,
  code: string = 'INTERNAL_ERROR',
  statusCode: number = 500,
  details?: any
) => {
  throw new ApiError(message, code, statusCode, details);
};

// Error handling middleware
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', error);
  
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }
  
  // Handle other errors
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  });
};
```

### Validation Middleware

The application uses Zod for request validation:

```typescript
// src/api/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { throwApiError } from './error-handler';

export const validateRequest = (schema: ZodSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req[property]);
      
      if (!result.success) {
        throwApiError(
          'Validation error',
          'VALIDATION_ERROR',
          400,
          result.error.issues
        );
      }
      
      // Replace request data with validated data
      req[property] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};
```

## Database Architecture

The application uses Supabase PostgreSQL for data storage with the following key principles:

1. **Row Level Security (RLS)**: Controls access to data at the row level
2. **Relational Structure**: Tables are related using foreign keys
3. **Consistent Naming**: Tables and columns follow consistent naming conventions
4. **Indexing**: Appropriate indexes for performance optimization
5. **Versioning**: Database migrations for schema changes

### Key Database Tables

```
# Authentication and Users
- auth.users (managed by Supabase Auth)
- public.profiles
- public.roles
- public.user_roles

# University Module
- public.programs
- public.courses
- public.modules
- public.lessons
- public.progress

# Chat Module
- public.chat_rooms
- public.chat_messages
- public.chat_participants

# Schedule Module
- public.appointments
- public.availability
- public.services

# Gratuity Module
- public.tips
- public.payments
- public.distribution
```

## Authentication & Authorization

The application uses Supabase Auth for authentication with custom role-based authorization:

1. **Authentication**: JWT token-based authentication through Supabase Auth
2. **Authorization**: Role-based access control with middleware checks
3. **Row Level Security**: Database-level access control

### Authentication Flow

1. User signs in with email/password or social provider
2. Supabase Auth issues a JWT token
3. Frontend stores token and includes it in API requests
4. API middleware verifies token and extracts user information
5. API routes check user roles for authorization

## Legacy Components

While most of the application has been refactored to use the service layer pattern, a few legacy components still use direct Supabase calls:

### 1. MinimalProgramDialog.tsx

This component provides a specialized dialog for creating programs with minimal UI flickering. It directly uses Supabase for database operations and file uploads.

**Current Implementation (excerpt):**
```typescript
// In MinimalProgramDialog.tsx
import { supabase } from '../../services/supabase';

// File upload implementation
const handleThumbnailUpload = async (file: File) => {
  try {
    // Direct Supabase storage access
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(`${THUMBNAIL_FOLDER}/${uuidv4()}.${file.name.split('.').pop()}`, file);
      
    if (error) throw error;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(data.path);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return null;
  }
};

// Program creation implementation
const createProgram = async (programData) => {
  try {
    // Direct Supabase database access
    const { data, error } = await supabase
      .from('programs')
      .insert([programData])
      .select()
      .single();
      
    if (error) throw error;
    
    // Associate with departments
    if (selectedDepartments.length > 0) {
      const programDepartments = selectedDepartments.map(deptId => ({
        program_id: data.id,
        department_id: deptId
      }));
      
      const { error: deptError } = await supabase
        .from('program_departments')
        .insert(programDepartments);
        
      if (deptError) console.error('Error associating departments:', deptError);
    }
    
    return data;
  } catch (error) {
    console.error('Error creating program:', error);
    return null;
  }
};
```

**Planned Refactoring:**
- Replace direct Supabase storage calls with storageService
- Replace direct database operations with programService
- Maintain the same UI and user experience

### 2. ContentTree.tsx

This component uses direct Supabase RPC calls for specialized database operations.

**Current Implementation (excerpt):**
```typescript
// In ContentTree.tsx
import { supabase } from '../../services/supabase';

// Reorder items implementation
const reorderItems = async (items: TreeItem[], type: ContentItemType) => {
  try {
    // Generate order updates
    const updates = items.map((item, index) => ({
      id: item.id,
      order: index + 1
    }));
    
    // Direct Supabase RPC call
    const { error } = await supabase.rpc('execute_sql', {
      query: `UPDATE ${type}s SET "order" = CASE id 
        ${updates.map(u => `WHEN '${u.id}' THEN ${u.order}`).join(' ')} 
        ELSE "order" END 
        WHERE id IN (${updates.map(u => `'${u.id}'`).join(',')})`
    });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error reordering ${type}s:`, error);
    return false;
  }
};
```

**Planned Refactoring:**
- Create an API endpoint for reordering items
- Create a service method to call the API endpoint
- Replace direct RPC call with service method

## Future Architecture Evolution

The application architecture will continue to evolve with the following goals:

1. **Complete API Migration**: Move all remaining direct Supabase calls to the API layer
2. **Microservices Consideration**: Evaluate splitting the API into microservices for larger scale
3. **State Management Enhancement**: Consider Redux or React Query for more complex state
4. **Performance Optimization**: Implement caching and optimize data fetching
5. **Mobile Support**: Enhance responsive design and consider native mobile options

### Next Steps

1. **Refactor Legacy Components**: Convert remaining components to use the service layer
2. **Enhance Testing**: Increase test coverage for services and API routes
3. **Documentation**: Keep documentation updated as the architecture evolves
4. **Performance Monitoring**: Implement monitoring and analytics
5. **Security Audits**: Regular security audits and improvements 