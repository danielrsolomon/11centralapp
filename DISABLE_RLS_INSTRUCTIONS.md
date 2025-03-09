# How to Disable Row-Level Security (RLS) in Supabase

After several attempts with code-based workarounds, the most reliable solution for development is to disable RLS directly in Supabase.

## Step-by-Step Instructions

1. **Open your Supabase dashboard**:
   - Go to: [https://app.supabase.com/](https://app.supabase.com/)
   - Sign in with your account
   - Select your project

2. **Navigate to Authentication Settings**:
   - Click on "Authentication" in the left sidebar
   - Select "Policies" from the submenu

3. **Disable RLS for the Programs Table**:
   - Find the `programs` table in the list
   - Toggle OFF the "Enable RLS" switch for this table
   
   ![Disable RLS Toggle](https://i.imgur.com/wV8Hxbm.png)

4. **Disable RLS for Other Related Tables**:
   Also disable RLS for these tables if you'll be working with them:
   - `courses`
   - `lessons`
   - `modules`

5. **Test Your Application**:
   - Return to your application
   - Try creating a program again - it should now work without RLS errors

## Important Note for Production

**NEVER deploy to production without re-enabling RLS!**

Before deploying to production:

1. Return to Supabase Authentication → Policies
2. Toggle ON "Enable RLS" for all tables
3. Set up proper RLS policies as described in the `SUPABASE_RLS_SETUP.md` guide

## Why This Approach?

While we attempted several code-based workarounds, disabling RLS directly in Supabase is:

1. More reliable - no environment variable issues or client/server concerns
2. Simpler - no complex code to maintain
3. Clear separation - development mode vs. production security

This approach lets you focus on developing your application without RLS-related interruptions. 