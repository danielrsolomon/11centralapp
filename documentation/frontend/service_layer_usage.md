# Service Layer Usage Guide

## Introduction

This guide provides developers with practical instructions for using the service layer in the E11EVEN Central App. The service layer architecture replaces direct Supabase calls with a more maintainable and secure approach that channels all data operations through API endpoints.

## Quick Start

### Basic Usage Pattern

To fetch data using the service layer:

```typescript
import { programService } from '../../services/programService';

// In your component or hook
async function fetchProgram(programId: string) {
  try {
    const { data, error } = await programService.getById(programId);
    
    if (error) {
      console.error('Error fetching program:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error:', err);
    return null;
  }
}
```

### Using in React Components

```typescript
import { useState, useEffect } from 'react';
import { programService } from '../../services/programService';
import { Program } from '../../types/database.types';

function ProgramDetail({ programId }: { programId: string }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function loadProgram() {
      setIsLoading(true);
      try {
        const { data, error } = await programService.getById(programId);
        
        if (error) throw new Error(error.message);
        setProgram(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    
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

### Creating Custom Hooks

For reusable data fetching, create custom hooks:

```typescript
import { useState, useEffect } from 'react';
import { programService } from '../../services/programService';
import { Program } from '../../types/database.types';

export function useProgram(programId: string | undefined) {
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!programId) {
      setProgram(null);
      setIsLoading(false);
      return;
    }
    
    async function loadProgram() {
      setIsLoading(true);
      try {
        const { data, error } = await programService.getById(programId);
        
        if (error) throw new Error(error.message);
        setProgram(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProgram();
  }, [programId]);
  
  return { program, isLoading, error };
}
```

Then use it in your components:

```typescript
function ProgramDetail({ programId }: { programId: string }) {
  const { program, isLoading, error } = useProgram(programId);
  
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

## Available Services

Here are the main services available in the application:

| Service | Purpose | Base Path |
|---------|---------|-----------|
| `programService` | Managing programs | `/university/programs` |
| `courseService` | Managing courses | `/university/courses` |
| `lessonService` | Managing lessons | `/university/lessons` |
| `moduleService` | Managing modules | `/university/modules` |
| `storageService` | File uploads and storage | N/A |

## Common Operations

### Fetching a List of Items

```typescript
// Get all programs
const { data: programs, error } = await programService.getAll();

// Get programs with filtering and sorting
const { data: programs, error } = await programService.getAll({
  filters: { is_published: true },
  orderBy: { column: 'created_at', ascending: false },
  limit: 10
});

// Get programs by department
const { data: programs, error } = await programService.getProgramsByDepartment(departmentId);
```

### Fetching a Single Item

```typescript
const { data: program, error } = await programService.getById(programId);
```

### Creating an Item

```typescript
const newProgram = {
  title: 'New Program',
  description: 'Program description',
  department_id: departmentId,
  required_roles: ['Staff'],
  is_published: false
};

const { data: createdProgram, error } = await programService.create(newProgram);
```

### Updating an Item

```typescript
const updates = {
  title: 'Updated Program Title',
  description: 'Updated description'
};

const { data: updatedProgram, error } = await programService.update(programId, updates);
```

### Deleting an Item

```typescript
const { data, error } = await programService.delete(programId);
```

### File Uploads

```typescript
// Upload a file
const { url, error } = await storageService.uploadFile(
  'media', // bucket name
  `thumbnails/${file.name}`, // path within bucket
  file // File object
);

// Get public URL for a file
const publicUrl = storageService.getPublicUrl('media', 'thumbnails/image.jpg');
```

## Form Handling

### Creating a Form

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { programService } from '../../services/programService';

// Define schema
const programSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  is_published: z.boolean().default(false)
});

// Define type
type ProgramFormValues = z.infer<typeof programSchema>;

function ProgramForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      title: '',
      description: '',
      is_published: false
    }
  });
  
  const onSubmit = async (values: ProgramFormValues) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await programService.create(values);
      
      if (error) throw new Error(error.message);
      
      // Handle success
      alert('Program created successfully!');
      form.reset();
    } catch (err) {
      // Handle error
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label>Title</label>
        <input {...form.register('title')} />
        {form.formState.errors.title && (
          <span>{form.formState.errors.title.message}</span>
        )}
      </div>
      
      <div>
        <label>Description</label>
        <textarea {...form.register('description')} />
        {form.formState.errors.description && (
          <span>{form.formState.errors.description.message}</span>
        )}
      </div>
      
      <div>
        <label>
          <input type="checkbox" {...form.register('is_published')} />
          Publish immediately
        </label>
      </div>
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Program'}
      </button>
    </form>
  );
}
```

### Editing a Form

```typescript
function ProgramEditForm({ programId }: { programId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { program, isLoading, error } = useProgram(programId);
  
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      title: '',
      description: '',
      is_published: false
    }
  });
  
  // Set form values when program data is loaded
  useEffect(() => {
    if (program) {
      form.reset({
        title: program.title,
        description: program.description,
        is_published: program.is_published
      });
    }
  }, [program, form]);
  
  const onSubmit = async (values: ProgramFormValues) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await programService.update(programId, values);
      
      if (error) throw new Error(error.message);
      
      // Handle success
      alert('Program updated successfully!');
    } catch (err) {
      // Handle error
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!program) return <div>Program not found</div>;
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields same as above */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

