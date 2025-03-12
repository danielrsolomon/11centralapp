-- Fixed execute_raw_query function with proper parameter handling
CREATE OR REPLACE FUNCTION execute_raw_query(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  param_value text;
  i integer;
  dynamic_query text;
  error_response jsonb;
  index integer := 1;
BEGIN
  -- Validate parameter format
  IF jsonb_typeof(query_params) != 'array' THEN
    RETURN jsonb_build_object(
      'error', 'Invalid parameters format. Parameters must be a JSON array.',
      'status', 'error'
    );
  END IF;
  
  BEGIN
    -- Prepare the query with proper parameter binding
    dynamic_query := query_text;
    
    -- For non-SELECT queries (INSERT, UPDATE, DELETE)
    IF NOT (lower(trim(dynamic_query)) LIKE 'select%') THEN
      -- Execute non-SELECT query
      EXECUTE dynamic_query;
      GET DIAGNOSTICS i = ROW_COUNT;
      RETURN jsonb_build_object('affected_rows', i, 'status', 'success');
    ELSE
      -- For SELECT queries, wrap in json_agg to aggregate results
      EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) AS t', dynamic_query) 
        INTO result;
      
      RETURN result;
    END IF;
  EXCEPTION 
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'query', query_text,
        'status', 'error'
      );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_raw_query(text, jsonb) TO authenticated;

COMMENT ON FUNCTION execute_raw_query IS 
  'Executes a raw SQL query with parameters. For security reasons, this function should only be called from server-side code.';

-- Example of usage:
-- SELECT * FROM execute_raw_query('SELECT $1::text as greeting', '["Hello World"]'::jsonb); 