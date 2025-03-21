# Error Handling Guide

## Introduction

Proper error handling is crucial for building a robust and user-friendly application. This guide provides best practices for handling errors consistently across the E11EVEN Central App, covering both frontend and API error handling.

## Error Handling Philosophy

Our error handling follows these principles:

1. **Be informative but secure**: Provide useful error messages to users without exposing sensitive information
2. **Be consistent**: Use the same patterns for error handling across the application
3. **Fail gracefully**: Prevent cascading failures and provide fallback UIs
4. **Log appropriately**: Ensure errors are properly logged for debugging
5. **Handle expected errors**: Anticipate common error scenarios and handle them specifically

## Frontend Error Handling

### Service Layer Error Handling

When using the service layer, all methods return a consistent response format:

```typescript
type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};
```

Always check for errors when calling service methods:

```typescript
const { data, error } = await programService.getAll();

if (error) {
  // Handle error
  console.error('Error fetching programs:', error);
  toast.error(`Failed to load programs: ${error.message}`);
  return;
}

// Process data
console.log('Programs:', data);
```

### Component-Level Error Handling

Components should handle three states: loading, error, and success:

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

### Form Validation Errors

For form validation errors, use Zod with React Hook Form:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const programSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required')
});

// Define type
type ProgramFormValues = z.infer<typeof programSchema>;

function ProgramForm() {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      title: '',
      description: ''
    }
  });
  
  const onSubmit = async (values: ProgramFormValues) => {
    try {
      const { data, error } = await programService.create(values);
      
      if (error) throw new Error(error.message);
      
      // Handle success
      toast.success('Program created successfully!');
      form.reset();
    } catch (err) {
      // Handle error
      toast.error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label>Title</label>
        <input {...form.register('title')} />
        {form.formState.errors.title && (
          <span className="error">{form.formState.errors.title.message}</span>
        )}
      </div>
      
      <div>
        <label>Description</label>
        <textarea {...form.register('description')} />
        {form.formState.errors.description && (
          <span className="error">{form.formState.errors.description.message}</span>
        )}
      </div>
      
      <button type="submit">Create Program</button>
    </form>
  );
}
```

### Global Error Boundary

Use React error boundaries to catch unexpected errors:

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Error Notification System

Use a toast notification system to display errors:

```typescript
import { toast } from 'react-hot-toast';

// Success notification
toast.success('Program created successfully!');

// Error notification
toast.error('Failed to create program');

// Custom notification
toast.custom((t) => (
  <div className={`custom-toast ${t.visible ? 'visible' : ''}`}>
    <div className="icon">⚠️</div>
    <div className="message">
      <h4>Warning</h4>
      <p>You have unsaved changes</p>
    </div>
    <button onClick={() => toast.dismiss(t.id)}>Dismiss</button>
  </div>
));
```

## API Error Handling

### API Error Structure

API errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {} // Optional additional error details
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `SERVER_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `RATE_LIMITED` | 429 | Too many requests |

### Handling Specific Error Types

#### Authentication Errors

```typescript
if (error?.code === 'UNAUTHORIZED' || error?.code === 'INVALID_TOKEN') {
  // Clear auth state
  authService.logout();
  
  // Redirect to login
  router.push('/login?redirect=' + encodeURIComponent(router.asPath));
  return;
}
```

#### Permission Errors

```typescript
if (error?.code === 'FORBIDDEN') {
  toast.error('You do not have permission to perform this action');
  
  // Redirect to appropriate page
  router.push('/dashboard');
  return;
}
```

#### Not Found Errors

```typescript
if (error?.code === 'NOT_FOUND') {
  // Show not found UI
  return <NotFoundPage resource="Program" />;
}
```

#### Validation Errors

```typescript
if (error?.code === 'VALIDATION_ERROR') {
  // Extract validation errors
  const validationErrors = error.details?.errors || [];
  
  // Display validation errors
  validationErrors.forEach(err => {
    toast.error(`${err.field}: ${err.message}`);
  });
  
  return;
}
```

#### Server Errors

