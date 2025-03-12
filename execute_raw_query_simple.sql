-- Simple execute_raw_query function that doesn't use parameter binding
CREATE OR REPLACE FUNCTION execute_raw_query(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Just execute the query directly for SELECT queries
  IF lower(trim(query_text)) LIKE 'select%' THEN
    EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) AS t', query_text) INTO result;
    RETURN result;
  ELSE
    -- For non-SELECT queries, execute and return affected rows
    EXECUTE query_text;
    RETURN jsonb_build_object('affected_rows', 1, 'status', 'success');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'query', query_text,
    'status', 'error'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_raw_query(text, jsonb) TO authenticated;

COMMENT ON FUNCTION execute_raw_query IS 
  'Executes a raw SQL query. For security reasons, this function should only be called from server-side code.';

-- Test the function
-- SELECT * FROM execute_raw_query('SELECT ''Hello World'' as greeting'); 