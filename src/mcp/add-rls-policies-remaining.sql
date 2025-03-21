-- Add RLS policies to remaining tables: users, courses, schedules, gratuities, messages, course_enrollments

-- 1. Enable RLS on tables without it
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gratuities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_enrollments ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for users table
-- Policy allowing users to select all records
DROP POLICY IF EXISTS users_select_policy ON users;
CREATE POLICY users_select_policy ON users 
  FOR SELECT USING (true);

-- Policy allowing users to select their own data
DROP POLICY IF EXISTS users_select_own_policy ON users;
CREATE POLICY users_select_own_policy ON users 
  FOR SELECT USING (auth.uid() = id);

-- Policy allowing users to update their own data
DROP POLICY IF EXISTS users_update_own_policy ON users;
CREATE POLICY users_update_own_policy ON users 
  FOR UPDATE USING (auth.uid() = id);

-- Policy allowing service_role and authenticated to manage users
DROP POLICY IF EXISTS users_admin_policy ON users;
CREATE POLICY users_admin_policy ON users 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 3. Create RLS policies for courses table
-- Policy allowing anyone to select courses
DROP POLICY IF EXISTS courses_select_policy ON courses;
CREATE POLICY courses_select_policy ON courses 
  FOR SELECT USING (true);

-- Policy allowing service_role and authenticated to manage courses
DROP POLICY IF EXISTS courses_admin_policy ON courses;
CREATE POLICY courses_admin_policy ON courses 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 4. Create RLS policies for schedules table
-- Policy allowing users to select schedules for their venue
DROP POLICY IF EXISTS schedules_select_policy ON schedules;
CREATE POLICY schedules_select_policy ON schedules 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.venue_id = schedules.venue_id
    ) OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy allowing service_role and authenticated to manage schedules
DROP POLICY IF EXISTS schedules_admin_policy ON schedules;
CREATE POLICY schedules_admin_policy ON schedules 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 5. Create RLS policies for gratuities table
-- Policy allowing users to select gratuities for their venue
DROP POLICY IF EXISTS gratuities_select_policy ON gratuities;
CREATE POLICY gratuities_select_policy ON gratuities 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.venue_id = gratuities.venue_id
    ) OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy allowing service_role and authenticated to manage gratuities
DROP POLICY IF EXISTS gratuities_admin_policy ON gratuities;
CREATE POLICY gratuities_admin_policy ON gratuities 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 6. Create RLS policies for messages table
-- Policy allowing users to select messages for their venue
DROP POLICY IF EXISTS messages_select_policy ON messages;
CREATE POLICY messages_select_policy ON messages 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.venue_id = messages.venue_id
    ) OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy allowing service_role and authenticated to manage messages
DROP POLICY IF EXISTS messages_admin_policy ON messages;
CREATE POLICY messages_admin_policy ON messages 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- 7. Create RLS policies for course_enrollments table
-- Policy allowing users to select their own enrollments
DROP POLICY IF EXISTS course_enrollments_select_own_policy ON course_enrollments;
CREATE POLICY course_enrollments_select_own_policy ON course_enrollments 
  FOR SELECT USING (
    auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy allowing users to select enrollments for their venue's courses
DROP POLICY IF EXISTS course_enrollments_select_venue_policy ON course_enrollments;
CREATE POLICY course_enrollments_select_venue_policy ON course_enrollments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN courses c ON c.id = course_enrollments.course_id
      WHERE u.id = auth.uid() AND u.venue_id = c.venue_id
    ) OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy allowing service_role and authenticated to manage course_enrollments
DROP POLICY IF EXISTS course_enrollments_admin_policy ON course_enrollments;
CREATE POLICY course_enrollments_admin_policy ON course_enrollments 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.jwt() ->> 'role' = 'service_role' 
    OR auth.jwt() ->> 'role' = 'authenticated'
  ));

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema'; 