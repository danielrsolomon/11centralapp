-- Add 'order' column to programs table if it doesn't exist
ALTER TABLE programs ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;

-- Add 'order' column to courses table if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;

-- Add 'order' column to lessons table if it doesn't exist
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;

-- Add 'order' column to modules table if it doesn't exist
ALTER TABLE modules ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;

-- Update any existing programs to have a sequential order
WITH indexed_programs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS new_order
  FROM programs
)
UPDATE programs
SET "order" = indexed_programs.new_order
FROM indexed_programs
WHERE programs.id = indexed_programs.id;

-- Update any existing courses to have a sequential order
WITH indexed_courses AS (
  SELECT id, program_id, ROW_NUMBER() OVER (PARTITION BY program_id ORDER BY created_at) AS new_order
  FROM courses
)
UPDATE courses
SET "order" = indexed_courses.new_order
FROM indexed_courses
WHERE courses.id = indexed_courses.id;

-- Update any existing lessons to have a sequential order
WITH indexed_lessons AS (
  SELECT id, course_id, ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY created_at) AS new_order
  FROM lessons
)
UPDATE lessons
SET "order" = indexed_lessons.new_order
FROM indexed_lessons
WHERE lessons.id = indexed_lessons.id;

-- Update any existing modules to have a sequential order
WITH indexed_modules AS (
  SELECT id, lesson_id, ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY created_at) AS new_order
  FROM modules
)
UPDATE modules
SET "order" = indexed_modules.new_order
FROM indexed_modules
WHERE modules.id = indexed_modules.id; 