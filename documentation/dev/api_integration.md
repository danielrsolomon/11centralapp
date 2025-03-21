# API Integration Guide

## Introduction

This guide explains how to integrate with the E11EVEN Central App's API using the service layer architecture. It provides best practices, code examples, and strategies for handling common scenarios when working with the API.

## Service Layer Architecture Overview

The E11EVEN Central App uses a service layer architecture to abstract API calls from UI components. This approach provides several benefits:

1. **Separation of concerns**: UI components focus on presentation, services handle data access
2. **Reusability**: Services can be used by multiple components
3. **Testability**: Components can be tested with mocked services
4. **Consistency**: All data access follows the same patterns
5. **Maintainability**: Changes to the API only affect the service layer

The architecture consists of these key components:

- **API Routes**: Server-side endpoints in `/src/api/routes/`
- **API Service**: A central service for making HTTP requests (`apiService.ts`)
- **Domain Services**: Specialized services for each domain (`programService.ts`, etc.)
- **UI Components**: React components that use services to fetch and display data

## Key Service Files

The service layer includes these important files:

- **apiService.ts**: Central service for making HTTP requests
- **baseDataService.ts**: Base class with common CRUD operations
- **Domain-specific services**:
  - `programService.ts`
  - `courseService.ts`
  - `lessonService.ts`
  - `moduleService.ts`
  - `chatService.ts`
  - `scheduleService.ts`
  - `gratuityService.ts`
  - `userService.ts`
  - `authService.ts`
  - `storageService.ts`

## Using the Service Layer

### Basic Usage

To fetch data using the service layer:

```typescript
import { programService } from '../services/programService';

// In your component
const fetchProgram = async (programId: string) => {
  try {
    const { data, error } = await programService.getById(programId);
    
    if (error) {
      console.error('Error fetching program:', error);
      // Handle the error
      return;
    }
    
    // Process the data
    console.log('Program data:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
    // Handle unexpected errors
  }
};
```

### In React Components

```typescript
import { useState, useEffect } from 'react';
import { programService } from '../services/programService';
import { Program } from '../types/database.types';

function ProgramDetail({ programId }: { programId: string }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const loadProgram = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await programService.getById(programId);
        
        if (error) {
          throw new Error(error.message);
        }
        
        setProgram(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProgram();
  }, [programId]);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!program) return <div>Program not found</div>;
  
  return (
    <div>
      <h1>{program.title}</h1>
      <p>{program.description}</p>
      {/* Rest of your component */}
    </div>
  );
}
```

### Custom Hooks for Data Fetching

For reusable data fetching, create custom hooks:

```typescript
import { useState, useEffect } from 'react';
import { programService } from '../services/programService';
import { Program } from '../types/database.types';

```typescript
// Filter by published status
const { data } = await programService.getAll({
  filters: { is_published: true }
});

// Sort by created date (descending)
const { data } = await programService.getAll({
  orderBy: { column: 'created_at', ascending: false }
});

// Pagination
const { data } = await programService.getAll({
  page: 1,
  limit: 10
});

// Combining options
const { data } = await programService.getAll({
  filters: { is_published: true },
  orderBy: { column: 'created_at', ascending: false },
  page: 1,
  limit: 10
});
```

### Batch Operations

Some endpoints support batch operations:

```typescript
// Update multiple programs
const { data, error } = await programService.updateBatch([
  { id: '123', title: 'Updated Program 1' },
  { id: '456', title: 'Updated Program 2' }
]);

// Delete multiple programs
const { data, error } = await programService.deleteBatch(['123', '456']);
```

## Advanced Usage

### Concurrent Requests

For concurrent requests, use Promise.all:

```typescript
const [programsResponse, coursesResponse] = await Promise.all([
  programService.getAll(),
  courseService.getAll({ filters: { program_id: programId } })
]);

