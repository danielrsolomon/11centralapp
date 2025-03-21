-- ==========================================
-- Supabase Auth Helpers for RLS Policies
-- ==========================================

-- This file contains helper functions that make working with Supabase
-- Row Level Security (RLS) policies safer and more consistent.

-- ==========================================
-- Safe Auth UID Helper
-- ==========================================

-- Problem: 
-- When comparing auth.uid() with UUID fields in database tables,
-- you can encounter type mismatch errors since auth.uid() may not 
-- always be directly compatible with UUID columns.

-- Solution:
-- Create a helper function that properly handles type conversion

-- Helper function for safe UUID comparison
CREATE OR REPLACE FUNCTION safe_auth_uid() 
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  result text;
BEGIN
  -- Get the auth.uid() and convert it to text for safe comparison
  SELECT COALESCE(auth.uid()::text, '') INTO result;
  RETURN result;
END;
$$;

-- ==========================================
-- Usage Examples
-- ==========================================

-- Basic user ID comparison
-- CREATE POLICY user_read_own ON public.users 
-- FOR SELECT USING (id::text = safe_auth_uid());

-- Array comparison (when the column is an array of text)
-- CREATE POLICY read_published_programs ON public.programs
-- FOR SELECT USING (
--   status = 'published' AND
--   EXISTS (
--     SELECT 1 FROM user_roles ur
--     WHERE ur.user_id::text = safe_auth_uid() 
--     AND ur.department_id::text = ANY(programs.departments)
--   )
-- );

-- Complex join condition
-- CREATE POLICY managers_read_dept_progress ON public.user_progress
-- FOR SELECT USING (
--   EXISTS (
--     SELECT 1 FROM user_roles ur_manager
--     JOIN roles r ON ur_manager.role_id = r.id
--     JOIN user_roles ur_staff ON ur_manager.department_id = ur_staff.department_id
--     WHERE ur_manager.user_id::text = safe_auth_uid()
--     AND r.name IN ('Manager', 'SeniorManager', 'Director')
--     AND ur_staff.user_id::text = user_progress.user_id::text
--   )
-- );

-- ==========================================
-- Installation Instructions
-- ==========================================

-- 1. Execute this file in the Supabase SQL Editor to create the helper function
-- 2. Use the function in all RLS policies where you need to compare auth.uid() with UUID fields
-- 3. Always cast UUID fields to text when comparing with safe_auth_uid()

-- Last updated: May 15, 2024 