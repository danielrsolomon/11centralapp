-- SQL Functions to help with schema discovery and constraint detection
-- These functions serve as alternatives to direct information_schema access
-- All functions use SECURITY DEFINER to run with the privileges of the owner

-- Function to list table columns
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text[];
BEGIN
  SELECT array_agg(column_name::text) INTO result
  FROM pg_attribute a
  JOIN pg_class t ON a.attrelid = t.oid
  JOIN pg_namespace s ON t.relnamespace = s.oid
  WHERE t.relname = table_name
    AND s.nspname = 'public'
    AND a.attnum > 0
    AND NOT a.attisdropped;
    
  RETURN result;
END;
$$;

-- Enhanced Function to get table constraints with improved foreign key detection
CREATE OR REPLACE FUNCTION get_table_constraints(table_name text)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
  constraints_cursor CURSOR FOR
    SELECT
      c.conname AS constraint_name,
      CASE
        WHEN c.contype = 'p' THEN 'PRIMARY KEY'
        WHEN c.contype = 'u' THEN 'UNIQUE'
        WHEN c.contype = 'f' THEN 'FOREIGN KEY'
        WHEN c.contype = 'c' THEN 'CHECK'
        ELSE c.contype::text
      END AS constraint_type,
      t.relname AS table_name,
      c.conkey AS column_keys,
      ft.relname AS referenced_table,
      c.confkey AS referenced_column_keys
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace tn ON t.relnamespace = tn.oid
    LEFT JOIN pg_class ft ON c.confrelid = ft.oid
    LEFT JOIN pg_namespace ftn ON ft.relnamespace = ftn.oid
    WHERE t.relname = table_name
      AND tn.nspname = 'public';
BEGIN
  result := '[]'::jsonb;
  
  FOR constraint_rec IN constraints_cursor LOOP
    DECLARE
      column_names text[];
      referenced_column_names text[];
      i integer;
      constraint_json jsonb;
    BEGIN
      -- Get column names for the constraint
      SELECT array_agg(a.attname ORDER BY ordinality)
      INTO column_names
      FROM unnest(constraint_rec.column_keys) WITH ORDINALITY AS cols(col_num, ordinality)
      JOIN pg_attribute a ON a.attnum = cols.col_num AND a.attrelid = (
        SELECT oid FROM pg_class WHERE relname = constraint_rec.table_name AND 
        relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      );
      
      -- For foreign keys, get referenced column names
      IF constraint_rec.constraint_type = 'FOREIGN KEY' AND constraint_rec.referenced_table IS NOT NULL THEN
        SELECT array_agg(a.attname ORDER BY ordinality)
        INTO referenced_column_names
        FROM unnest(constraint_rec.referenced_column_keys) WITH ORDINALITY AS cols(col_num, ordinality)
        JOIN pg_attribute a ON a.attnum = cols.col_num AND a.attrelid = (
          SELECT oid FROM pg_class WHERE relname = constraint_rec.referenced_table AND 
          relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        );
      END IF;
      
      -- Build JSON for this constraint
      constraint_json := jsonb_build_object(
        'constraint_name', constraint_rec.constraint_name,
        'constraint_type', constraint_rec.constraint_type,
        'table_name', constraint_rec.table_name,
        'column_names', to_jsonb(column_names),
        'referenced_table', constraint_rec.referenced_table,
        'referenced_column_names', to_jsonb(referenced_column_names)
      );
      
      -- Add to result array
      result := result || constraint_json;
    END;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to get detailed column information
CREATE OR REPLACE FUNCTION get_table_columns_detailed(table_name text)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  WITH columns AS (
    SELECT
      a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
      CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
      (
        SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid)
        FROM pg_catalog.pg_attrdef d
        WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum
        AND a.atthasdef
      ) AS column_default
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = table_name
      AND n.nspname = 'public'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default
    )
  ) INTO result
  FROM columns;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Function to get primary key of a table
