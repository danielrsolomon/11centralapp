-- This script will fix the venues table structure

-- Make sure the venues table exists first
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venues' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE venues ADD COLUMN name TEXT;
    RAISE NOTICE 'Added name column to venues table';
  ELSE
    RAISE NOTICE 'name column already exists in venues table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venues' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE venues ADD COLUMN address TEXT;
    RAISE NOTICE 'Added address column to venues table';
  ELSE
    RAISE NOTICE 'address column already exists in venues table';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "venues_select_policy" ON venues;
CREATE POLICY "venues_select_policy" ON venues
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venues_insert_policy" ON venues;
CREATE POLICY "venues_insert_policy" ON venues
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "venues_update_policy" ON venues;
CREATE POLICY "venues_update_policy" ON venues
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "venues_delete_policy" ON venues;
CREATE POLICY "venues_delete_policy" ON venues
  FOR DELETE USING (true);

-- Insert test data if table is empty
INSERT INTO venues (name, address)
SELECT 'E11EVEN Miami', '29 NE 11th St, Miami, FL 33132'
WHERE NOT EXISTS (SELECT 1 FROM venues LIMIT 1);

-- Display the results
SELECT * FROM venues; 