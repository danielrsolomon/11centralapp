-- Database Indexing for 11Central
-- This script identifies frequently queried columns and creates appropriate indexes
-- Run this script in the Supabase SQL Editor to optimize query performance

-- Function to analyze query patterns and suggest indexes
CREATE OR REPLACE FUNCTION analyze_and_suggest_indexes() 
RETURNS jsonb AS $$
DECLARE
  suggested_indexes jsonb := '[]'::jsonb;
  result jsonb;
  row record;
BEGIN
  -- Look for sequential scans on large tables - these are prime candidates for indexing
  FOR row IN (
    SELECT 
      relname as table_name,
      seq_scan,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND seq_scan > 10
    AND n_live_tup > 1000
    ORDER BY seq_scan * n_live_tup DESC -- Prioritize tables with many rows and many sequential scans
    LIMIT 10
  ) LOOP
    suggested_indexes := suggested_indexes || jsonb_build_object(
      'table', row.table_name,
      'reason', format('High sequential scans (%s) on large table (%s rows)', row.seq_scan, row.row_count),
      'suggested_columns', '[]'::jsonb
    );
  END LOOP;
  
  -- Look for tables referenced in slow queries
  FOR row IN (
    WITH slow_queries AS (
      SELECT 
        query,
        substring(query, '^\s*(\w+)') as query_type,
        (total_time / calls) as avg_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      AND query NOT LIKE '%pg_stat_activity%'
      AND (total_time / calls) > 50 -- Queries taking more than 50ms on average
      ORDER BY total_time / calls DESC
      LIMIT 20
    ),
    tables_in_queries AS (
      SELECT 
        DISTINCT query,
        avg_time,
        regexp_matches(query, 'FROM\s+([^\s,;]+)', 'i') as table_match,
        regexp_matches(query, 'WHERE\s+([^\s]+)\s*[=<>]', 'i') as where_column,
        regexp_matches(query, 'ORDER BY\s+([^\s,;]+)', 'i') as order_column,
        regexp_matches(query, 'JOIN\s+([^\s]+)\s+ON', 'i') as join_table,
        regexp_matches(query, 'ON\s+([^\s]+)\s*[=<>]', 'i') as join_column
      FROM slow_queries
    )
    SELECT * FROM tables_in_queries
    WHERE table_match IS NOT NULL
  ) LOOP
    -- Extract table and potential column to index
    DECLARE
      table_name text := trim(both ' "' from row.table_match[1]);
      potential_column text := NULL;
    BEGIN
      -- Try to extract column name from WHERE, ORDER BY or JOIN clause
      IF row.where_column IS NOT NULL THEN
        potential_column := trim(both ' "' from row.where_column[1]);
      ELSIF row.order_column IS NOT NULL THEN
        potential_column := trim(both ' "' from row.order_column[1]);
      ELSIF row.join_column IS NOT NULL THEN
        potential_column := trim(both ' "' from row.join_column[1]);
      END IF;
      
      -- Only process if we have both table and column
      IF potential_column IS NOT NULL THEN
        -- Check if column actually exists in the table
        PERFORM 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = table_name
        AND column_name = potential_column;
        
        IF FOUND THEN
          -- Check if index already exists
          PERFORM 1
          FROM pg_indexes
          WHERE schemaname = 'public'
          AND tablename = table_name
          AND indexdef LIKE '%' || potential_column || '%';
          
          IF NOT FOUND THEN
            -- Add to suggested indexes
            FOR i IN 0..jsonb_array_length(suggested_indexes) - 1 LOOP
              IF suggested_indexes->i->>'table' = table_name THEN
                -- Table already in suggestions, add column if not already there
                IF NOT (suggested_indexes->i->'suggested_columns') ? potential_column THEN
                  suggested_indexes := jsonb_set(
                    suggested_indexes,
                    ARRAY[i::text, 'suggested_columns'],
                    (suggested_indexes->i->'suggested_columns') || to_jsonb(potential_column)
                  );
                END IF;
                EXIT;
              END IF;
              
              -- If we reach the end without finding the table, add a new entry
              IF i = jsonb_array_length(suggested_indexes) - 1 THEN
                suggested_indexes := suggested_indexes || jsonb_build_object(
                  'table', table_name,
                  'reason', format('Referenced in slow query (%.2fms)', row.avg_time),
                  'suggested_columns', jsonb_build_array(potential_column)
                );
              END IF;
            END LOOP;
            
            -- If no tables yet, add the first one
            IF jsonb_array_length(suggested_indexes) = 0 THEN
              suggested_indexes := jsonb_build_array(jsonb_build_object(
                'table', table_name,
                'reason', format('Referenced in slow query (%.2fms)', row.avg_time),
                'suggested_columns', jsonb_build_array(potential_column)
              ));
            END IF;
          END IF;
        END IF;
      END IF;
    END;
  END LOOP;
  
  -- Now analyze specific tables known to be central to the application
  DECLARE
    key_tables text[] := ARRAY['users', 'roles', 'departments', 'courses', 'venues', 'schedules', 'gratuities', 'messages', 'course_enrollments'];
    table_name text;
  BEGIN
    FOREACH table_name IN ARRAY key_tables LOOP
      -- Check if table exists
      PERFORM 1
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = table_name;
      
      IF FOUND THEN
        -- For each table, identify important columns to index
        CASE table_name
          WHEN 'users' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['email', 'role_id', 'department_id', 'created_at']);
          WHEN 'roles' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['name']);
          WHEN 'departments' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['name']);
          WHEN 'courses' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['name', 'department_id', 'created_at']);
          WHEN 'venues' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['name', 'created_at']);
          WHEN 'schedules' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['user_id', 'venue_id', 'start_time', 'end_time']);
          WHEN 'gratuities' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['user_id', 'venue_id', 'date', 'amount']);
          WHEN 'messages' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['sender_id', 'recipient_id', 'read', 'created_at']);
          WHEN 'course_enrollments' THEN
            PERFORM check_and_add_index(suggested_indexes, table_name, ARRAY['user_id', 'course_id', 'completed', 'enrollment_date']);
        END CASE;
      END IF;
    END LOOP;
  END;
  
  -- Generate SQL for creating indexes
  DECLARE
    index_commands jsonb := '[]'::jsonb;
    item jsonb;
    table_name text;
    column_name text;
    index_name text;
    command text;
  BEGIN
    FOR i IN 0..jsonb_array_length(suggested_indexes) - 1 LOOP
      item := suggested_indexes->i;
      table_name := item->>'table';
      
      -- Process each suggested column
      IF jsonb_array_length(item->'suggested_columns') > 0 THEN
        FOR j IN 0..jsonb_array_length(item->'suggested_columns') - 1 LOOP
          column_name := item->'suggested_columns'->j;
          
          -- Remove quotes if present
          column_name := trim(both '"' from column_name::text);
          
          -- Generate index name
          index_name := table_name || '_' || column_name || '_idx';
          
          -- Generate SQL command
          command := format('CREATE INDEX IF NOT EXISTS %I ON %I (%I)', 
                           index_name, table_name, column_name);
          
          -- Add to commands array
          index_commands := index_commands || to_jsonb(command);
        END LOOP;
      END IF;
    END LOOP;
    
    result := jsonb_build_object(
      'suggested_indexes', suggested_indexes,
      'index_commands', index_commands,
      'timestamp', now()
    );
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if columns exist and add them to suggestions
CREATE OR REPLACE FUNCTION check_and_add_index(
  suggested_indexes jsonb,
  table_name text,
  columns text[]
) RETURNS jsonb AS $$
DECLARE
  column_name text;
  table_found boolean := false;
  table_index integer := -1;
