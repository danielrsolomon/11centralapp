-- Enhanced execute_raw_query function with proper error handling and parameter binding
CREATE OR REPLACE FUNCTION execute_raw_query(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  param_values text[];
  i integer;
  dynamic_query text;
  error_response jsonb;
BEGIN
  -- Convert jsonb array to text array for parameters
  IF jsonb_typeof(query_params) = 'array' THEN
    SELECT array_agg(value) INTO param_values FROM jsonb_array_elements_text(query_params);
  ELSE
    -- Handle case when parameters aren't passed as an array
    error_response := jsonb_build_object(
      'error', 'Invalid parameters format. Parameters must be a JSON array.',
      'status', 'error'
    );
    RETURN error_response;
  END IF;

  -- Set up the dynamic query to execute
  dynamic_query := query_text;
  
  BEGIN
    -- For non-SELECT queries (INSERT, UPDATE, DELETE)
    IF NOT (lower(trim(query_text)) LIKE 'select%') THEN
      -- Execute non-SELECT query and return affected row count
      EXECUTE dynamic_query USING VARIADIC param_values;
      GET DIAGNOSTICS i = ROW_COUNT;
      result := jsonb_build_object('affected_rows', i, 'status', 'success');
    ELSE
      -- For SELECT queries, wrap in json_agg to aggregate results
      EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) AS t', dynamic_query) 
        USING VARIADIC param_values
        INTO result;
    END IF;
    
    RETURN result;
  EXCEPTION 
    WHEN OTHERS THEN
      error_response := jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'query', query_text,
        'status', 'error'
      );
      RETURN error_response;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_raw_query(text, jsonb) TO authenticated;

COMMENT ON FUNCTION execute_raw_query IS 
  'Executes a raw SQL query with parameters. For security reasons, this function should only be called from server-side code.'; 