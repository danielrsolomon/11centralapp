-- SQL functions for enhanced execute_sql tool
-- These functions provide support for multi-statement SQL execution,
-- transaction handling, and automated schema cache refreshing.

-- Function to begin a transaction
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN;
END;
$$;

-- Function to commit a transaction
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  COMMIT;
END;
$$;

-- Function to rollback a transaction
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  ROLLBACK;
END;
$$;

-- Function to refresh the PostgREST schema cache
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

-- Enhanced execute_custom_sql function with better error handling
CREATE OR REPLACE FUNCTION execute_custom_sql(sql_string TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
  query_type TEXT;
  affected_count INTEGER;
  error_detail TEXT;
  error_hint TEXT;
  error_context TEXT;
  schema_altered BOOLEAN := FALSE;
BEGIN
  -- Determine query type
  query_type := CASE
    WHEN sql_string ~* '^\s*(SELECT|WITH|TABLE|VALUES)\b' THEN 'SELECT'
    WHEN sql_string ~* '^\s*INSERT\b' THEN 'INSERT'
    WHEN sql_string ~* '^\s*UPDATE\b' THEN 'UPDATE'
    WHEN sql_string ~* '^\s*DELETE\b' THEN 'DELETE'
    WHEN sql_string ~* '^\s*(CREATE|ALTER|DROP|COMMENT)\b' THEN 'DDL'
    ELSE 'OTHER'
  END;
  
  -- Check if this is a schema-altering query
  schema_altered := query_type = 'DDL';

  -- Execute the query
  IF query_type = 'SELECT' THEN
    EXECUTE sql_string INTO result;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
  ELSE
    EXECUTE sql_string;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    result := '[]'::jsonb;
  END IF;

  -- Refresh schema cache if needed
  IF schema_altered THEN
    PERFORM refresh_schema_cache();
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'data', COALESCE(result, '[]'::jsonb),
    'count', affected_count,
    'query_type', query_type,
    'schema_altered', schema_altered
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Capture detailed error information
    GET STACKED DIAGNOSTICS 
      error_detail = PG_EXCEPTION_DETAIL,
      error_hint = PG_EXCEPTION_HINT,
      error_context = PG_EXCEPTION_CONTEXT;
    
    -- Return error information
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'code', SQLSTATE,
      'detail', COALESCE(error_detail, ''),
      'hint', COALESCE(error_hint, ''),
      'context', COALESCE(error_context, ''),
      'query_type', query_type
    );
END;
$$;

-- Function to analyze a query for potential optimizations
CREATE OR REPLACE FUNCTION analyze_query(sql_string TEXT) 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  explain_result TEXT;
  warnings JSONB := '[]'::jsonb;
  recommendations JSONB := '[]'::jsonb;
BEGIN
  -- Check for obviously problematic patterns
  IF sql_string ~* 'SELECT \*' THEN
    warnings := warnings || jsonb_build_object(
      'type', 'SELECT *',
      'message', 'Using SELECT * can affect performance by retrieving unnecessary columns'
    );
    recommendations := recommendations || jsonb_build_object(
      'type', 'SELECT *',
      'message', 'Specify only needed columns'
    );
  END IF;
  
  IF sql_string ~* 'WHERE\s+[a-zA-Z0-9_]+\s*LIKE\s*''%' THEN
    warnings := warnings || jsonb_build_object(
      'type', 'Leading wildcard',
      'message', 'Leading wildcard LIKE clauses cannot use indexes efficiently'
    );
    recommendations := recommendations || jsonb_build_object(
      'type', 'Leading wildcard',
      'message', 'Avoid leading wildcards or use full-text search instead'
    );
  END IF;
  
  -- Get EXPLAIN output for the query
  BEGIN
    EXECUTE 'EXPLAIN (FORMAT JSON) ' || sql_string INTO explain_result;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'message', 'Query cannot be analyzed: ' || SQLERRM,
        'sql', sql_string
      );
  END;
  
  -- Return analysis results
  RETURN jsonb_build_object(
    'status', 'success',
    'explain', explain_result::jsonb,
    'warnings', warnings,
    'recommendations', recommendations,
    'sql', sql_string
  );
END;
$$;

-- Test function to make sure everything is set up correctly
CREATE OR REPLACE FUNCTION test_enhanced_sql() 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  test_results JSONB := '{}'::jsonb;
BEGIN
  -- Test transaction functions
  BEGIN
    PERFORM begin_transaction();
    PERFORM commit_transaction();
    test_results := jsonb_set(test_results, '{transaction_functions}', '"success"');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := jsonb_set(test_results, '{transaction_functions}', '"failed: ' || SQLERRM || '"');
  END;
  
  -- Test schema cache refresh function
  BEGIN
    PERFORM refresh_schema_cache();
    test_results := jsonb_set(test_results, '{schema_cache_refresh}', '"success"');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := jsonb_set(test_results, '{schema_cache_refresh}', '"failed: ' || SQLERRM || '"');
  END;
  
  -- Test execute_custom_sql function with a simple query
  BEGIN
    PERFORM execute_custom_sql('SELECT 1 as test');
    test_results := jsonb_set(test_results, '{execute_custom_sql}', '"success"');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := jsonb_set(test_results, '{execute_custom_sql}', '"failed: ' || SQLERRM || '"');
  END;
  
  -- Test analyze_query function
  BEGIN
    PERFORM analyze_query('SELECT * FROM pg_catalog.pg_tables LIMIT 1');
    test_results := jsonb_set(test_results, '{analyze_query}', '"success"');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := jsonb_set(test_results, '{analyze_query}', '"failed: ' || SQLERRM || '"');
  END;
  
  RETURN jsonb_build_object(
    'status', 'complete',
    'tests', test_results
  );
END;
$$; 