BEGIN
  -- Check if we already have this table in our suggestions
  FOR i IN 0..jsonb_array_length(suggested_indexes) - 1 LOOP
    IF suggested_indexes->i->>'table' = table_name THEN
      table_found := true;
      table_index := i;
      EXIT;
    END IF;
  END LOOP;
  
  -- If table not found, add it
  IF NOT table_found THEN
    suggested_indexes := suggested_indexes || jsonb_build_object(
      'table', table_name,
      'reason', 'Key application table',
      'suggested_columns', '[]'::jsonb
    );
    table_index := jsonb_array_length(suggested_indexes) - 1;
  END IF;
  
  -- For each column, check if it exists and if an index already exists
  FOREACH column_name IN ARRAY columns LOOP
    -- Check if column exists
    PERFORM 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = table_name
    AND column_name = column_name;
    
    IF FOUND THEN
      -- Check if index already exists
      PERFORM 1
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = table_name
      AND indexdef LIKE '%' || column_name || '%';
      
      IF NOT FOUND THEN
        -- Add to suggested columns if not already there
        IF NOT (suggested_indexes->table_index->'suggested_columns') ? column_name THEN
          suggested_indexes := jsonb_set(
            suggested_indexes,
            ARRAY[table_index::text, 'suggested_columns'],
            (suggested_indexes->table_index->'suggested_columns') || to_jsonb(column_name)
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN suggested_indexes;
END;
$$ LANGUAGE plpgsql;

-- Execute the analysis and generate suggested indexes
SELECT analyze_and_suggest_indexes();

-- Create indexes for frequently accessed columns

-- Users table indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_role_id_idx ON users (role_id);
CREATE INDEX IF NOT EXISTS users_department_id_idx ON users (department_id);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at);