```typescript
if (error?.code === 'SERVER_ERROR' || error?.code === 'DATABASE_ERROR') {
  // Log error
  console.error('Server error:', error);
  
  // Show generic error
  toast.error('A server error occurred. Please try again later.');
  
  return;
}
```

#### Rate Limiting

```typescript
if (error?.code === 'RATE_LIMITED') {
  toast.error('Too many requests. Please try again later.');
  
  // Implement exponential backoff
  setTimeout(() => {
    // Retry request
  }, 2000);
  
  return;
}
```

## Error Logging

### Frontend Logging

Use a consistent approach for logging errors:

```typescript
function logError(error: unknown, context?: object) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error('[Error]', {
    message: errorMessage,
    stack: errorStack,
    ...context
  });
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
    // Example: Sentry.captureException(error, { extra: context });
  }
}

// Usage
try {
  // Code that might throw
} catch (error) {
  logError(error, { component: 'ProgramList', action: 'fetchPrograms' });
}
```

### API Logging

API errors are logged consistently through the error handling middleware:

```typescript
// In error-handler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error details
  console.error('[API Error]', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    // Include additional context
    userId: req.user?.id,
    requestId: req.headers['x-request-id']
  });
  
  // Send appropriate response
  // ...
}
```

## Testing Error Handling

### Testing Component Error Handling

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { ProgramList } from './ProgramList';
import { programService } from '../../services/programService';

// Mock the service
jest.mock('../../services/programService');

describe('ProgramList', () => {
  test('displays error message when API call fails', async () => {
    // Setup mock to return error
    (programService.getAll as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch programs', code: 'SERVER_ERROR' }
    });
    
    render(<ProgramList />);
    
    // Verify loading state is shown
    expect(screen.getByText('Loading programs...')).toBeInTheDocument();
    
    // Verify error state is shown
    await waitFor(() => {
      expect(screen.getByText('Error loading programs')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch programs')).toBeInTheDocument();
    });
  });
});
```

### Testing Form Validation

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProgramForm } from './ProgramForm';

describe('ProgramForm', () => {
  test('displays validation errors', async () => {
    render(<ProgramForm />);
    
    // Submit form without values
    fireEvent.click(screen.getByText('Create Program'));
    
    // Verify validation errors are shown
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

1. **Never swallow errors**: Always handle or log errors
2. **Use specific error types**: Use specific error types and codes for different scenarios
3. **Provide user-friendly messages**: Translate technical errors into user-friendly messages
4. **Include fallback UIs**: Always provide fallback UIs for error states
5. **Log with context**: Include relevant context when logging errors
6. **Handle async errors**: Use try/catch or .catch() for async operations
7. **Validate inputs**: Validate inputs early to prevent errors
8. **Test error handling**: Include tests for error cases
9. **Use error boundaries**: Wrap components in error boundaries to prevent UI crashes
10. **Monitor errors**: Set up error monitoring in production

## Common Patterns

### Reusable Error Component

```typescript
function ErrorDisplay({ 
  error, 
  onRetry 
}: { 
  error: Error | null;
  onRetry?: () => void;
}) {
  if (!error) return null;
  
  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <h3>An error occurred</h3>
      <p>{error.message}</p>
      {onRetry && (
        <button onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

// Usage
function ProgramList() {
  const [error, setError] = useState<Error | null>(null);
  
  async function fetchPrograms() {
    try {
      // Fetch data
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }
  
  return (
    <div>
      <ErrorDisplay error={error} onRetry={fetchPrograms} />
      {/* Rest of component */}
    </div>
  );
}
```

### Empty State Component

```typescript
function EmptyState({ 
  title,
  message,
  action
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
      {action && (
        <button onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// Usage
function ProgramList() {
  const { programs, isLoading, error } = usePrograms();
  
  if (programs.length === 0) {
    return (
      <EmptyState
        title="No programs found"
        message="There are no programs available. Create your first program to get started."
        action={{
          label: "Create Program",
          onClick: () => setShowCreateDialog(true)
        }}
      />
    );
  }
  
  return (
    // Render programs
  );
}
```

## Conclusion

Consistent error handling is essential for building a robust and user-friendly application. By following the patterns and best practices outlined in this guide, you'll create a more resilient application that gracefully handles errors and provides a better user experience. 