const programs = programsResponse.data || [];
const courses = coursesResponse.data || [];
```

### Request Cancellation

For requests that might be canceled (e.g., when a component unmounts), use AbortController:

```typescript
function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    async function fetchPrograms() {
      try {
        const { data, error } = await programService.getAll({
          signal: abortController.signal
        });
        
        if (error) throw new Error(error.message);
        setPrograms(data || []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching programs:', err);
        }
      }
    }
    
    fetchPrograms();
    
    return () => {
      abortController.abort();
    };
  }, []);
  
  // Render component
}
```

## Custom API Requests

For cases where the service layer doesn't provide the exact functionality needed, you can use the apiService directly:

```typescript
import { api } from '../../services/apiService';

// Custom API request
const response = await api.get('/custom-endpoint', {
  params: { someParam: 'value' }
});

// Custom POST request
const response = await api.post('/custom-endpoint', {
  someData: 'value'
});
```

## WebSocket Integration

For real-time features, connect to the Supabase real-time API through the service layer:

```typescript
import { realtimeService } from '../../services/realtimeService';

// Subscribe to changes
const subscription = realtimeService.subscribe(
  'programs',
  (payload) => {
    console.log('Program changed:', payload);
    // Update state with the new data
  }
);

// Clean up subscription when component unmounts
useEffect(() => {
  return () => {
    realtimeService.unsubscribe(subscription);
  };
}, [subscription]);
```

## API Response Caching

For frequently accessed data that doesn't change often, implement caching:

```typescript
// In your service
async getProgramsWithCaching(): Promise<{ data: Program[] | null; error: PostgrestError | null }> {
  // Check cache first
  const cachedData = sessionStorage.getItem('programs');
  if (cachedData) {
    return { data: JSON.parse(cachedData), error: null };
  }
  
  // Fetch from API if not cached
  const { data, error } = await this.getAll();
  
  // Store in cache if successful
  if (data && !error) {
    sessionStorage.setItem('programs', JSON.stringify(data));
  }
  
  return { data, error };
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. If you receive a 429 Too Many Requests response, you should back off and retry after a delay:

```typescript
async function fetchWithRetry(fn, maxRetries = 3, delay = 1000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fn();
      
      if (response.error?.code === 'RATE_LIMITED') {
        retries++;
        console.log(`Rate limited, retrying in ${delay}ms (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  throw new Error('Max retries reached');
}

// Usage
const response = await fetchWithRetry(() => programService.getAll());
```

## Best Practices

1. **Use the service layer**: Always use the appropriate service instead of making direct API calls
2. **Handle errors gracefully**: Provide user-friendly error messages and fallback UIs
3. **Implement loading states**: Show loading indicators while data is being fetched
4. **Optimize requests**: Batch related requests and implement caching where appropriate
5. **Implement retry logic**: For critical operations, implement retry logic with exponential backoff
6. **Use TypeScript types**: Define proper types for all API requests and responses
7. **Test API integration**: Write tests that mock API responses to verify your integration

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: The authentication token is missing or invalid
   - Check if the user is logged in
   - Verify that the token is being included in the request
   - The token may have expired; redirect to login

2. **403 Forbidden**: The user doesn't have permission
   - Check the user's roles
   - Verify that the required roles are correctly set for the endpoint

3. **404 Not Found**: The resource doesn't exist
   - Check the ID or path
   - Verify that the resource hasn't been deleted

4. **422 Validation Error**: The request data is invalid
   - Check the request payload against the expected schema
   - Look for missing or invalid fields

### Debugging Tools

1. **Browser DevTools**: Use the Network tab to inspect API requests and responses
2. **Logging**: Add temporary logging to debug API calls
3. **API Documentation**: Refer to the API documentation for endpoint details

## API Versioning

The API uses versioning to ensure backward compatibility. The current version is v1, which is the default:

```typescript
// Specify a version (if needed)
const response = await api.get('/v2/some-endpoint');
```

## Conclusion

Properly integrating with the E11EVEN Central API through the service layer ensures a maintainable, secure, and consistent approach to data access. By following the patterns and best practices outlined in this guide, you'll create robust frontend components that handle data fetching, error states, and user feedback effectively. 