-- Roles table indexes
CREATE INDEX IF NOT EXISTS roles_name_idx ON roles (name);

-- Departments table indexes
CREATE INDEX IF NOT EXISTS departments_name_idx ON departments (name);

-- Courses table indexes
CREATE INDEX IF NOT EXISTS courses_name_idx ON courses (name);
CREATE INDEX IF NOT EXISTS courses_department_id_idx ON courses (department_id);
CREATE INDEX IF NOT EXISTS courses_created_at_idx ON courses (created_at);

-- Venues table indexes
CREATE INDEX IF NOT EXISTS venues_name_idx ON venues (name);
CREATE INDEX IF NOT EXISTS venues_created_at_idx ON venues (created_at);

-- Schedules table indexes
CREATE INDEX IF NOT EXISTS schedules_user_id_idx ON schedules (user_id);
CREATE INDEX IF NOT EXISTS schedules_venue_id_idx ON schedules (venue_id);
CREATE INDEX IF NOT EXISTS schedules_start_time_idx ON schedules (start_time);
CREATE INDEX IF NOT EXISTS schedules_date_range_idx ON schedules (start_time, end_time);

-- Gratuities table indexes
CREATE INDEX IF NOT EXISTS gratuities_user_id_idx ON gratuities (user_id);
CREATE INDEX IF NOT EXISTS gratuities_venue_id_idx ON gratuities (venue_id);
CREATE INDEX IF NOT EXISTS gratuities_date_idx ON gratuities (date);
CREATE INDEX IF NOT EXISTS gratuities_date_range_idx ON gratuities (date, user_id);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON messages (recipient_id);
CREATE INDEX IF NOT EXISTS messages_read_idx ON messages (read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at);

-- Course enrollments table indexes
CREATE INDEX IF NOT EXISTS course_enrollments_user_id_idx ON course_enrollments (user_id);
CREATE INDEX IF NOT EXISTS course_enrollments_course_id_idx ON course_enrollments (course_id);
CREATE INDEX IF NOT EXISTS course_enrollments_completed_idx ON course_enrollments (completed);
CREATE INDEX IF NOT EXISTS course_enrollments_date_idx ON course_enrollments (enrollment_date);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS users_role_dept_idx ON users (role_id, department_id);
CREATE INDEX IF NOT EXISTS schedules_user_date_idx ON schedules (user_id, start_time);
CREATE INDEX IF NOT EXISTS gratuities_user_date_idx ON gratuities (user_id, date);
CREATE INDEX IF NOT EXISTS messages_sender_recipient_idx ON messages (sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS enrollments_user_completed_idx ON course_enrollments (user_id, completed);

-- Function to check if indexes are working as expected
CREATE OR REPLACE FUNCTION validate_indexes() 
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  index_stats jsonb := '[]'::jsonb;
  row record;
BEGIN
  -- Get stats for each index
  FOR row IN (
    SELECT
      i.schemaname,
      i.tablename,
      i.indexname,
      pg_size_pretty(pg_relation_size(schemaname || '.' || indexname::text)) as index_size,
      s.idx_scan as scans
    FROM pg_indexes i
    LEFT JOIN pg_stat_user_indexes s ON
      s.schemaname = i.schemaname AND
      s.relname = i.tablename AND
      s.indexrelname = i.indexname
    WHERE i.schemaname = 'public'
    ORDER BY s.idx_scan DESC NULLS LAST
    LIMIT 20
  ) LOOP
    index_stats := index_stats || jsonb_build_object(
      'table', row.tablename,
      'index', row.indexname,
      'size', row.index_size,
      'scans', row.scans
    );
  END LOOP;
  
  -- Identify unused indexes
  DECLARE
    unused_indexes jsonb := '[]'::jsonb;
  BEGIN
    FOR row IN (
      SELECT
        i.schemaname,
        i.tablename,
        i.indexname,
        pg_size_pretty(pg_relation_size(schemaname || '.' || indexname::text)) as index_size,
        s.idx_scan as scans
      FROM pg_indexes i
      LEFT JOIN pg_stat_user_indexes s ON
        s.schemaname = i.schemaname AND
        s.relname = i.tablename AND
        s.indexrelname = i.indexname
      WHERE i.schemaname = 'public'
      AND s.idx_scan < 10
      ORDER BY pg_relation_size(schemaname || '.' || indexname::text) DESC
      LIMIT 10
    ) LOOP
      unused_indexes := unused_indexes || jsonb_build_object(
        'table', row.tablename,
        'index', row.indexname,
        'size', row.index_size,
        'scans', row.scans
      );
    END LOOP;
    
    result := jsonb_build_object(
      'timestamp', now(),
      'index_stats', index_stats,
      'unused_indexes', unused_indexes
    );
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Analyze database to update statistics for the query planner
ANALYZE; 