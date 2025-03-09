# Temporarily Disabling RLS for Development

During active development, you can temporarily disable Row Level Security (RLS) on your tables to work more seamlessly. Here's how:

## Disable RLS in Supabase

1. Go to your Supabase dashboard
2. Navigate to "Authentication" > "Policies"
3. Find the table you want to work with (e.g., programs, courses, lessons, modules)
4. Toggle "Enable RLS" to OFF for each table

![Disable RLS Toggle](https://i.imgur.com/example-image.png)

## Re-Enable Before Production

**IMPORTANT**: Always re-enable RLS before deploying to production by:

1. Returning to the "Authentication" > "Policies" section
2. Toggle "Enable RLS" back to ON for each table
3. Ensure your policies are correctly configured

## SQL Commands

Alternatively, you can use SQL commands to disable/enable RLS:

```sql
-- Disable RLS for development
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS before production
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
```

This approach will allow you to develop without RLS restrictions, but remember to re-enable RLS and properly set up your policies before going to production. 