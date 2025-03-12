# Development Environment Setup for RLS Workarounds

This guide explains how to set up your development environment to work seamlessly with Supabase RLS.

## Why This Is Needed

During development, you'll often need to:

1. Create programs, courses, lessons, and modules
2. Test various user roles and permissions
3. Develop without constant authentication issues

Row Level Security (RLS) is important for production but can slow down development.

## Setup Instructions

### 1. Set Up Environment Variables

Copy the `.env.local.example` file to `.env.local` and fill in your Supabase details:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your Supabase details:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for bypassing RLS)

### 2. Where to Find Your Service Role Key

1. Go to your Supabase dashboard
2. Click on the "Settings" icon (gear) in the sidebar
3. Select "API" from the menu
4. Find the "service_role key" (labeled as "secret") in the "Project API keys" section
5. Copy this key to your `.env.local` file

![Supabase Service Role Key Location](https://i.imgur.com/example-image.png)

### 3. Restart Your Development Server

After setting up the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## Using the Development Mode

With this setup, your application will:

1. Try to perform operations normally first
2. If an RLS error is encountered, it will automatically try to bypass it in development mode
3. Show appropriate messages for what would happen in production

## Security Warning

The service role key has full access to your database, bypassing all security rules. NEVER:

- Commit the `.env.local` file to git
- Deploy this development setup to production
- Use the service role key in client-side code that gets sent to browsers

## Switching to Production Mode

When you're ready to test with actual RLS policies:

1. Set `NEXT_PUBLIC_DEV_BYPASS_RLS=false` in your `.env.local` file
2. Set up proper RLS policies as described in `SUPABASE_RLS_SETUP.md`
3. Add appropriate roles to your test users 

## Database Optimization

### Database Indexing

As of March 10, 2025, the following database indexes have been created in Supabase to optimize performance:

| Table | Columns | Type | Purpose |
|-------|---------|------|---------|
| users | email | btree | Faster user lookups when authenticating by email |
| user_progress | user_id, module_id | btree | Optimize queries for tracking user progress through modules |
| messages | conversation_id, created_at | btree | Speed up message retrieval and sorting within conversations |
| conversations | updated_at | btree | Improve performance when sorting conversations by recent activity |
| user_roles | user_id | btree | Accelerate permission checks and role-based access control |

#### Why These Indexes Were Added

These indexes were strategically created to address performance bottlenecks in the most frequently accessed data paths:

1. **Authentication flows**: Optimized email lookups improve login performance
2. **Dashboard load times**: Faster progress and role checks improve initial page loads
3. **Messaging performance**: Conversation and message indexes ensure smooth messaging experiences, even with high message volumes
4. **Role-based security**: User role indexes ensure permission checks remain fast even as user count grows

#### When to Add New Indexes

Consider adding new indexes when:
- Query performance degrades for specific operations
- New features introduce new frequent query patterns
- Data volume grows significantly (>100k records in a table)

Always benchmark before and after adding indexes to ensure they provide the expected performance improvement.

#### Caution About Over-Indexing

While indexes speed up reads, they slow down writes and increase storage requirements. Only add indexes on columns that are frequently used in WHERE clauses, JOIN conditions, or ORDER BY statements. 

#### References and Further Reading

For developers who want to learn more about database indexing strategies in Supabase:

- [Supabase Database Indexing Documentation](https://supabase.com/docs/guides/database/postgres/indexes)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [PostgreSQL Index Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)

You can also find practical examples of indexing in the Supabase GitHub repository:
- [Supabase Schema Examples](https://github.com/supabase/supabase/tree/master/examples) 