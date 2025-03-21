-- Security Review for 11Central Application
-- This script analyzes and fixes RLS policies across all tables

-- Function to identify tables without RLS enabled
CREATE OR REPLACE FUNCTION identify_tables_without_rls()
RETURNS TABLE(table_name text, has_rls boolean, policy_count integer) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    c.relrowsecurity,
    COUNT(p.policyname)::integer
  FROM pg_tables t
  JOIN pg_class c ON t.tablename = c.relname AND t.schemaname = c.relnamespace::regnamespace::text
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_prisma_%'
  GROUP BY t.tablename, c.relrowsecurity
  ORDER BY c.relrowsecurity, COUNT(p.policyname);
END;
$$ LANGUAGE plpgsql;

-- Function to check for tables that need RLS enabled
CREATE OR REPLACE FUNCTION enable_rls_for_tables()
RETURNS jsonb AS $$
DECLARE
  tables_modified jsonb := '[]'::jsonb;
  table_record record;
BEGIN
  FOR table_record IN
    SELECT table_name
    FROM identify_tables_without_rls()
    WHERE has_rls = false
  LOOP
    -- Enable RLS for this table
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    
    -- Add to the list of modified tables
    tables_modified := tables_modified || jsonb_build_object(
      'table', table_record.table_name,
      'action', 'enabled_rls',
      'timestamp', now()
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'tables_modified', tables_modified,
    'count', jsonb_array_length(tables_modified)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to identify sensitive tables without proper policies
CREATE OR REPLACE FUNCTION identify_sensitive_tables_without_policies()
RETURNS TABLE(table_name text, policy_count integer, needs_policies text[]) AS $$
BEGIN
  RETURN QUERY
  WITH sensitive_tables AS (
    -- Define tables that should have specific policies
    SELECT 'users' as table_name, ARRAY['authenticated:select:self', 'authenticated:update:self', 'anon:none'] as required_policies
    UNION
    SELECT 'profiles', ARRAY['authenticated:select:self', 'authenticated:update:self', 'anon:select:public']
    UNION
    SELECT 'messages', ARRAY['authenticated:select:recipient', 'authenticated:insert:sender', 'anon:none']
    UNION
    SELECT 'gratuities', ARRAY['authenticated:select:self', 'authenticated:insert:self', 'anon:none']
    UNION
    SELECT 'schedules', ARRAY['authenticated:select:self', 'authenticated:select:venue', 'anon:none']
    UNION
    SELECT 'course_enrollments', ARRAY['authenticated:select:self', 'authenticated:update:self', 'anon:none']
    UNION
    SELECT 'courses', ARRAY['authenticated:select:all', 'authenticated:insert:admin', 'anon:select:public']
    UNION
    SELECT 'departments', ARRAY['authenticated:select:all', 'authenticated:insert:admin', 'anon:none']
    UNION
    SELECT 'venues', ARRAY['authenticated:select:all', 'authenticated:update:admin', 'anon:select:public']
  )
  SELECT 
    t.table_name,
    COUNT(p.policyname)::integer,
    s.required_policies
  FROM sensitive_tables s
  JOIN pg_tables t ON s.table_name = t.tablename AND t.schemaname = 'public'
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  GROUP BY t.table_name, s.required_policies
  ORDER BY COUNT(p.policyname);
END;
$$ LANGUAGE plpgsql;

-- Function to create default RLS policies for a table
CREATE OR REPLACE FUNCTION create_default_policies(
  target_table text,
  policy_type text DEFAULT 'standard'
) RETURNS jsonb AS $$
DECLARE
  created_policies jsonb := '[]'::jsonb;
  result jsonb;
BEGIN
  -- Ensure RLS is enabled
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
  
  -- Create default policies based on table type
  CASE 
    -- Users table policies
    WHEN target_table = 'users' THEN
      -- Self-access policy (users can see their own data)
      EXECUTE format('
        CREATE POLICY users_select_self ON %I 
          FOR SELECT 
          TO authenticated 
          USING (auth.uid() = id)
      ', target_table);
      
      created_policies := created_policies || '"users_select_self"';
      
      -- Self-update policy (users can update their own data)
      EXECUTE format('
        CREATE POLICY users_update_self ON %I 
          FOR UPDATE 
          TO authenticated 
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id)
      ', target_table);
      
      created_policies := created_policies || '"users_update_self"';
      
      -- Admin access policy
      EXECUTE format('
        CREATE POLICY users_admin_access ON %I 
          FOR ALL 
          TO authenticated 
          USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id IN (
                SELECT id FROM roles WHERE name IN (''Admin'', ''SuperAdmin'')
              )
            )
          )
      ', target_table);
      
      created_policies := created_policies || '"users_admin_access"';
      
      -- Service role access policy
      EXECUTE format('
        CREATE POLICY users_service_role ON %I 
          FOR ALL 
          TO service_role 
          USING (true)
          WITH CHECK (true)
      ', target_table);
      
      created_policies := created_policies || '"users_service_role"';
    
    -- Profiles table policies
    WHEN target_table = 'profiles' THEN
      -- Self-access policy
      EXECUTE format('
        CREATE POLICY profiles_select_self ON %I 
          FOR SELECT 
          TO authenticated 
          USING (auth.uid() = user_id)
      ', target_table);
      
      created_policies := created_policies || '"profiles_select_self"';
      
      -- Public profiles for anonymous users
      EXECUTE format('
        CREATE POLICY profiles_select_public ON %I 
          FOR SELECT 
          TO anon 
          USING (public = true)
      ', target_table);
      
      created_policies := created_policies || '"profiles_select_public"';
      
      -- Self-update policy
      EXECUTE format('
        CREATE POLICY profiles_update_self ON %I 
          FOR UPDATE 
          TO authenticated 
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id)
      ', target_table);
      
      created_policies := created_policies || '"profiles_update_self"';
      
      -- Admin access policy
      EXECUTE format('
        CREATE POLICY profiles_admin_access ON %I 
          FOR ALL 
          TO authenticated 
          USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id IN (
                SELECT id FROM roles WHERE name IN (''Admin'', ''SuperAdmin'')
              )
            )
          )
      ', target_table);
      
      created_policies := created_policies || '"profiles_admin_access"';
      
      -- Service role access policy
      EXECUTE format('
        CREATE POLICY profiles_service_role ON %I 
          FOR ALL 
          TO service_role 
          USING (true)
          WITH CHECK (true)
      ', target_table);
      
      created_policies := created_policies || '"profiles_service_role"';
    
    -- Messages table policies
    WHEN target_table = 'messages' THEN
      -- Recipient can view messages
      EXECUTE format('
        CREATE POLICY messages_select_recipient ON %I 
          FOR SELECT 
          TO authenticated 
          USING (auth.uid() = recipient_id)
      ', target_table);
      
      created_policies := created_policies || '"messages_select_recipient"';
      
      -- Sender can view sent messages
      EXECUTE format('
        CREATE POLICY messages_select_sender ON %I 
          FOR SELECT 
          TO authenticated 
          USING (auth.uid() = sender_id)
      ', target_table);
      
      created_policies := created_policies || '"messages_select_sender"';
      
      -- Sender can insert messages
      EXECUTE format('
        CREATE POLICY messages_insert_sender ON %I 
          FOR INSERT 
          TO authenticated 
          WITH CHECK (auth.uid() = sender_id)
      ', target_table);
      
      created_policies := created_policies || '"messages_insert_sender"';
      
      -- Recipients can update message read status
      EXECUTE format('
        CREATE POLICY messages_update_recipient ON %I 
          FOR UPDATE 
          TO authenticated 
          USING (auth.uid() = recipient_id)
          WITH CHECK (auth.uid() = recipient_id)
      ', target_table);
      
      created_policies := created_policies || '"messages_update_recipient"';
      
      -- Admin access policy
      EXECUTE format('
        CREATE POLICY messages_admin_access ON %I 
          FOR ALL 
          TO authenticated 
          USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id IN (
                SELECT id FROM roles WHERE name IN (''Admin'', ''SuperAdmin'')
              )
            )
          )
      ', target_table);
      
      created_policies := created_policies || '"messages_admin_access"';
      
      -- Service role access policy
      EXECUTE format('
        CREATE POLICY messages_service_role ON %I 
          FOR ALL 
          TO service_role 
          USING (true)
          WITH CHECK (true)
      ', target_table);
      
      created_policies := created_policies || '"messages_service_role"';
    
    -- Gratuities table policies
    WHEN target_table = 'gratuities' THEN
      -- Self-access policy
      EXECUTE format('
        CREATE POLICY gratuities_select_self ON %I 
          FOR SELECT 
          TO authenticated 
          USING (auth.uid() = user_id)
      ', target_table);
      
      created_policies := created_policies || '"gratuities_select_self"';
      
      -- Self-insert policy
      EXECUTE format('
        CREATE POLICY gratuities_insert_self ON %I 
          FOR INSERT 
          TO authenticated 
          WITH CHECK (auth.uid() = user_id)
      ', target_table);
      
      created_policies := created_policies || '"gratuities_insert_self"';
      
      -- Manager can view venue gratuities
      EXECUTE format('
        CREATE POLICY gratuities_select_manager ON %I 
          FOR SELECT 
          TO authenticated 
          USING (
            auth.uid() IN (
              SELECT u.id FROM users u
              JOIN roles r ON u.role_id = r.id
              WHERE r.name IN (''Manager'', ''SeniorManager'', ''Director'', ''Admin'', ''SuperAdmin'')
            )
          )
      ', target_table);
      
      created_policies := created_policies || '"gratuities_select_manager"';
      
      -- Admin access policy
      EXECUTE format('
        CREATE POLICY gratuities_admin_access ON %I 
          FOR ALL 
          TO authenticated 
          USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id IN (
                SELECT id FROM roles WHERE name IN (''Admin'', ''SuperAdmin'')
              )
            )
          )
      ', target_table);
      
      created_policies := created_policies || '"gratuities_admin_access"';
      
      -- Service role access policy
      EXECUTE format('
        CREATE POLICY gratuities_service_role ON %I 
          FOR ALL 
          TO service_role 
          USING (true)
          WITH CHECK (true)
      ', target_table);
      
      created_policies := created_policies || '"gratuities_service_role"';
    
    -- Standard table policies (for most other tables)
    ELSE
      -- Service role access policy
      EXECUTE format('
        CREATE POLICY %I_service_role ON %I 
          FOR ALL 
          TO service_role 
          USING (true)
          WITH CHECK (true)
      ', target_table, target_table);
      
      created_policies := created_policies || format('"%s_service_role"', target_table);
      
      -- Admin access policy
      EXECUTE format('
        CREATE POLICY %I_admin_access ON %I 
          FOR ALL 
          TO authenticated 
          USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id IN (
                SELECT id FROM roles WHERE name IN (''Admin'', ''SuperAdmin'')
              )
            )
          )
      ', target_table, target_table);
      
      created_policies := created_policies || format('"%s_admin_access"', target_table);
      
      -- Authenticated users can select
      EXECUTE format('
        CREATE POLICY %I_auth_select ON %I 
          FOR SELECT 
          TO authenticated 
          USING (true)
      ', target_table, target_table);
      
      created_policies := created_policies || format('"%s_auth_select"', target_table);
      
      -- For public tables (venues, courses) - allow anonymous select
      IF target_table IN ('venues', 'courses') THEN
        EXECUTE format('
          CREATE POLICY %I_anon_select ON %I 
            FOR SELECT 
            TO anon 
            USING (true)
        ', target_table, target_table);
        
        created_policies := created_policies || format('"%s_anon_select"', target_table);
      END IF;
  END CASE;
  
  -- Return the result
  result := jsonb_build_object(
    'table', target_table,
    'created_policies', created_policies,
    'count', jsonb_array_length(created_policies),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to run a full security audit and fix issues
CREATE OR REPLACE FUNCTION run_security_audit(
  fix_issues boolean DEFAULT false
) RETURNS jsonb AS $$
DECLARE
  tables_without_rls jsonb;
  sensitive_tables_result jsonb;
  tables_fixed jsonb := '[]'::jsonb;
  result jsonb;
  row record;
BEGIN
  -- Check for tables without RLS
  SELECT jsonb_agg(to_jsonb(r))
  FROM identify_tables_without_rls() r
  WHERE r.has_rls = false
  INTO tables_without_rls;
  
  -- Check for sensitive tables without proper policies
  SELECT jsonb_agg(to_jsonb(r))
  FROM identify_sensitive_tables_without_policies() r
  INTO sensitive_tables_result;
  
  -- Fix issues if requested
  IF fix_issues THEN
    -- 1. Enable RLS on tables that don't have it
    FOR row IN
      SELECT * FROM identify_tables_without_rls() WHERE has_rls = false
    LOOP
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', row.table_name);
      
      tables_fixed := tables_fixed || jsonb_build_object(
        'table', row.table_name,
        'action', 'enabled_rls',
        'timestamp', now()
      );
    END LOOP;
    
    -- 2. Create policies for tables that need them
    FOR row IN
      SELECT * FROM identify_sensitive_tables_without_policies() WHERE policy_count < 3
    LOOP
      -- Create default policies
      DECLARE
        policy_result jsonb;
      BEGIN
        policy_result := create_default_policies(row.table_name);
        
        tables_fixed := tables_fixed || jsonb_build_object(
          'table', row.table_name,
          'action', 'created_policies',
          'policies', policy_result->'created_policies',
          'timestamp', now()
        );
      END;
    END LOOP;
  END IF;
  
  -- Build the final result
  result := jsonb_build_object(
    'tables_without_rls', tables_without_rls,
    'sensitive_tables_without_policies', sensitive_tables_result,
    'issues_fixed', tables_fixed,
    'fix_requested', fix_issues,
    'total_issues_fixed', jsonb_array_length(tables_fixed),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Run the security audit without fixing issues - just report them
SELECT run_security_audit(false);

-- Execute this to fix all identified issues:
-- SELECT run_security_audit(true);

-- Check all user tables for excessive permissions
SELECT
  t.tablename AS table_name,
  array_agg(DISTINCT p.rolname) FILTER (WHERE p.perm_select) AS can_select,
  array_agg(DISTINCT p.rolname) FILTER (WHERE p.perm_insert) AS can_insert,
  array_agg(DISTINCT p.rolname) FILTER (WHERE p.perm_update) AS can_update,
  array_agg(DISTINCT p.rolname) FILTER (WHERE p.perm_delete) AS can_delete
FROM pg_tables t
JOIN (
  SELECT
    relname,
    rolname,
    pg_catalog.has_table_privilege(ro.oid, ta.oid, 'SELECT') AS perm_select,
    pg_catalog.has_table_privilege(ro.oid, ta.oid, 'INSERT') AS perm_insert,
    pg_catalog.has_table_privilege(ro.oid, ta.oid, 'UPDATE') AS perm_update,
    pg_catalog.has_table_privilege(ro.oid, ta.oid, 'DELETE') AS perm_delete
  FROM pg_catalog.pg_roles ro
  CROSS JOIN pg_catalog.pg_class ta
  WHERE ta.relkind = 'r' AND
        ro.rolname NOT LIKE 'pg_%' AND
        ta.relname NOT LIKE 'pg_%' AND
        ta.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
) p ON t.tablename = p.relname
WHERE t.schemaname = 'public' AND
      t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename
ORDER BY t.tablename; 