-- Sample data creation script for all tables
-- This will populate the database with sample data for testing

-- Clear existing data if needed (commented out for safety - uncomment if needed)
-- TRUNCATE roles, departments, venues, users, gratuities, schedules, messages CASCADE;

-- Sample roles
INSERT INTO roles (id, name, description)
VALUES
  (gen_random_uuid(), 'SuperAdmin', 'Super administrator with full system access'),
  (gen_random_uuid(), 'Admin', 'Administrator with venue-specific access'),
  (gen_random_uuid(), 'Manager', 'Venue manager with management capabilities'),
  (gen_random_uuid(), 'Staff', 'Regular staff member'),
  (gen_random_uuid(), 'Bartender', 'Bartender role'),
  (gen_random_uuid(), 'Server', 'Server role'),
  (gen_random_uuid(), 'Security', 'Security personnel')
ON CONFLICT (name) DO NOTHING;

-- Sample departments
INSERT INTO departments (id, name, description)
VALUES
  (gen_random_uuid(), 'Management', 'Management team'),
  (gen_random_uuid(), 'Bar', 'Bar staff'),
  (gen_random_uuid(), 'Service', 'Service staff'),
  (gen_random_uuid(), 'Kitchen', 'Kitchen staff'),
  (gen_random_uuid(), 'Security', 'Security team'),
  (gen_random_uuid(), 'VIP Services', 'VIP hosting and bottle service')
ON CONFLICT (name) DO NOTHING;

-- Sample venues
INSERT INTO venues (id, name, address)
VALUES
  (gen_random_uuid(), 'E11EVEN Miami', '29 NE 11th St, Miami, FL 33132'),
  (gen_random_uuid(), 'LIV Miami', '4441 Collins Ave, Miami Beach, FL 33140'),
  (gen_random_uuid(), 'Marquee New York', '289 10th Ave, New York, NY 10001'),
  (gen_random_uuid(), 'XS Las Vegas', '3131 Las Vegas Blvd S, Las Vegas, NV 89109'),
  (gen_random_uuid(), 'Omnia Las Vegas', '3570 Las Vegas Blvd S, Las Vegas, NV 89109')
ON CONFLICT (name) DO NOTHING;

-- Sample schedules (if table exists)
DO $$
DECLARE
  venue_ids uuid[];
BEGIN
  -- Get existing venue IDs
  SELECT array_agg(id) INTO venue_ids FROM venues LIMIT 5;

  -- Only proceed if venues exist and schedules table exists
  IF array_length(venue_ids, 1) > 0 AND EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'schedules'
  ) THEN
    -- Insert sample schedules
    INSERT INTO schedules (id, venue_id, day_of_week, open_time, close_time)
    SELECT 
      gen_random_uuid(),
      venue_ids[1 + (i % array_length(venue_ids, 1))],
      CASE 
        WHEN i % 7 = 0 THEN 'Monday'
        WHEN i % 7 = 1 THEN 'Tuesday'
        WHEN i % 7 = 2 THEN 'Wednesday'
        WHEN i % 7 = 3 THEN 'Thursday'
        WHEN i % 7 = 4 THEN 'Friday'
        WHEN i % 7 = 5 THEN 'Saturday'
        ELSE 'Sunday'
      END,
      CASE 
        WHEN i % 7 < 4 THEN '18:00:00'::time
        ELSE '20:00:00'::time
      END,
      CASE 
        WHEN i % 7 < 4 THEN '02:00:00'::time
        ELSE '04:00:00'::time
      END
    FROM generate_series(0, 6) i
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Sample gratuities (if table exists)
DO $$
DECLARE
  venue_ids uuid[];
BEGIN
  -- Get existing venue IDs
  SELECT array_agg(id) INTO venue_ids FROM venues LIMIT 5;

  -- Only proceed if venues exist and gratuities table exists
  IF array_length(venue_ids, 1) > 0 AND EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gratuities'
  ) THEN
    -- Insert sample gratuities
    INSERT INTO gratuities (id, venue_id, amount, date, description)
    SELECT 
      gen_random_uuid(),
      venue_ids[1 + (i % array_length(venue_ids, 1))],
      (random() * 1000)::numeric(10,2),
      current_date - (i % 30),
      'Sample gratuity record ' || i
    FROM generate_series(1, 50) i
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Sample messages (if table exists)
DO $$
DECLARE
  venue_ids uuid[];
BEGIN
  -- Get existing venue IDs
  SELECT array_agg(id) INTO venue_ids FROM venues LIMIT 5;

  -- Only proceed if venues exist and messages table exists
  IF array_length(venue_ids, 1) > 0 AND EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    -- Insert sample messages
    INSERT INTO messages (id, venue_id, content, sender, recipient, sent_at)
    SELECT 
      gen_random_uuid(),
      venue_ids[1 + (i % array_length(venue_ids, 1))],
      'Sample message content ' || i,
      'Sender ' || (i % 5),
      'Recipient ' || (i % 5),
      current_timestamp - (i || ' hours')::interval
    FROM generate_series(1, 30) i
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema'; 