-- This script will fix all tables structure and permissions

-- Fix venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to venues if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venues' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE venues ADD COLUMN name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venues' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE venues ADD COLUMN address TEXT;
  END IF;
END $$;

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select_policy" ON venues;
CREATE POLICY "venues_select_policy" ON venues FOR SELECT USING (true);

DROP POLICY IF EXISTS "venues_insert_policy" ON venues;
CREATE POLICY "venues_insert_policy" ON venues FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "venues_update_policy" ON venues;
CREATE POLICY "venues_update_policy" ON venues FOR UPDATE USING (true);

DROP POLICY IF EXISTS "venues_delete_policy" ON venues;
CREATE POLICY "venues_delete_policy" ON venues FOR DELETE USING (true);

-- Fix schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to schedules if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schedules' 
    AND column_name = 'venue_id'
  ) THEN
    ALTER TABLE schedules ADD COLUMN venue_id UUID REFERENCES venues(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schedules' 
    AND column_name = 'start_time'
  ) THEN
    ALTER TABLE schedules ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schedules' 
    AND column_name = 'end_time'
  ) THEN
    ALTER TABLE schedules ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schedules' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE schedules ADD COLUMN title TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schedules' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE schedules ADD COLUMN description TEXT;
  END IF;
END $$;

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select_policy" ON schedules;
CREATE POLICY "schedules_select_policy" ON schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedules_insert_policy" ON schedules;
CREATE POLICY "schedules_insert_policy" ON schedules FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "schedules_update_policy" ON schedules;
CREATE POLICY "schedules_update_policy" ON schedules FOR UPDATE USING (true);

DROP POLICY IF EXISTS "schedules_delete_policy" ON schedules;
CREATE POLICY "schedules_delete_policy" ON schedules FOR DELETE USING (true);

-- Fix gratuities table
CREATE TABLE IF NOT EXISTS gratuities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to gratuities if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gratuities' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE gratuities ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gratuities' 
    AND column_name = 'amount'
  ) THEN
    ALTER TABLE gratuities ADD COLUMN amount DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gratuities' 
    AND column_name = 'venue_id'
  ) THEN
    ALTER TABLE gratuities ADD COLUMN venue_id UUID REFERENCES venues(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gratuities' 
    AND column_name = 'transaction_date'
  ) THEN
    ALTER TABLE gratuities ADD COLUMN transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gratuities' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE gratuities ADD COLUMN notes TEXT;
  END IF;
END $$;

ALTER TABLE gratuities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gratuities_select_policy" ON gratuities;
CREATE POLICY "gratuities_select_policy" ON gratuities FOR SELECT USING (true);

DROP POLICY IF EXISTS "gratuities_insert_policy" ON gratuities;
CREATE POLICY "gratuities_insert_policy" ON gratuities FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "gratuities_update_policy" ON gratuities;
CREATE POLICY "gratuities_update_policy" ON gratuities FOR UPDATE USING (true);

DROP POLICY IF EXISTS "gratuities_delete_policy" ON gratuities;
CREATE POLICY "gratuities_delete_policy" ON gratuities FOR DELETE USING (true);

-- Fix messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to messages if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN sender_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN recipient_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE messages ADD COLUMN content TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'read'
  ) THEN
    ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
END $$;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_policy" ON messages;
CREATE POLICY "messages_select_policy" ON messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
CREATE POLICY "messages_insert_policy" ON messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "messages_update_policy" ON messages;
CREATE POLICY "messages_update_policy" ON messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
CREATE POLICY "messages_delete_policy" ON messages FOR DELETE USING (true);

-- Fix course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to course_enrollments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN course_id UUID REFERENCES courses(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'enrollment_date'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'completion_date'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN completion_date TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN status TEXT DEFAULT 'enrolled';
  END IF;
END $$;

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_enrollments_select_policy" ON course_enrollments;
CREATE POLICY "course_enrollments_select_policy" ON course_enrollments FOR SELECT USING (true);

DROP POLICY IF EXISTS "course_enrollments_insert_policy" ON course_enrollments;
CREATE POLICY "course_enrollments_insert_policy" ON course_enrollments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "course_enrollments_update_policy" ON course_enrollments;
CREATE POLICY "course_enrollments_update_policy" ON course_enrollments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "course_enrollments_delete_policy" ON course_enrollments;
CREATE POLICY "course_enrollments_delete_policy" ON course_enrollments FOR DELETE USING (true);

-- Fix roles table (add RLS)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_policy" ON roles;
CREATE POLICY "roles_select_policy" ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_insert_policy" ON roles;
CREATE POLICY "roles_insert_policy" ON roles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "roles_update_policy" ON roles;
CREATE POLICY "roles_update_policy" ON roles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "roles_delete_policy" ON roles;
CREATE POLICY "roles_delete_policy" ON roles FOR DELETE USING (true);

-- Fix departments table (add RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_policy" ON departments;
CREATE POLICY "departments_select_policy" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "departments_insert_policy" ON departments;
CREATE POLICY "departments_insert_policy" ON departments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "departments_update_policy" ON departments;
CREATE POLICY "departments_update_policy" ON departments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "departments_delete_policy" ON departments;
CREATE POLICY "departments_delete_policy" ON departments FOR DELETE USING (true);

-- Insert sample data
INSERT INTO venues (name, address)
SELECT 'E11EVEN Miami', '29 NE 11th St, Miami, FL 33132'
WHERE NOT EXISTS (SELECT 1 FROM venues LIMIT 1);

-- Display tables with RLS status
SELECT 
  tablename, 
  rowsecurity
FROM 
  pg_tables
WHERE 
  schemaname = 'public'
ORDER BY 
  tablename; 