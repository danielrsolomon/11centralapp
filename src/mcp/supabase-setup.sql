-- Grant full schema privileges to service_role
GRANT ALL PRIVILEGES ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Create helper function to create tables if they don't exist
CREATE OR REPLACE FUNCTION create_table_if_not_exists(table_name TEXT) 
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = table_name AND schemaname = 'public') THEN
    EXECUTE format('CREATE TABLE %I (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())', table_name);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION create_table_if_not_exists TO service_role;

-- Create helper function to add columns to tables
CREATE OR REPLACE FUNCTION add_column_if_not_exists(table_name TEXT, column_name TEXT, column_type TEXT) 
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = add_column_if_not_exists.table_name 
    AND column_name = add_column_if_not_exists.column_name
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_type);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION add_column_if_not_exists TO service_role;

-- Create helper function to get all tables in public schema
CREATE OR REPLACE FUNCTION get_all_tables() 
RETURNS TABLE(tablename TEXT) AS $$
BEGIN
  RETURN QUERY SELECT pg_tables.tablename::TEXT FROM pg_tables WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION get_all_tables TO service_role; 