## Error Handling

### Standard Error Handling Pattern

```typescript
try {
  const { data, error } = await programService.getById(programId);
  
  if (error) {
    // Handle service-level error
    console.error('Service error:', error.message);
    // Show error to user or take appropriate action
    return;
  }
  
  // Process data
  console.log('Program data:', data);
} catch (err) {
  // Handle unexpected errors
  console.error('Unexpected error:', err);
  // Show generic error to user
}
```

### Error Handling in Components

```typescript
function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchPrograms() {
      setIsLoading(true);
      try {
        const { data, error } = await programService.getAll();
        
        if (error) throw new Error(error.message);
        setPrograms(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPrograms();
  }, []);
  
  if (isLoading) return <div>Loading programs...</div>;
  
  if (error) return (
    <div className="error-container">
      <h3>Error loading programs</h3>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>Try Again</button>
    </div>
  );
  
  return (
    <div>
      <h2>Programs</h2>
      {programs.length === 0 ? (
        <p>No programs found.</p>
      ) : (
        <ul>
          {programs.map(program => (
            <li key={program.id}>{program.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Creating New Service Methods

If you need functionality not provided by the existing service methods, extend the service with new methods:

```typescript
// In src/services/programService.ts
async getProgramsWithCompletionStatus(userId: string): Promise<{
  data: (Program & { completion_status: string })[] | null;
  error: PostgrestError | null;
}> {
  try {
    const response = await api.get(`/university/users/${userId}/programs/status`);
    
    if (!response.success) {
      return {
        data: null,
        error: {
          message: response.error?.message || 'Failed to fetch programs with status',
          details: response.error?.details || '',
          hint: '',
          code: response.error?.code || 'UNKNOWN_ERROR',
          name: 'PostgrestError',
        },
      };
    }
    
    return {
      data: response.data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: 'Failed to fetch programs with status',
        details: error instanceof Error ? error.message : String(error),
        hint: '',
        code: 'UNKNOWN_ERROR',
        name: 'PostgrestError',
      },
    };
  }
}
```

## Testing Services

### Mock the API in Tests

```typescript
// In your test file
import { programService } from '../../services/programService';
import api from '../../services/apiService';

// Mock the API module
jest.mock('../../services/apiService');

describe('programService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
  });
  
  test('getById should return program data', async () => {
    // Setup mock response
    const mockProgram = { id: '123', title: 'Test Program' };
    (api.get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockProgram
    });
    
    // Call the service method
    const result = await programService.getById('123');
    
    // Assertions
    expect(api.get).toHaveBeenCalledWith('/university/programs/123');
    expect(result.data).toEqual(mockProgram);
    expect(result.error).toBeNull();
  });
  
  test('getById should handle errors', async () => {
    // Setup mock error response
    (api.get as jest.Mock).mockResolvedValue({
      success: false,
      error: {
        message: 'Program not found',
        code: 'NOT_FOUND'
      }
    });
    
    // Call the service method
    const result = await programService.getById('123');
    
    // Assertions
    expect(api.get).toHaveBeenCalledWith('/university/programs/123');
    expect(result.data).toBeNull();
    expect(result.error).toHaveProperty('message', 'Program not found');
  });
});
```

## Best Practices

1. **Always use the service layer** instead of direct API or Supabase calls
2. **Handle loading states, data, and errors** consistently in components
3. **Create custom hooks** for reusable data fetching logic
4. **Use TypeScript types** for all data structures and API responses
5. **Implement proper error handling** to provide useful feedback to users
6. **Compose related operations** to minimize the number of API calls
7. **Cache data** where appropriate to improve performance
8. **Test service methods** thoroughly to ensure reliable data access

## Troubleshooting

### Common Errors

1. **"Network Error"**:
   - Check your internet connection
   - Verify that the API server is running
   - Check for CORS issues in the browser console

2. **"Authentication Required"**:
   - User session may have expired, redirect to login

3. **"Not Found"**:
   - Verify that the ID or resource path is correct
   - Check if the resource has been deleted

4. **"Validation Error"**:
   - Check the request data against the expected schema
   - Look for missing required fields or invalid data types

### Debugging Tips

1. Log API requests and responses:
   ```typescript
   console.log('Request:', endpoint, options);
   console.log('Response:', response);
   ```

2. Use the browser's network tab to inspect API calls

3. Check for TypeScript errors related to service method calls

## Conclusion

The service layer architecture provides a clean, consistent way to interact with the backend API. By following the patterns and practices in this guide, you'll create more maintainable, testable, and secure code.

If you have questions or need help with the service layer, please reach out to the development team. 