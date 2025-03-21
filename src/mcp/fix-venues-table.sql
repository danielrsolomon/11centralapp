-- Fix venues table structure

-- Add name column if it doesn't exist
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
END $$;

-- Add address column if it doesn't exist
DO $$
BEGIN
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

-- Insert a test record if the table is empty
DO $$
DECLARE
  venue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO venue_count FROM venues;
  
  IF venue_count = 0 THEN
    INSERT INTO venues (name, address)
    VALUES ('E11EVEN Miami', '29 NE 11th St, Miami, FL 33132');
    RAISE NOTICE 'Inserted test record into venues table';
  ELSE
    RAISE NOTICE 'venues table already has records, skipping test insert';
  END IF;
END $$;

-- Display the current structure of the venues table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'venues'
ORDER BY 
  ordinal_position;

-- Display the current content of the venues table
SELECT * FROM venues; 