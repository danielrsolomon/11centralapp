-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Create an index on the role column for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comments for better documentation
COMMENT ON COLUMN users.role IS 'User role: user, admin, etc.';

-- Create a function to make a user an admin
CREATE OR REPLACE FUNCTION make_user_admin(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users SET role = 'admin' WHERE id = user_id;
END;
$$ LANGUAGE plpgsql; 