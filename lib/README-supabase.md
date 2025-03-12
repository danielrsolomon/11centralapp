# Supabase Client Implementation

This document explains the Supabase client implementation in the E11EVEN Central Platform application.

## Overview

We have consolidated all Supabase client implementations into two main files:

1. `lib/supabase-client.ts` - Client-side implementation
2. `lib/supabase-server.ts` - Server-side implementation

This organization follows the Next.js best practices for handling database connections in a hybrid client/server environment.

## Client-Side Implementation

Located in `lib/supabase-client.ts`, this implementation provides:

- Optimized Supabase client for browser environments
- Performance optimization through caching
- Error handling and logging
- Type safety using the Database type definition

### Usage Example

```typescript
// Import the default client
import supabase from '@/lib/supabase-client';

// In a component
async function getUserData() {
  // Auth methods
  const { data: { user } } = await supabase.auth.getUser();
  
  // Database queries with caching
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .execute();
    
  if (error) {
    console.error('Error fetching user data:', error);
    return;
  }
  
  // Use the data
  console.log('User data:', data);
}

// For backwards compatibility
import { createClient } from '@/lib/supabase-client';
const compatClient = createClient();
```

## Server-Side Implementation

Located in `lib/supabase-server.ts`, this implementation provides:

- Server-side Supabase client using appropriate authentication
- Options for using the service role key (bypassing RLS) in trusted contexts
- Middleware and API route implementations with cookie handling
- Type safety using the Database type definition

### Usage Examples

#### Standard Server Client

```typescript
// Import the default server client
import supabaseServer from '@/lib/supabase-server';

// In a server component or API route
async function getServerData() {
  const { data, error } = await supabaseServer()
    .from('users')
    .select('*');
    
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  return data;
}
```

#### Service Role Client (Admin Access)

```typescript
// Import the service client
import { createServiceClient } from '@/lib/supabase-server';

// In a trusted server context (like an admin API)
async function adminOperation() {
  const serviceClient = createServiceClient();
  
  // This bypasses RLS and should only be used in trusted contexts
  const { data, error } = await serviceClient
    .from('users')
    .update({ is_active: true })
    .eq('id', userId);
    
  if (error) {
    console.error('Error updating user:', error);
    return;
  }
  
  return data;
}
```

#### Middleware Usage

```typescript
import { createMiddlewareClient } from '@/lib/supabase-server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createMiddlewareClient(request, response);
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirect if not authenticated
  if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  return response;
}
```

## Type Safety

Both implementations use the Database type definition from `types/supabase.ts` which provides type safety for your database operations. This ensures that you're only querying tables and columns that actually exist in your Supabase database.

## Performance Considerations

The client-side implementation includes built-in caching for query results to improve performance and reduce unnecessary network requests. Cache invalidation happens automatically when insert, update, or delete operations are performed on a table.

## Legacy Client Files

The following files have been deprecated and should no longer be used:

- `lib/supabase-optimized.ts` (use `lib/supabase-client.ts` instead)
- `lib/supabase.ts` (use `lib/supabase-client.ts` instead)
- `lib/supabase-dev.ts` (development-only features are now integrated into `lib/supabase-client.ts`)

## Development vs. Production

The client implementations handle both development and production environments:

- In development: Includes more verbose logging and can bypass RLS if configured
- In production: Uses optimized configurations with appropriate security settings 