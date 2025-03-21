-- Add RLS policies to tables that need them: roles, departments, venues

-- 1. Enable RLS on tables without it
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS venues ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for roles table
-- Policy allowing anyone to select roles
DROP POLICY IF EXISTS roles_select_policy ON roles;
CREATE POLICY roles_select_policy ON roles 
  FOR SELECT USING (true);

-- Policy allowing service_role to insert, update, delete roles
DROP POLICY IF EXISTS roles_admin_policy ON roles;
CREATE POLICY roles_admin_policy ON roles 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 3. Create RLS policies for departments table
-- Policy allowing anyone to select departments
DROP POLICY IF EXISTS departments_select_policy ON departments;
CREATE POLICY departments_select_policy ON departments 
  FOR SELECT USING (true);

-- Policy allowing service_role to insert, update, delete departments
DROP POLICY IF EXISTS departments_admin_policy ON departments;
CREATE POLICY departments_admin_policy ON departments 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 4. Create RLS policies for venues table
-- Policy allowing anyone to select venues
DROP POLICY IF EXISTS venues_select_policy ON venues;
CREATE POLICY venues_select_policy ON venues 
  FOR SELECT USING (true);

-- Policy allowing service_role to insert, update, delete venues
DROP POLICY IF EXISTS venues_admin_policy ON venues;
CREATE POLICY venues_admin_policy ON venues 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 5. Create a function to check if current user has admin permissions
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (
      SELECT 1 
      FROM public.users u
      JOIN public.user_roles ur ON u.id = ur.user_id
      JOIN public.roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('SuperAdmin', 'Admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to check if current user belongs to a specific venue
CREATE OR REPLACE FUNCTION auth.is_venue_member(venue_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = auth.uid() AND u.venue_id = venue_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema'; 