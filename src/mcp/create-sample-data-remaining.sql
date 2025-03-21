-- Sample data creation script for remaining tables: users, courses, course_enrollments
-- This will populate the database with sample data for testing

-- Sample users
INSERT INTO users (id, email, first_name, last_name, venue_id, role)
SELECT
  gen_random_uuid(),
  'user' || i || '@example.com',
  CASE 
    WHEN i % 5 = 0 THEN 'John'
    WHEN i % 5 = 1 THEN 'Sarah'
    WHEN i % 5 = 2 THEN 'Michael'
    WHEN i % 5 = 3 THEN 'Emma'
    ELSE 'David'
  END,
  CASE 
    WHEN i % 4 = 0 THEN 'Smith'
    WHEN i % 4 = 1 THEN 'Johnson'
    WHEN i % 4 = 2 THEN 'Williams'
    ELSE 'Brown'
  END,
  (SELECT id FROM venues ORDER BY random() LIMIT 1),
  CASE 
    WHEN i % 10 = 0 THEN 'SuperAdmin'
    WHEN i % 10 = 1 THEN 'Admin'
    WHEN i % 10 = 2 THEN 'Manager'
    ELSE 'Staff'
  END
FROM generate_series(1, 20) i
ON CONFLICT (email) DO NOTHING;

-- Sample courses
INSERT INTO courses (id, title, description, venue_id, instructor_id, duration_minutes, is_required)
SELECT
  gen_random_uuid(),
  CASE 
    WHEN i % 5 = 0 THEN 'Customer Service Excellence'
    WHEN i % 5 = 1 THEN 'Bartending Fundamentals'
    WHEN i % 5 = 2 THEN 'Security Training'
    WHEN i % 5 = 3 THEN 'Venue Operations'
    ELSE 'Management Skills'
  END || ' ' || i,
  'This is a sample course description for course ' || i,
  (SELECT id FROM venues ORDER BY random() LIMIT 1),
  (SELECT id FROM users WHERE role IN ('Admin', 'Manager') ORDER BY random() LIMIT 1),
  (i % 3 + 1) * 30,  -- 30, 60, or 90 minutes
  i % 2 = 0  -- Every other course is required
FROM generate_series(1, 15) i
ON CONFLICT DO NOTHING;

-- Sample course enrollments
INSERT INTO course_enrollments (id, user_id, course_id, enrollment_date, completion_date, status)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users ORDER BY random() LIMIT 1),
  (SELECT id FROM courses ORDER BY random() LIMIT 1),
  current_date - (random() * 30)::integer,
  CASE 
    WHEN random() > 0.3 THEN current_date - (random() * 15)::integer
    ELSE NULL
  END,
  CASE 
    WHEN random() < 0.7 THEN 'completed'
    WHEN random() < 0.9 THEN 'in progress'
    ELSE 'not started'
  END
FROM generate_series(1, 50) i
ON CONFLICT DO NOTHING;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema'; 