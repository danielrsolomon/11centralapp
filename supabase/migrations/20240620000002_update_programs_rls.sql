-- Update Programs RLS Policies for Superadmin Support
-- This migration adds support for 'superadmin' role in the programs table RLS policies
-- and ensures proper RLS policies exist for all operations (SELECT, INSERT, UPDATE, DELETE)

-- The issue: Current policies don't include 'superadmin' in the role checks, causing
-- users with superadmin role to hit RLS permission errors when trying to insert rows.

-- First, look for existing policies on the programs table and drop them to avoid conflicts
DO $$
BEGIN
  -- Drop the existing policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Programs are viewable by everyone') THEN
    DROP POLICY "Programs are viewable by everyone" ON programs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Programs are editable by creators and admins') THEN
    DROP POLICY "Programs are editable by creators and admins" ON programs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Programs are insertable by admins and training managers') THEN
    DROP POLICY "Programs are insertable by admins and training managers" ON programs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Content managers and admins can insert programs') THEN
    DROP POLICY "Content managers and admins can insert programs" ON programs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Program creators and admins can update programs') THEN
    DROP POLICY "Program creators and admins can update programs" ON programs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Program creators and admins can delete programs') THEN
    DROP POLICY "Program creators and admins can delete programs" ON programs;
  END IF;
END
$$;

-- Make sure RLS is enabled for the programs table
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all users to view programs (more restrictive criteria can be added as needed)
CREATE POLICY "Programs are viewable by everyone"
ON programs FOR SELECT USING (
  -- Anyone can view published programs
  status = 'published' OR 
  -- Or if they're the creator
  auth.uid() = created_by OR
  -- Or if they have special roles
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (
      -- Include superadmin explicitly
      role = 'superadmin' OR
      role = 'admin' OR 
      role = 'training_manager' OR
      role = 'content_manager' OR
      role = 'department_manager' OR
      -- Allow users with is_admin flag set too
      is_admin = true
    )
  )
);

-- Create a policy that allows program creation for authorized roles
-- This explicitly includes 'superadmin' role
CREATE POLICY "Authorized roles can insert programs"
ON programs FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (
      -- Include superadmin role explicitly
      LOWER(role) = 'superadmin' OR
      role = 'admin' OR 
      role = 'training_manager' OR
      role = 'content_manager' OR
      -- Allow users with is_admin flag set too
      is_admin = true
    )
  )
);

-- Create a policy that allows program updates for authorized users
CREATE POLICY "Authorized users can update programs"
ON programs FOR UPDATE 
TO authenticated
USING (
  -- Creator can update their own programs
  auth.uid() = created_by OR
  -- Users with special roles can update any program
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (
      -- Include superadmin role explicitly, case-insensitive
      LOWER(role) = 'superadmin' OR
      role = 'admin' OR 
      role = 'training_manager' OR
      role = 'content_manager' OR
      -- Allow users with is_admin flag set too
      is_admin = true
    )
  )
);

-- Create a policy that allows program deletion for authorized users
CREATE POLICY "Authorized users can delete programs"
ON programs FOR DELETE 
TO authenticated
USING (
  -- Creator can delete their own programs
  auth.uid() = created_by OR
  -- Users with special roles can delete any program
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (
      -- Include superadmin role explicitly, case-insensitive
      LOWER(role) = 'superadmin' OR
      role = 'admin' OR
      -- Allow users with is_admin flag set too
      is_admin = true
    )
  )
);

-- Add logging table to track RLS policy issues (optional but helpful for debugging)
CREATE TABLE IF NOT EXISTS rls_permission_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

-- Allow all authenticated users to write to the logs table
ALTER TABLE rls_permission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert logs" ON rls_permission_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins and superadmins can read logs" ON rls_permission_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND (
      LOWER(role) = 'superadmin' OR
      role = 'admin' OR
      is_admin = true
    )
  )
);

-- Create a helper function to log program permission issues
CREATE OR REPLACE FUNCTION log_program_permission_issue(
  operation TEXT,
  details JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO rls_permission_logs (user_id, table_name, operation, details)
  VALUES (auth.uid(), 'programs', operation, details);
EXCEPTION
  WHEN OTHERS THEN
    -- Silently handle any errors in the logging function
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 