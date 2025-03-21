-- Add 'order' column to programs table if it doesn't exist
ALTER TABLE programs ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;

-- Update any existing programs to have a sequential order
WITH indexed_programs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS new_order
  FROM programs
)
UPDATE programs
SET "order" = indexed_programs.new_order
FROM indexed_programs
WHERE programs.id = indexed_programs.id; 