# Supabase Error Handling System

## Overview

This document describes the error handling system for Supabase API calls in the E11EVEN Central Platform application. The system is designed to:

- Provide consistent error handling across the application
- Present user-friendly error messages
- Enable graceful degradation when errors occur
- Support retry mechanisms for transient errors
- Log errors appropriately for debugging

## Core Components

### 1. Error Handling Utility (`lib/error-handling.ts`)

The core utility that provides:

- Error categorization (authentication, authorization, connection, etc.)
- Severity determination (info, warning, error, critical)
- User-friendly message generation
- Standardized error formatting
- Retry mechanism with exponential backoff
- Automatic logging

### 2. UI Components (`components/ui/error-display.tsx`)

Reusable components to display errors:

- `ErrorMessage`: Inline error message for forms and content areas
- `ErrorState`: Larger error state for pages or empty states
- `AsyncStateWrapper`: Wrapper for handling loading, error, and empty states
- `ErrorBoundary`: React error boundary for catching rendering errors

### 3. React Hooks (`lib/hooks/useSupabaseQuery.ts`)

Custom hooks that integrate with the error handling system:

- `useSupabaseQuery`: For data fetching operations
- `useSupabaseMutation`: For data modification operations

### 4. Toast Provider (`components/ui/toast-provider.tsx`)

Toast notification provider for displaying non-blocking error messages.

## How to Use

### Basic Error Handling

Wrap any Supabase API call with the `withErrorHandling` function:

```typescript
import { withErrorHandling } from '@/lib/error-handling';

// In an async function
const { data, error } = await withErrorHandling(
  () => supabase.from('users').select('*'),
  'fetchUsers', // Context for logging
  true // Show toast notification
);

if (error) {
  // Handle error - error is now a FormattedError with user-friendly message
  console.log(error.message); // User-friendly message
  console.log(error.category); // Error category
} else {
  // Use data
}
```

### Using React Hooks

For React components, use the provided hooks:

```typescript
import { useSupabaseQuery, useSupabaseMutation } from '@/lib/hooks/useSupabaseQuery';

// In a component
function UserProfile({ userId }) {
  // Query with error handling
  const { data: user, error, loading, refetch } = useSupabaseQuery(
    () => supabase.from('users').select('*').eq('id', userId),
    {
      context: 'fetchUserProfile',
      retry: true,
      maxRetries: 3,
      onSuccess: (data) => {
        // Handle success
      }
    }
  );

  // Mutation with error handling
  const { mutate: updateUser, error: updateError, loading: updateLoading } = useSupabaseMutation(
    (newData) => supabase.from('users').update(newData).eq('id', userId),
    { context: 'updateUserProfile' }
  );

  // Example usage
  const handleUpdate = () => {
    updateUser({ name: 'New Name' });
  };

  // Show error in UI
  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  // Or use the AsyncStateWrapper
  return (
    <AsyncStateWrapper data={user} error={error} loading={loading} onRetry={refetch}>
      {(userData) => (
        <div>
          <h1>{userData.name}</h1>
          {/* ... */}
        </div>
      )}
    </AsyncStateWrapper>
  );
}
```

### Adding Toast Notifications

The error handling system automatically shows toast notifications for errors. Make sure the `ToastProvider` is included in your application:

```tsx
// In a layout component
import { ToastProvider } from '@/components/ui/toast-provider';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}
```

### Using the Error Boundary

For catching rendering errors:

```tsx
import { ErrorBoundary } from '@/components/ui/error-display';

function MyPage() {
  return (
    <ErrorBoundary 
      fallback={<p>Something went wrong</p>}
      onError={(error) => logErrorToService(error)}
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Error Categories

The system categorizes errors into the following types:

- `AUTHENTICATION`: Auth-related errors (JWT expired, invalid token)
- `AUTHORIZATION`: Permission errors (forbidden, not allowed)
- `CONNECTION`: Network or connectivity issues
- `VALIDATION`: Data validation failures
- `NOT_FOUND`: Resource not found errors
- `SERVER`: Server-side errors
- `UNKNOWN`: Uncategorized errors

## Severity Levels

Errors are assigned severity levels:

- `INFO`: User can continue without action
- `WARNING`: User should take action soon
- `ERROR`: User needs to take action now
- `CRITICAL`: User cannot continue

## Best Practices

1. **Always use the provided error handling utilities** rather than handling Supabase errors directly.

2. **Prefer hooks over direct API calls** in React components for consistent error handling.

3. **Use appropriate error display components** based on context:
   - `ErrorMessage` for inline errors (forms, etc.)
   - `ErrorState` for page-level errors
   - `AsyncStateWrapper` for loading/error/data states

4. **Include retry mechanisms** for operations that might fail due to transient issues.

5. **Provide context** when calling error handling functions to make logs more useful.

6. **Customize error messages** for specific operations where appropriate.

## Example Implementation

See the `components/examples/error-handling-example.tsx` component for a complete example implementation that demonstrates different error handling scenarios.

## Troubleshooting

### Common Issues

1. **Toast notifications not appearing**
   - Ensure `ToastProvider` is included in your application layout

2. **Custom error messages not displaying**
   - Check that error categorization correctly identifies the error type

3. **Errors not being caught**
   - Verify you're using `withErrorHandling` or the provided hooks

### Debugging

The error handling system logs all errors with context and severity. Check your browser console or server logs for detailed error information. 