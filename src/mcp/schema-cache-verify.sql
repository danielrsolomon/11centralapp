-- Schema Cache Refresh Verification
-- This script checks the schema cache refresh functionality and provides troubleshooting steps

-- 1. Verify that the basic refresh function is registered
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache'
) AS basic_refresh_exists;

-- 2. Verify that the enhanced refresh function is registered
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache_enhanced'
) AS enhanced_refresh_exists;

-- 3. Check the function definition for the basic refresh
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'refresh_schema_cache';

-- 4. Check if the NOTIFY permission is granted to the current role
DO $$
BEGIN
  -- Attempt to send a NOTIFY and catch any permission errors
  BEGIN
    NOTIFY some_channel;
    RAISE NOTICE 'Current role has NOTIFY permission';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Current role does not have NOTIFY permission';
  END;
END $$;

-- 5. Check if the PostgREST notification channel exists
SELECT EXISTS (
  SELECT 1 FROM pg_listening_channels() WHERE channel = 'pgrst'
) AS pgrst_channel_exists;

-- 6. Test the basic refresh function
DO $$
BEGIN
  PERFORM refresh_schema_cache();
  RAISE NOTICE 'refresh_schema_cache() executed successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error executing refresh_schema_cache(): %', SQLERRM;
END $$;

-- 7. Test the enhanced refresh function
SELECT refresh_schema_cache_enhanced();

-- 8. Test schema verification
SELECT verify_schema_cache();

-- 9. Create a test table to check schema refresh
DROP TABLE IF EXISTS schema_refresh_test;
CREATE TABLE schema_refresh_test (
  id SERIAL PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Add a column to test schema refresh
DO $$
BEGIN
  ALTER TABLE schema_refresh_test ADD COLUMN test_column TEXT;
  
  -- Log the schema change
  PERFORM log_schema_change(
    'ALTER',
    'public',
    'schema_refresh_test',
    'table'
  );
  
  RAISE NOTICE 'Added test_column to schema_refresh_test table and logged the change';
END $$;

-- 11. Check schema change log
SELECT * FROM schema_change_log
ORDER BY changed_at DESC
LIMIT 5;

-- 12. Add a trigger for automatic schema refresh
SELECT create_schema_refresh_trigger('schema_refresh_test');

-- 13. Test trigger by making a change
INSERT INTO schema_refresh_test (name) VALUES ('Test entry to trigger refresh');

-- 14. Run comprehensive test
SELECT test_schema_cache_refresh();

-- Troubleshooting section
DO $$
DECLARE
  problem_detected BOOLEAN := false;
  problems TEXT := '';
BEGIN
  -- Check if functions exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache') THEN
    problem_detected := true;
    problems := problems || '- refresh_schema_cache function is missing.' || E'\n';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache_enhanced') THEN
    problem_detected := true;
    problems := problems || '- refresh_schema_cache_enhanced function is missing.' || E'\n';
  END IF;
  
  -- Check if log table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schema_change_log') THEN
    problem_detected := true;
    problems := problems || '- schema_change_log table is missing.' || E'\n';
  END IF;
  
  -- Try to detect if PostgREST is running and listening
  IF NOT EXISTS (SELECT 1 FROM pg_listening_channels() WHERE channel = 'pgrst') THEN
    problem_detected := true;
    problems := problems || '- PostgREST is not running or not listening to the pgrst channel.' || E'\n';
  END IF;
  
  -- Output results
  IF problem_detected THEN
    RAISE NOTICE 'SCHEMA CACHE REFRESH PROBLEMS DETECTED:';
    RAISE NOTICE '%', problems;
    RAISE NOTICE 'TROUBLESHOOTING SUGGESTIONS:';
    RAISE NOTICE '1. Make sure PostgREST is running with the --schema-cache-size option (non-zero)';
    RAISE NOTICE '2. Make sure the refresh_schema_cache function is deployed correctly';
    RAISE NOTICE '3. Check database permissions for the NOTIFY command';
    RAISE NOTICE '4. Verify PostgREST connection string has correct permissions';
    RAISE NOTICE '5. Try redeploying schema-cache-refresh.sql using:';
    RAISE NOTICE '   npm run mcp:deploy-schema-cache';
  ELSE
    RAISE NOTICE 'Schema cache refresh system appears to be functioning correctly.';
  END IF;
END $$; 