-- Ensure user_preferences table exists
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_weekly_newsletter boolean DEFAULT false,
  email_account_notifications boolean DEFAULT true,
  email_marketing_notifications boolean DEFAULT false,
  text_account_notifications boolean DEFAULT false,
  text_booking_confirmations boolean DEFAULT true,
  text_marketing_notifications boolean DEFAULT false,
  app_new_messages boolean DEFAULT true,
  app_event_reminders boolean DEFAULT true,
  app_reservation_updates boolean DEFAULT true,
  app_promotional_alerts boolean DEFAULT false,
  content_creation boolean DEFAULT false,
  content_editing boolean DEFAULT false,
  content_deletion boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Ensure RLS is enabled
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Check if trigger function exists
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for user_preferences
DROP TRIGGER IF EXISTS set_timestamp ON user_preferences;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create policies for user_preferences if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'Users can view their own preferences'
  ) THEN
    CREATE POLICY "Users can view their own preferences"
      ON user_preferences FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'Users can update their own preferences'
  ) THEN
    CREATE POLICY "Users can update their own preferences"
      ON user_preferences FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'Users can insert their own preferences'
  ) THEN
    CREATE POLICY "Users can insert their own preferences"
      ON user_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Try to handle the case where preferences column exists in the users table
-- Since the column might not exist, we need to use dynamic SQL
DO $$
DECLARE
  preferences_exists BOOLEAN;
BEGIN
  -- Check if preferences column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'preferences'
  ) INTO preferences_exists;
  
  -- If preferences column exists, we'll try to migrate data
  IF preferences_exists THEN
    -- Create a migration function to handle JSONB data safely
    CREATE OR REPLACE FUNCTION migrate_preferences() RETURNS VOID AS $$
    DECLARE
      user_record RECORD;
    BEGIN
      FOR user_record IN 
        SELECT id, preferences FROM users 
        WHERE preferences IS NOT NULL
      LOOP
        -- Insert preference data for users who don't have a preference record yet
        INSERT INTO user_preferences (
          user_id, 
          content_creation, 
          content_editing, 
          content_deletion
        )
        VALUES (
          user_record.id,
          COALESCE((user_record.preferences->'content_creation')::boolean, false),
          COALESCE((user_record.preferences->'content_editing')::boolean, false),
          COALESCE((user_record.preferences->'content_deletion')::boolean, false)
        )
        ON CONFLICT (user_id) DO NOTHING;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Execute migration function
    PERFORM migrate_preferences();
    
    -- Drop the function after use
    DROP FUNCTION migrate_preferences();
  END IF;
END $$; 