-- SQL functions for enhanced debugging of database operations
-- These functions help with table inspection, column validation, and safer inserts

-- Function to get table columns and their types
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (
    column_name TEXT,
    data_type TEXT,
    is_nullable BOOLEAN,
    column_default TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::TEXT,
        c.data_type::TEXT,
        (c.is_nullable = 'YES')::BOOLEAN,
        c.column_default::TEXT
    FROM 
        information_schema.columns c
    WHERE 
        c.table_schema = 'public' AND
        c.table_name = p_table_name
    ORDER BY 
        c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute SQL dynamically with parameters (for debugging)
CREATE OR REPLACE FUNCTION execute_sql(query TEXT, params JSON DEFAULT '[]'::JSON)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    param_values TEXT[];
    i INTEGER;
BEGIN
    -- Convert JSON array to text array
    IF params IS NOT NULL AND jsonb_array_length(params::JSONB) > 0 THEN
        param_values := ARRAY[]::TEXT[];
        FOR i IN 0..jsonb_array_length(params::JSONB)-1 LOOP
            param_values := param_values || params::JSONB->>i;
        END LOOP;
    END IF;
    
    -- Execute the query with parameters if provided
    IF param_values IS NOT NULL THEN
        EXECUTE query INTO result USING VARIADIC param_values;
    ELSE
        EXECUTE query INTO result;
    END IF;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'state', SQLSTATE,
        'query', query
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed information about a table
CREATE OR REPLACE FUNCTION get_detailed_table_info(p_table_name TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Get basic column information
    WITH columns AS (
        SELECT
            c.column_name,
            c.data_type,
            (c.is_nullable = 'YES') AS is_nullable,
            c.column_default,
            c.ordinal_position
        FROM
            information_schema.columns c
        WHERE
            c.table_schema = 'public' AND
            c.table_name = p_table_name
        ORDER BY
            c.ordinal_position
    ),
    
    -- Get constraint information
    constraints AS (
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name
        FROM
            information_schema.table_constraints tc
        JOIN
            information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE
            tc.table_schema = 'public' AND
            tc.table_name = p_table_name
    ),
    
    -- Check if RLS is enabled
    rls_check AS (
        SELECT
            rowsecurity
        FROM
            pg_tables
        WHERE
            schemaname = 'public' AND
            tablename = p_table_name
    )
    
    -- Combine all information into a JSON result
    SELECT
        jsonb_build_object(
            'table_name', p_table_name,
            'columns', jsonb_agg(
                jsonb_build_object(
                    'name', c.column_name,
                    'type', c.data_type,
                    'nullable', c.is_nullable,
                    'default', c.column_default,
                    'position', c.ordinal_position,
                    'constraints', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'name', cs.constraint_name,
                                'type', cs.constraint_type
                            )
                        )
                        FROM constraints cs
                        WHERE cs.column_name = c.column_name
                    )
                )
                ORDER BY c.ordinal_position
            ),
            'has_rls', (SELECT rowsecurity FROM rls_check),
            'exists', TRUE
        ) INTO result
    FROM
        columns c;
    
    -- If no columns found, the table doesn't exist
    IF result IS NULL THEN
        RETURN jsonb_build_object(
            'table_name', p_table_name,
            'exists', FALSE,
            'error', 'Table does not exist or has no columns'
        );
    END IF;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'table_name', p_table_name,
        'exists', FALSE,
        'error', SQLERRM,
        'state', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely insert data with validation
CREATE OR REPLACE FUNCTION safe_insert(
    p_table_name TEXT,
    p_data JSONB,
    p_bypass_validation BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    valid_columns TEXT[];
    data_columns TEXT[];
    missing_columns TEXT[];
    invalid_columns TEXT[];
    sql_cmd TEXT;
    column_names TEXT;
    column_values TEXT;
    result JSONB;
    column_data RECORD;
BEGIN
    -- Get valid columns for this table
    SELECT array_agg(column_name) INTO valid_columns
    FROM get_table_columns(p_table_name);
    
    -- If table doesn't exist or has no columns
    IF valid_columns IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Table does not exist or has no columns',
            'table', p_table_name
        );
    END IF;
    
    -- Extract columns from provided data
    SELECT array_agg(key) INTO data_columns
    FROM jsonb_object_keys(p_data) AS key;
    
    -- Find invalid columns (in data but not in table)
    SELECT array_agg(col) INTO invalid_columns
    FROM unnest(data_columns) AS col
    WHERE col NOT IN (SELECT unnest(valid_columns));
    
    -- Validate column existence unless bypassing validation
    IF NOT p_bypass_validation AND invalid_columns IS NOT NULL AND array_length(invalid_columns, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Invalid columns provided',
            'invalid_columns', invalid_columns,
            'valid_columns', valid_columns
        );
    END IF;
    
    -- Prepare column names and values for insertion
    WITH cols AS (
        SELECT 
            key AS column_name,
            value AS column_value
        FROM 
            jsonb_each(p_data)
        WHERE 
            p_bypass_validation OR key = ANY(valid_columns)
    )
    SELECT 
        string_agg(quote_ident(column_name), ', ') AS names,
        string_agg(
            CASE
                WHEN column_value IS NULL THEN 'NULL'
                WHEN jsonb_typeof(column_value) = 'string' THEN quote_literal(column_value::text)
                WHEN jsonb_typeof(column_value) = 'number' THEN column_value::text
                WHEN jsonb_typeof(column_value) = 'boolean' THEN column_value::text
                WHEN jsonb_typeof(column_value) = 'null' THEN 'NULL'
                ELSE quote_literal(column_value::text)
            END, 
            ', '
        ) AS values
    INTO column_names, column_values
    FROM cols;
    
    -- Construct and execute the SQL
    sql_cmd := format(
        'INSERT INTO %I (%s) VALUES (%s) RETURNING to_jsonb(*)::jsonb',
        p_table_name,
        column_names,
        column_values
    );
    
    BEGIN
        EXECUTE sql_cmd INTO result;
        RETURN jsonb_build_object(
            'success', TRUE,
            'data', result,
            'message', 'Record inserted successfully'
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'query', sql_cmd,
            'detail', 'Error occurred during insert operation'
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table names in the public schema
CREATE OR REPLACE FUNCTION list_all_tables()
RETURNS TABLE (table_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tables.tablename::TEXT
    FROM
        pg_catalog.pg_tables tables
    WHERE
        tables.schemaname = 'public'
    ORDER BY
        tables.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 