-- Adjust current tables to match the new hierarchy: Program → Course → Lesson → Module

-- Programs table (top level)
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  departments TEXT[], -- Array of department ids/names
  status TEXT DEFAULT 'draft', -- draft, published, archived
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Update courses table to reference programs instead
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  overview TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update lessons table to reference courses
DROP TABLE IF EXISTS lessons CASCADE;
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructors UUID[], -- Array of user ids who are instructors
  sequence_order INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update modules table to reference lessons (previously referenced courses)
DROP TABLE IF EXISTS modules CASCADE;
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  video_required BOOLEAN DEFAULT true,
  has_quiz BOOLEAN DEFAULT false,
  quiz_type TEXT, -- 'multiple_choice' or 'true_false'
  sequence_order INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions table (associated with modules)
DROP TABLE IF EXISTS quiz_questions CASCADE;
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'multiple_choice' or 'true_false'
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz answers table
DROP TABLE IF EXISTS quiz_answers CASCADE;
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  sequence_order INTEGER NOT NULL DEFAULT 0
);

-- User progress tracking
DROP TABLE IF EXISTS user_progress CASCADE;
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'not_started', 'in_progress', 'completed'
  completion_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_video_position INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  UNIQUE(user_id, module_id)
);

-- User quiz attempts
DROP TABLE IF EXISTS user_quiz_attempts CASCADE;
CREATE TABLE user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  attempt_number INTEGER NOT NULL DEFAULT 1
);

-- User program completion tracking
CREATE TABLE IF NOT EXISTS user_program_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'not_started', 'in_progress', 'completed'
  completion_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
);

-- Department table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default departments
INSERT INTO departments (name, description)
VALUES 
('All', 'All departments'),
('Management', 'Management staff'),
('Service', 'Service staff including servers and bartenders'),
('Security', 'Security personnel'),
('Administration', 'Administrative staff')
ON CONFLICT (name) DO NOTHING;

-- Add updated_at triggers
CREATE TRIGGER set_timestamp_programs
BEFORE UPDATE ON programs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_courses
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_lessons
BEFORE UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_modules
BEFORE UPDATE ON modules
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_departments
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Policies

-- Enable RLS on tables
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Programs policies
CREATE POLICY "Programs are viewable by everyone"
ON programs FOR SELECT USING (
  status = 'published' OR 
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'training_manager')
  )
);

CREATE POLICY "Programs are editable by creators and admins"
ON programs FOR UPDATE USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'training_manager')
  )
);

CREATE POLICY "Programs are insertable by admins and training managers"
ON programs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'training_manager')
  )
);

-- Similar policies for courses, lessons, modules, etc.

-- Create function to calculate program completion
CREATE OR REPLACE FUNCTION calculate_program_completion(program_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
  completion_percentage INTEGER;
BEGIN
  -- Get total number of modules in program
  SELECT COUNT(m.id) INTO total_modules
  FROM modules m
  JOIN lessons l ON m.lesson_id = l.id
  JOIN courses c ON l.course_id = c.id
  WHERE c.program_id = $1;
  
  -- Get number of completed modules
  SELECT COUNT(up.id) INTO completed_modules
  FROM user_progress up
  JOIN modules m ON up.module_id = m.id
  JOIN lessons l ON m.lesson_id = l.id
  JOIN courses c ON l.course_id = c.id
  WHERE c.program_id = $1 AND up.user_id = $2 AND up.status = 'completed';
  
  -- Calculate percentage
  IF total_modules = 0 THEN
    completion_percentage := 0;
  ELSE
    completion_percentage := (completed_modules * 100) / total_modules;
  END IF;
  
  RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql; 