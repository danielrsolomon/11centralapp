# Supabase Row-Level Security (RLS) Setup Guide

This guide will help you set up proper Row-Level Security (RLS) in your Supabase project for the 11 Central Training Portal.

## Why Use RLS?

Row-Level Security is essential for protecting your data and ensuring that:

1. Users can only see the content they should have access to
2. Only authorized users can create, update, or delete content
3. Your database remains secure even if someone obtains your Supabase API key

## Setup Instructions

### 1. Create the User Roles Table

First, we need to set up a table to track user roles:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the following SQL:

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

### 2. Add the RLS Policies

Now, run the SQL statements in the `supabase/migrations/programs_rls.sql` file through the Supabase SQL Editor.

### 3. Assign an Admin Role

To get started, you'll need at least one admin user:

1. First, find your user ID by running:
   ```sql
   SELECT id FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. Temporarily disable RLS on the user_roles table:
   ```sql
   ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
   ```

3. Insert your admin user:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('your-auth-user-id', 'admin');
   ```

4. Re-enable RLS:
   ```sql
   ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
   ```

### 4. Verify Your Setup

After setting up RLS, you should:

1. Be able to view programs when logged in as any user
2. Be able to create programs when logged in as a user with 'admin' or 'content_manager' role
3. Be able to update or delete programs only if you created them or have the 'admin' role

## Adding More Users and Roles

To add more content managers:

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('user-id', 'content_manager');
```

Available roles:
- `admin`: Full access to everything
- `content_manager`: Can create and manage content
- `instructor`: Can create and manage their own lessons and modules
- `user`: Basic access (view only)

## Development Mode

For development purposes only, you can temporarily disable RLS for specific tables:

```sql
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;
```

**IMPORTANT**: Always re-enable RLS before deploying to production:

```sql
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
``` 