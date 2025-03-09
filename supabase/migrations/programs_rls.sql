-- PROGRAMS TABLE RLS POLICIES
-- This file contains SQL that should be executed in your Supabase project
-- to set up proper Row-Level Security for the programs table

-- Step 1: Enable RLS on the programs table
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a policy that allows anyone to read programs
CREATE POLICY "Programs are viewable by everyone" 
ON programs FOR SELECT 
USING (true);

-- Step 3: Create a policy that allows authenticated users with certain roles to insert programs
CREATE POLICY "Content managers and admins can insert programs" 
ON programs FOR INSERT 
TO authenticated
USING (
  -- This checks if the user has admin or content_manager role
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'content_manager')
  )
);

-- Step 4: Create a policy that allows program creators and admins to update their programs
CREATE POLICY "Program creators and admins can update programs" 
ON programs FOR UPDATE 
TO authenticated
USING (
  -- User is the creator or has admin role
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 5: Create a policy that allows program creators and admins to delete programs
CREATE POLICY "Program creators and admins can delete programs" 
ON programs FOR DELETE 
TO authenticated
USING (
  -- User is the creator or has admin role
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 6: Create user_roles table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Step 7: Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policy allowing users to read their own roles
CREATE POLICY "Users can read their own roles" 
ON user_roles FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Step 9: Create policy allowing admins to manage all roles
CREATE POLICY "Admins can manage all roles" 
ON user_roles
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- INSTRUCTIONS FOR ADDING ADMIN ROLE:
-- 1. Temporarily disable RLS on user_roles table:
--    ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
-- 
-- 2. Insert your admin user:
--    INSERT INTO user_roles (user_id, role) 
--    VALUES ('your-auth-user-id', 'admin');
--
-- 3. Re-enable RLS:
--    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY; 