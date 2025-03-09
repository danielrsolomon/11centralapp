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