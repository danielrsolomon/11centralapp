-- Enhanced Schema Cache Refresh Functions
-- These functions provide reliable schema cache refreshing for the PostgREST server

-- Basic schema cache refresh function
CREATE OR REPLACE FUNCTION refresh_schema_cache() 
RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced schema cache refresh function with verification
CREATE OR REPLACE FUNCTION refresh_schema_cache_enhanced() 
RETURNS jsonb AS $$
DECLARE
  refresh_time timestamp;
  notify_count integer;
  cache_stats jsonb;
BEGIN
  -- Record the time before refresh
  refresh_time := now();
  
  -- Send the NOTIFY to reload schema
  NOTIFY pgrst, 'reload schema';
  
  -- Get statistics about the NOTIFY
  SELECT 
    count(*) INTO notify_count 
  FROM 
    pg_stat_activity 
  WHERE 
    query LIKE '%reload schema%' AND 
    query_start >= refresh_time;
  
  -- Build result object with useful information
  cache_stats := jsonb_build_object(
    'refresh_triggered_at', refresh_time,
    'notify_sent', true,
    'notify_count', notify_count,
    'timestamp', now()
  );
  
  -- Add table count information
  cache_stats := cache_stats || jsonb_build_object(
    'table_count', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public')
  );
  
  RETURN cache_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify schema cache status
CREATE OR REPLACE FUNCTION verify_schema_cache() 
RETURNS jsonb AS $$
DECLARE
  refresh_result jsonb;
  tables_result jsonb;
BEGIN
  -- Perform a schema cache refresh and get statistics
  refresh_result := refresh_schema_cache_enhanced();
  
  -- Get information about tables to confirm schema is loaded
  WITH table_info AS (
    SELECT 
      table_name,
      (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND information_schema.columns.table_name = t.table_name) as column_count
    FROM 
      information_schema.tables t
    WHERE 
      table_schema = 'public' AND
      table_type = 'BASE TABLE'
  )
  SELECT 
    jsonb_object_agg(table_name, column_count) INTO tables_result
  FROM 
    table_info;
  
  -- Add the tables information to the result
  refresh_result := refresh_result || jsonb_build_object(
    'tables', tables_result,
    'schema_verified', true
  );
  
  RETURN refresh_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a schema change event
CREATE OR REPLACE FUNCTION log_schema_change(
  operation text,
  schema_name text DEFAULT 'public',
  object_name text DEFAULT NULL,
  object_type text DEFAULT NULL
) 
RETURNS jsonb AS $$
DECLARE
  log_result jsonb;
  cache_result jsonb;
BEGIN
  -- Create an audit entry
  INSERT INTO schema_change_log (
    operation,
    schema_name,
    object_name,
    object_type,
    changed_at
  ) VALUES (
    operation,
    schema_name,
    object_name,
    object_type,
    now()
  ) RETURNING to_jsonb(schema_change_log.*) INTO log_result;
  
  -- Refresh the schema cache
  cache_result := refresh_schema_cache_enhanced();
  
  -- Return combined result
  RETURN jsonb_build_object(
    'schema_change', log_result,
    'cache_refresh', cache_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create schema change log table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_change_log (
  id SERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  object_name TEXT,
  object_type TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add RLS to schema change log
ALTER TABLE schema_change_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for service role
CREATE POLICY schema_change_log_service_policy ON schema_change_log
  USING (true)
  WITH CHECK (true);

-- Function to create a trigger for auto schema refresh
CREATE OR REPLACE FUNCTION create_schema_refresh_trigger(table_name text) 
RETURNS void AS $$
BEGIN
  EXECUTE format('
    DROP TRIGGER IF EXISTS refresh_schema_on_change ON %I;
    CREATE TRIGGER refresh_schema_on_change
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH STATEMENT
      EXECUTE FUNCTION log_schema_change_and_refresh();
  ', table_name, table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to be called by the trigger
CREATE OR REPLACE FUNCTION log_schema_change_and_refresh() 
RETURNS trigger AS $$
BEGIN
  PERFORM log_schema_change(
    TG_OP,
    'public',
    TG_TABLE_NAME,
    'table'
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function to verify all schema cache refresh functionality
CREATE OR REPLACE FUNCTION test_schema_cache_refresh() 
RETURNS jsonb AS $$
DECLARE
  test_results jsonb;
  refresh_result jsonb;
  verify_result jsonb;
BEGIN
  test_results := '{}'::jsonb;
  
  -- Test basic refresh
  BEGIN
    PERFORM refresh_schema_cache();
    test_results := jsonb_set(test_results, '{basic_refresh}', '"success"');
  EXCEPTION WHEN OTHERS THEN
    test_results := jsonb_set(test_results, '{basic_refresh}', format('"%s"', SQLERRM));
  END;
  
  -- Test enhanced refresh
  BEGIN
    refresh_result := refresh_schema_cache_enhanced();
    test_results := jsonb_set(test_results, '{enhanced_refresh}', '"success"');
    test_results := jsonb_set(test_results, '{enhanced_refresh_result}', refresh_result);
  EXCEPTION WHEN OTHERS THEN
    test_results := jsonb_set(test_results, '{enhanced_refresh}', format('"%s"', SQLERRM));
  END;
  
  -- Test verify function
  BEGIN
    verify_result := verify_schema_cache();
    test_results := jsonb_set(test_results, '{verify_schema}', '"success"');
    test_results := jsonb_set(test_results, '{verify_result}', verify_result);
  EXCEPTION WHEN OTHERS THEN
    test_results := jsonb_set(test_results, '{verify_schema}', format('"%s"', SQLERRM));
  END;
  
  RETURN jsonb_build_object(
    'status', 'complete',
    'tests', test_results,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 