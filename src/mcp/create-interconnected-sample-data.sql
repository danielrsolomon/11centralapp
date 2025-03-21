-- Create Interconnected Sample Data for 11Central App
-- This script creates a comprehensive set of sample data with connections between tables

-- Function to refresh schema cache after changes
CREATE OR REPLACE FUNCTION refresh_schema_cache() RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start a transaction for data consistency
BEGIN;

-- Clear existing sample data (optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE venues, departments, roles, users, schedules, messages, gratuities CASCADE;

-- Create sample venues
INSERT INTO venues (name, address)
VALUES 
  ('E11EVEN Miami', '29 NE 11th St, Miami, FL 33132'),
  ('E11EVEN Las Vegas', '123 Las Vegas Blvd, Las Vegas, NV 89101'),
  ('E11EVEN New York', '456 Broadway, New York, NY 10013'),
  ('E11EVEN Los Angeles', '789 Hollywood Blvd, Los Angeles, CA 90028')
ON CONFLICT (name) DO NOTHING
RETURNING id;

-- Create roles if they don't exist
INSERT INTO roles (name)
VALUES 
  ('owner'),
  ('manager'),
  ('employee')
ON CONFLICT (name) DO NOTHING
RETURNING id;

-- Create departments for each venue
WITH venue_ids AS (
  SELECT id, name FROM venues
)
INSERT INTO departments (name, venue_id)
SELECT 
  dept_name,
  v.id
FROM venue_ids v
CROSS JOIN (
  VALUES 
    ('Bar'),
    ('Kitchen'),
    ('Security'),
    ('Hostess'),
    ('DJ')
) AS d(dept_name)
ON CONFLICT (name, venue_id) DO NOTHING
RETURNING id;

-- Create users with different roles
WITH 
  role_data AS (
    SELECT id, name FROM roles
  ),
  venue_data AS (
    SELECT id, name FROM venues
  )
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  phone,
  role_id,
  primary_venue_id,
  active
)
VALUES
  -- Owner accounts
  (
    gen_random_uuid(),
    'john.owner@11miami.com',
    'John',
    'Smith',
    '+13055551234',
    (SELECT id FROM role_data WHERE name = 'owner'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Miami'),
    true
  ),
  (
    gen_random_uuid(),
    'lisa.owner@11vegas.com',
    'Lisa',
    'Johnson',
    '+17025551234',
    (SELECT id FROM role_data WHERE name = 'owner'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Las Vegas'),
    true
  ),
  
  -- Manager accounts
  (
    gen_random_uuid(),
    'mike.manager@11miami.com',
    'Mike',
    'Williams',
    '+13055552345',
    (SELECT id FROM role_data WHERE name = 'manager'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Miami'),
    true
  ),
  (
    gen_random_uuid(),
    'sarah.manager@11vegas.com',
    'Sarah',
    'Davis',
    '+17025552345',
    (SELECT id FROM role_data WHERE name = 'manager'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Las Vegas'),
    true
  ),
  (
    gen_random_uuid(),
    'david.manager@11ny.com',
    'David',
    'Brown',
    '+12125551234',
    (SELECT id FROM role_data WHERE name = 'manager'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN New York'),
    true
  ),
  
  -- Employee accounts - Miami
  (
    gen_random_uuid(),
    'alex.bartender@11miami.com',
    'Alex',
    'Taylor',
    '+13055553456',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Miami'),
    true
  ),
  (
    gen_random_uuid(),
    'jessica.host@11miami.com',
    'Jessica',
    'Martinez',
    '+13055554567',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Miami'),
    true
  ),
  (
    gen_random_uuid(),
    'james.security@11miami.com',
    'James',
    'Wilson',
    '+13055555678',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Miami'),
    true
  ),
  
  -- Employee accounts - Las Vegas
  (
    gen_random_uuid(),
    'megan.bartender@11vegas.com',
    'Megan',
    'Clark',
    '+17025553456',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Las Vegas'),
    true
  ),
  (
    gen_random_uuid(),
    'tyler.host@11vegas.com',
    'Tyler',
    'Lewis',
    '+17025554567',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Las Vegas'),
    true
  ),
  (
    gen_random_uuid(),
    'lauren.security@11vegas.com',
    'Lauren',
    'Garcia',
    '+17025555678',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Las Vegas'),
    true
  ),
  
  -- Employee accounts - Other venues
  (
    gen_random_uuid(),
    'chris.dj@11ny.com',
    'Chris',
    'Rodriguez',
    '+12125552345',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN New York'),
    true
  ),
  (
    gen_random_uuid(),
    'emily.host@11la.com',
    'Emily',
    'Lee',
    '+12135551234',
    (SELECT id FROM role_data WHERE name = 'employee'),
    (SELECT id FROM venue_data WHERE name = 'E11EVEN Los Angeles'),
    true
  )
ON CONFLICT (email) DO NOTHING;

-- Link employees to departments
WITH 
  user_data AS (
    SELECT id, email, primary_venue_id FROM users
  ),
  dept_data AS (
    SELECT d.id, d.name, d.venue_id FROM departments d
  )
INSERT INTO user_departments (user_id, department_id)
VALUES
  -- Miami employees
  (
    (SELECT id FROM user_data WHERE email = 'alex.bartender@11miami.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Bar' AND v.name = 'E11EVEN Miami')
  ),
  (
    (SELECT id FROM user_data WHERE email = 'jessica.host@11miami.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Hostess' AND v.name = 'E11EVEN Miami')
  ),
  (
    (SELECT id FROM user_data WHERE email = 'james.security@11miami.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Security' AND v.name = 'E11EVEN Miami')
  ),
  
  -- Las Vegas employees
  (
    (SELECT id FROM user_data WHERE email = 'megan.bartender@11vegas.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Bar' AND v.name = 'E11EVEN Las Vegas')
  ),
  (
    (SELECT id FROM user_data WHERE email = 'tyler.host@11vegas.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Hostess' AND v.name = 'E11EVEN Las Vegas')
  ),
  (
    (SELECT id FROM user_data WHERE email = 'lauren.security@11vegas.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Security' AND v.name = 'E11EVEN Las Vegas')
  ),
  
  -- Other venue employees
  (
    (SELECT id FROM user_data WHERE email = 'chris.dj@11ny.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'DJ' AND v.name = 'E11EVEN New York')
  ),
  (
    (SELECT id FROM user_data WHERE email = 'emily.host@11la.com'),
    (SELECT d.id FROM dept_data d 
     JOIN venues v ON d.venue_id = v.id 
     WHERE d.name = 'Hostess' AND v.name = 'E11EVEN Los Angeles')
  )
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Create schedules for employees
WITH 
  user_data AS (
    SELECT u.id, u.email, u.primary_venue_id 
    FROM users u
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'employee')
  ),
  venue_data AS (
    SELECT id, name FROM venues
  )
INSERT INTO schedules (user_id, venue_id, start_time, end_time, status)
SELECT
  u.id,
  u.primary_venue_id,
  -- Current week schedules
  date_trunc('day', NOW() + (n || ' days')::interval) + '18:00:00'::interval,
  date_trunc('day', NOW() + (n || ' days')::interval) + '02:00:00'::interval + '1 day'::interval,
  'confirmed'
FROM user_data u
CROSS JOIN generate_series(0, 6) AS n
WHERE u.email LIKE '%@11miami.com' OR u.email LIKE '%@11vegas.com'
UNION ALL
SELECT
  u.id,
  u.primary_venue_id,
  -- Next week schedules
  date_trunc('day', NOW() + '1 week'::interval + (n || ' days')::interval) + '18:00:00'::interval,
  date_trunc('day', NOW() + '1 week'::interval + (n || ' days')::interval) + '02:00:00'::interval + '1 day'::interval,
  'pending'
FROM user_data u
CROSS JOIN generate_series(0, 6) AS n
WHERE u.email LIKE '%@11miami.com' OR u.email LIKE '%@11vegas.com';

-- Create messages between users
WITH user_pairs AS (
  SELECT 
    u1.id AS sender_id, 
    u2.id AS recipient_id,
    u1.primary_venue_id,
    u1.email AS sender_email,
    u2.email AS recipient_email
  FROM users u1
  JOIN users u2 ON u1.primary_venue_id = u2.primary_venue_id AND u1.id != u2.id
  WHERE (u1.email LIKE '%@11miami.com' OR u1.email LIKE '%@11vegas.com')
    AND (u2.email LIKE '%@11miami.com' OR u2.email LIKE '%@11vegas.com')
)
INSERT INTO messages (sender_id, recipient_id, content, read, sent_at)
SELECT
  sender_id,
  recipient_id,
  CASE 
    WHEN sender_email LIKE '%owner%' AND recipient_email LIKE '%manager%' THEN 'Please review the schedule for next week'
    WHEN sender_email LIKE '%owner%' AND recipient_email LIKE '%employee%' THEN 'Great job this weekend!'
    WHEN sender_email LIKE '%manager%' AND recipient_email LIKE '%owner%' THEN 'Sales report is ready for review'
    WHEN sender_email LIKE '%manager%' AND recipient_email LIKE '%employee%' THEN 'Can you cover the shift on Friday?'
    WHEN sender_email LIKE '%employee%' AND recipient_email LIKE '%manager%' THEN 'I need to request time off next week'
    WHEN sender_email LIKE '%employee%' AND recipient_email LIKE '%employee%' THEN 'Hey, can we switch shifts on Saturday?'
    ELSE 'Hello, how are you doing?'
  END,
  CASE WHEN random() > 0.5 THEN true ELSE false END,
  NOW() - (random() * 14 || ' days')::interval
FROM user_pairs
LIMIT 50;

-- Create gratuities between employees and from managers to employees
WITH 
  employees AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.primary_venue_id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'employee'
  ),
  managers AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.primary_venue_id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name IN ('manager', 'owner')
  )
INSERT INTO gratuities (sender_id, recipient_id, amount, note, created_at)
-- Employee to employee tips
SELECT
  e1.id AS sender_id,
  e2.id AS recipient_id,
  (random() * 50 + 10)::numeric(10,2) AS amount,
  CASE 
    WHEN random() > 0.5 THEN 'Thanks for your help tonight!'
    WHEN random() > 0.5 THEN 'Great working with you!'
    WHEN random() > 0.5 THEN 'You really saved me today.'
    ELSE 'Appreciate the support!'
  END,
  NOW() - (random() * 30 || ' days')::interval
FROM employees e1
JOIN employees e2 ON e1.primary_venue_id = e2.primary_venue_id AND e1.id != e2.id
WHERE random() > 0.7
UNION ALL
-- Manager to employee tips
SELECT
  m.id AS sender_id,
  e.id AS recipient_id,
  (random() * 100 + 50)::numeric(10,2) AS amount,
  CASE 
    WHEN random() > 0.5 THEN 'Great job this weekend!'
    WHEN random() > 0.5 THEN 'Excellent customer service!'
    WHEN random() > 0.5 THEN 'Thanks for staying late.'
    ELSE 'Keep up the good work!'
  END,
  NOW() - (random() * 30 || ' days')::interval
FROM managers m
JOIN employees e ON m.primary_venue_id = e.primary_venue_id
WHERE random() > 0.5
LIMIT 100;

-- Refresh the schema cache
SELECT refresh_schema_cache();

COMMIT; 