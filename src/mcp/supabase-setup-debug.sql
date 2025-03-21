-- Additional SQL functions for debugging database operations

-- Function to get column information for a table
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT 
    columns.column_name::TEXT,
    columns.data_type::TEXT,
    (columns.is_nullable = 'YES')::BOOLEAN
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = p_table_name
  ORDER BY ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION get_table_columns TO service_role;

-- Function to execute arbitrary SQL (SERVICE ROLE ONLY)
CREATE OR REPLACE FUNCTION execute_sql(query TEXT, params JSON DEFAULT '[]'::JSON)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Execute the query with parameters and capture the result as JSON
  EXECUTE format('WITH result AS (%s) SELECT json_agg(result) FROM result', query)
  INTO result
  USING params;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION execute_sql TO service_role;

-- Function to get detailed table information
CREATE OR REPLACE FUNCTION get_detailed_table_info(p_table_name TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH table_info AS (
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      tc.constraint_type,
      cc.check_clause,
      kcu.constraint_name
    FROM information_schema.columns c
    LEFT JOIN information_schema.constraint_column_usage ccu 
      ON c.table_name = ccu.table_name AND c.column_name = ccu.column_name
    LEFT JOIN information_schema.table_constraints tc 
      ON ccu.constraint_name = tc.constraint_name
    LEFT JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.check_constraints cc 
      ON tc.constraint_name = cc.constraint_name
    WHERE c.table_schema = 'public' 
    AND c.table_name = p_table_name
  )
  SELECT json_agg(table_info)
  INTO result
  FROM table_info;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION get_detailed_table_info TO service_role;

-- Function to safely insert data with column validation
CREATE OR REPLACE FUNCTION safe_insert(
  p_table_name TEXT,
  p_data JSON,
  p_bypass_validation BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  valid_columns TEXT[];
  filtered_data JSON := '{}';
  final_data JSON;
  column_name TEXT;
  insert_result JSON;
  error_info JSON;
  column_exists BOOLEAN;
  column_cursor refcursor;
  column_record record;
BEGIN
  -- Get valid columns for the table
  SELECT array_agg(column_name::TEXT)
  INTO valid_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = p_table_name;
  
  IF valid_columns IS NULL THEN
    error_info := json_build_object(
      'error', 'Table not found or no columns available',
      'table', p_table_name
    );
    RETURN json_build_object('success', FALSE, 'info', error_info);
  END IF;
  
  -- Filter the input data to only include valid columns
  final_data := p_data;
  
  IF NOT p_bypass_validation THEN
    filtered_data := '{}';
    FOR column_name, column_value IN SELECT * FROM json_each(p_data)
    LOOP
      column_exists := column_name = ANY(valid_columns);
      IF column_exists THEN
        filtered_data := filtered_data || json_build_object(column_name, column_value);
      END IF;
    END LOOP;
    final_data := filtered_data;
  END IF;
  
  -- Insert the filtered data
  BEGIN
    EXECUTE format(
      'WITH inserted AS (
        INSERT INTO %I SELECT * FROM json_populate_record(null::%I, $1) RETURNING *
      ) 
      SELECT json_agg(inserted) FROM inserted',
      p_table_name, p_table_name
    ) INTO insert_result USING final_data;
    
    RETURN json_build_object(
      'success', TRUE, 
      'data', COALESCE(insert_result, '[]'),
      'columns_used', (SELECT array_agg(key) FROM json_object_keys(final_data) key)
    );
  EXCEPTION WHEN OTHERS THEN
    error_info := json_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'table', p_table_name,
      'attempted_data', final_data,
      'valid_columns', valid_columns
    );
    RETURN json_build_object('success', FALSE, 'info', error_info);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION safe_insert TO service_role; 