CREATE OR REPLACE FUNCTION get_primary_key(table_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text;
BEGIN
  SELECT a.attname INTO result
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  JOIN pg_class c ON c.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = table_name
    AND n.nspname = 'public'
    AND i.indisprimary;
    
  RETURN result;
END;
$$;

-- Comprehensive function to get all table details
CREATE OR REPLACE FUNCTION get_detailed_table_info(table_name text)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  columns_result JSONB;
  constraints_result JSONB;
  pk_result text;
  result JSONB;
BEGIN
  -- Get columns
  SELECT get_table_columns_detailed(table_name) INTO columns_result;
  
  -- Get constraints
  SELECT get_table_constraints(table_name) INTO constraints_result;
  
  -- Get primary key
  SELECT get_primary_key(table_name) INTO pk_result;
  
  -- Build result
  result := jsonb_build_object(
    'table_name', table_name,
    'columns', columns_result,
    'constraints', constraints_result,
    'primary_key', pk_result
  );
  
  RETURN result;
END;
$$;

-- Function to list all tables with their primary keys
CREATE OR REPLACE FUNCTION list_tables_with_pk()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  WITH tables AS (
    SELECT
      c.relname AS table_name,
      get_primary_key(c.relname) AS primary_key
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE 'sql_%'
    ORDER BY c.relname
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'primary_key', primary_key
    )
  ) INTO result
  FROM tables;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Function to list all tables
CREATE OR REPLACE FUNCTION list_all_tables()
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text[];
BEGIN
  SELECT array_agg(c.relname::text) INTO result
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname = 'public'
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%';
    
  RETURN result;
END;
$$;

-- New function to get all foreign key references to a table
CREATE OR REPLACE FUNCTION get_references_to_table(table_name text)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  WITH refs AS (
    SELECT
      c.conname AS constraint_name,
      t.relname AS referencing_table,
      array_to_string(array_agg(col.attname ORDER BY u.attposition), ',') AS referencing_column,
      t2.relname AS referenced_table,
      array_to_string(array_agg(col2.attname ORDER BY u.attposition), ',') AS referenced_column
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_class t2 ON c.confrelid = t2.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN pg_namespace n2 ON t2.relnamespace = n2.oid,
    LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition)
    JOIN pg_attribute col ON col.attrelid = t.oid AND col.attnum = u.attnum
    JOIN LATERAL UNNEST(c.confkey) WITH ORDINALITY AS v(attnum, attposition) ON v.attposition = u.attposition
    JOIN pg_attribute col2 ON col2.attrelid = t2.oid AND col2.attnum = v.attnum
    WHERE c.contype = 'f'
      AND t2.relname = table_name
      AND n2.nspname = 'public'
      AND n.nspname = 'public'
    GROUP BY c.conname, t.relname, t2.relname
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'constraint_name', constraint_name,
      'referencing_table', referencing_table,
      'referencing_column', referencing_column,
      'referenced_table', referenced_table,
      'referenced_column', referenced_column
    )
  ) INTO result
  FROM refs;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- New function to get all database relationships
CREATE OR REPLACE FUNCTION get_all_relationships()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  WITH relationships AS (
    SELECT
      c.conname AS constraint_name,
      n.nspname AS schema_name,
      t.relname AS table_name,
      t2.relname AS referenced_table,
      CASE
        WHEN c.contype = 'p' THEN 'PRIMARY KEY'
        WHEN c.contype = 'f' THEN 'FOREIGN KEY'
        WHEN c.contype = 'u' THEN 'UNIQUE'
        WHEN c.contype = 'c' THEN 'CHECK'
        ELSE c.contype::text
      END AS constraint_type
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    LEFT JOIN pg_class t2 ON c.confrelid = t2.oid
    WHERE n.nspname = 'public'
      AND c.contype IN ('p', 'f', 'u')
    ORDER BY t.relname, c.contype
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'constraint_name', constraint_name,
      'schema_name', schema_name,
      'table_name', table_name,
      'referenced_table', referenced_table,
      'constraint_type', constraint_type
    )
  ) INTO result
  FROM relationships;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema'; 