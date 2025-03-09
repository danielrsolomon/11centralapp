-- Make sure role column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Add an index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set all existing users to admin for testing purposes
-- In production, you would be more selective about who gets admin privileges
UPDATE users SET role = 'admin' WHERE role IS NULL OR role = 'user';

-- Log the update
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  RAISE NOTICE 'Set % users to admin role', admin_count;
END $$; 