-- Data Archiving System
-- These functions facilitate archiving older records from active tables
-- to archive tables with the same structure

-- Function to create an archive table for a source table
CREATE OR REPLACE FUNCTION create_archive_table(
  source_table_name text,
  archive_table_name text DEFAULT NULL
) 
RETURNS jsonb AS $$
DECLARE
  full_archive_table_name text;
  column_definitions text;
  archive_table_exists boolean;
  result jsonb;
BEGIN
  -- Generate archive table name if not provided
  IF archive_table_name IS NULL THEN
    full_archive_table_name := source_table_name || '_archive';
  ELSE
    full_archive_table_name := archive_table_name;
  END IF;
  
  -- Check if archive table already exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = full_archive_table_name
  ) INTO archive_table_exists;
  
  -- If archive table already exists, return information
  IF archive_table_exists THEN
    RETURN jsonb_build_object(
      'status', 'exists',
      'source_table', source_table_name,
      'archive_table', full_archive_table_name,
      'message', 'Archive table already exists'
    );
  END IF;
  
  -- Get column definitions from source table
  SELECT string_agg(
    column_name || ' ' || data_type || 
    CASE 
      WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE 
      WHEN is_nullable = 'NO' THEN ' NOT NULL'
      ELSE ''
    END,
    ', '
  )
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = source_table_name
  INTO column_definitions;
  
  -- Create archive table with the same structure
  EXECUTE format('
    CREATE TABLE %I (
      %s,
      archived_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      archive_reason TEXT
    )
  ', full_archive_table_name, column_definitions);
  
  -- Add index on archived_at for query performance
  EXECUTE format('
    CREATE INDEX %I ON %I (archived_at)
  ', full_archive_table_name || '_archived_at_idx', full_archive_table_name);
  
  -- Enable RLS on archive table
  EXECUTE format('
    ALTER TABLE %I ENABLE ROW LEVEL SECURITY
  ', full_archive_table_name);
  
  -- Add default RLS policy for service role
  EXECUTE format('
    CREATE POLICY archive_service_policy
    ON %I
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)
  ', full_archive_table_name);
  
  -- Create admin-only read policy
  EXECUTE format('
    CREATE POLICY archive_admin_read_policy
    ON %I
    FOR SELECT
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM admin_users))
  ', full_archive_table_name);
  
  -- Build result
  result := jsonb_build_object(
    'status', 'created',
    'source_table', source_table_name,
    'archive_table', full_archive_table_name,
    'columns', column_definitions,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive records from a source table to its archive table
CREATE OR REPLACE FUNCTION archive_records(
  source_table_name text,
  archive_condition text,
  archive_reason text DEFAULT 'Automated archiving',
  archive_table_name text DEFAULT NULL,
  delete_after_archive boolean DEFAULT true
) 
RETURNS jsonb AS $$
DECLARE
  full_archive_table_name text;
  source_columns text;
  archive_count integer;
  delete_count integer;
  query text;
  result jsonb;
BEGIN
  -- Generate archive table name if not provided
  IF archive_table_name IS NULL THEN
    full_archive_table_name := source_table_name || '_archive';
  ELSE
    full_archive_table_name := archive_table_name;
  END IF;
  
  -- Check if archive table exists, create if it doesn't
  PERFORM create_archive_table(source_table_name, full_archive_table_name);
  
  -- Get column names from source table
  SELECT string_agg(column_name, ', ')
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = source_table_name
  INTO source_columns;
  
  -- Build and execute the archive query within a transaction
  BEGIN
    -- Start transaction
    query := format('
      WITH records_to_archive AS (
        SELECT * FROM %I
        WHERE %s
      )
      INSERT INTO %I (%s, archive_reason)
      SELECT %s, %L
      FROM records_to_archive
      RETURNING 1
    ', 
    source_table_name, 
    archive_condition, 
    full_archive_table_name, 
    source_columns, 
    source_columns, 
    archive_reason);
    
    EXECUTE query;
    GET DIAGNOSTICS archive_count = ROW_COUNT;
    
    -- Delete archived records if flag is set
    IF delete_after_archive AND archive_count > 0 THEN
      query := format('
        DELETE FROM %I
        WHERE %s
      ', 
      source_table_name, 
      archive_condition);
      
      EXECUTE query;
      GET DIAGNOSTICS delete_count = ROW_COUNT;
    ELSE
      delete_count := 0;
    END IF;
    
    -- Commit transaction
    result := jsonb_build_object(
      'status', 'success',
      'source_table', source_table_name,
      'archive_table', full_archive_table_name,
      'archive_count', archive_count,
      'delete_count', delete_count,
      'archive_condition', archive_condition,
      'delete_after_archive', delete_after_archive,
      'timestamp', now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    result := jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'error_detail', SQLSTATE,
      'source_table', source_table_name,
      'archive_table', full_archive_table_name,
      'archive_condition', archive_condition,
      'timestamp', now()
    );
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore archived records
CREATE OR REPLACE FUNCTION restore_archived_records(
  archive_table_name text,
  restore_condition text,
  source_table_name text DEFAULT NULL,
  delete_after_restore boolean DEFAULT false
) 
RETURNS jsonb AS $$
DECLARE
  full_source_table_name text;
  source_columns text;
  restore_count integer;
  delete_count integer;
  query text;
  result jsonb;
BEGIN
  -- Extract source table name if not provided
  IF source_table_name IS NULL THEN
    -- Remove '_archive' suffix to get source table name
    IF archive_table_name LIKE '%_archive' THEN
      full_source_table_name := substring(archive_table_name from 1 for length(archive_table_name) - 8);
    ELSE
      RAISE EXCEPTION 'Cannot determine source table name from archive table %', archive_table_name;
    END IF;
  ELSE
    full_source_table_name := source_table_name;
  END IF;
  
  -- Get column names from archive table, excluding archive-specific columns
  SELECT string_agg(column_name, ', ')
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = archive_table_name
  AND column_name NOT IN ('archived_at', 'archive_reason')
  INTO source_columns;
  
  -- Build and execute the restore query within a transaction
  BEGIN
    -- Start transaction
    query := format('
      WITH records_to_restore AS (
        SELECT * FROM %I
        WHERE %s
      )
      INSERT INTO %I (%s)
      SELECT %s
      FROM records_to_restore
      RETURNING 1
    ', 
    archive_table_name, 
    restore_condition, 
    full_source_table_name, 
    source_columns, 
    source_columns);
    
    EXECUTE query;
    GET DIAGNOSTICS restore_count = ROW_COUNT;
    
    -- Delete restored records from archive if flag is set
    IF delete_after_restore AND restore_count > 0 THEN
      query := format('
        DELETE FROM %I
        WHERE %s
      ', 
      archive_table_name, 
      restore_condition);
      
      EXECUTE query;
      GET DIAGNOSTICS delete_count = ROW_COUNT;
    ELSE
      delete_count := 0;
    END IF;
    
    -- Commit transaction
    result := jsonb_build_object(
      'status', 'success',
      'source_table', full_source_table_name,
      'archive_table', archive_table_name,
      'restore_count', restore_count,
      'delete_count', delete_count,
      'restore_condition', restore_condition,
      'delete_after_restore', delete_after_restore,
      'timestamp', now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    result := jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'error_detail', SQLSTATE,
      'source_table', full_source_table_name,
      'archive_table', archive_table_name,
      'restore_condition', restore_condition,
      'timestamp', now()
    );
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get archive statistics
CREATE OR REPLACE FUNCTION get_archive_statistics(
  archive_table_name text DEFAULT NULL
) 
RETURNS jsonb AS $$
DECLARE
  archive_tables text[];
  result jsonb := '{}'::jsonb;
  table_stats jsonb;
  query text;
BEGIN
  -- If no specific table is provided, get stats for all archive tables
  IF archive_table_name IS NULL THEN
    SELECT array_agg(tablename)
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE '%_archive'
    INTO archive_tables;
  ELSE
    archive_tables := ARRAY[archive_table_name];
  END IF;
  
  -- Build statistics for each archive table
  FOREACH archive_table_name IN ARRAY archive_tables
  LOOP
    -- Get total record count
    EXECUTE format('SELECT COUNT(*) FROM %I', archive_table_name) INTO query;
    
    -- Build table stats
    table_stats := jsonb_build_object(
      'record_count', query,
      'table_name', archive_table_name
    );
    
    -- Add statistics by time period
    EXECUTE format('
      SELECT
        jsonb_build_object(
          ''last_day'', COUNT(*) FILTER (WHERE archived_at >= NOW() - INTERVAL ''1 day''),
          ''last_week'', COUNT(*) FILTER (WHERE archived_at >= NOW() - INTERVAL ''7 days''),
          ''last_month'', COUNT(*) FILTER (WHERE archived_at >= NOW() - INTERVAL ''30 days''),
          ''last_year'', COUNT(*) FILTER (WHERE archived_at >= NOW() - INTERVAL ''365 days''),
          ''oldest_record'', MIN(archived_at),
          ''newest_record'', MAX(archived_at)
        )
      FROM %I
    ', archive_table_name) INTO query;
    
    -- Combine stats
    table_stats := table_stats || query;
    
    -- Add statistics by reason if available
    EXECUTE format('
      SELECT
        COALESCE(
          jsonb_object_agg(reason, count),
          ''{}''::jsonb
        )
      FROM (
        SELECT 
          archive_reason AS reason,
          COUNT(*) AS count
        FROM %I
        GROUP BY archive_reason
      ) t
    ', archive_table_name) INTO query;
    
    -- Add reason stats to table stats
    table_stats := table_stats || jsonb_build_object('reasons', query);
    
    -- Add table stats to result
    result := result || jsonb_build_object(archive_table_name, table_stats);
  END LOOP;
  
  -- Return compiled statistics
  RETURN jsonb_build_object(
    'archive_statistics', result,
    'tables_count', array_length(archive_tables, 1),
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage archive policies (schedule and configuration)
CREATE OR REPLACE FUNCTION manage_archive_policy(
  operation text,
  config jsonb
) 
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate operation
  IF operation NOT IN ('create', 'update', 'delete', 'get') THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Invalid operation. Must be one of: create, update, delete, get',
      'timestamp', now()
    );
  END IF;
  
  -- Create archive policy table if it doesn't exist
  CREATE TABLE IF NOT EXISTS archive_policies (
    id SERIAL PRIMARY KEY,
    source_table text NOT NULL,
    archive_table text,
    condition text NOT NULL,
    reason text DEFAULT 'Automated archiving',
    frequency interval NOT NULL,
    delete_after_archive boolean DEFAULT true,
    last_run timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
  );
  
  -- Enable RLS on archive policies table
  ALTER TABLE archive_policies ENABLE ROW LEVEL SECURITY;
  
  -- Create service role policy
  DROP POLICY IF EXISTS archive_policies_service_policy ON archive_policies;
  CREATE POLICY archive_policies_service_policy
  ON archive_policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
  
  -- Create admin read policy
  DROP POLICY IF EXISTS archive_policies_admin_read_policy ON archive_policies;
  CREATE POLICY archive_policies_admin_read_policy
  ON archive_policies
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users));
  
  -- Perform the requested operation
  CASE operation
    WHEN 'create' THEN
      -- Validate required fields
      IF config->>'source_table' IS NULL OR config->>'condition' IS NULL OR config->>'frequency' IS NULL THEN
        RETURN jsonb_build_object(
          'status', 'error',
          'message', 'Missing required fields: source_table, condition, frequency',
          'timestamp', now()
        );
      END IF;
      
      -- Insert new policy
      INSERT INTO archive_policies (
        source_table,
        archive_table,
        condition,
        reason,
        frequency,
        delete_after_archive,
        is_active
      ) VALUES (
        config->>'source_table',
        COALESCE(config->>'archive_table', (config->>'source_table') || '_archive'),
        config->>'condition',
        COALESCE(config->>'reason', 'Automated archiving'),
        (config->>'frequency')::interval,
        COALESCE((config->>'delete_after_archive')::boolean, true),
        COALESCE((config->>'is_active')::boolean, true)
      ) RETURNING to_jsonb(archive_policies.*) INTO result;
      
      RETURN jsonb_build_object(
        'status', 'created',
        'policy', result,
        'timestamp', now()
      );
      
    WHEN 'update' THEN
      -- Validate ID
      IF config->>'id' IS NULL THEN
        RETURN jsonb_build_object(
          'status', 'error',
          'message', 'Missing required field: id',
          'timestamp', now()
        );
      END IF;
      
      -- Update existing policy
      UPDATE archive_policies
      SET
        source_table = COALESCE(config->>'source_table', source_table),
        archive_table = COALESCE(config->>'archive_table', archive_table),
        condition = COALESCE(config->>'condition', condition),
        reason = COALESCE(config->>'reason', reason),
        frequency = COALESCE((config->>'frequency')::interval, frequency),
        delete_after_archive = COALESCE((config->>'delete_after_archive')::boolean, delete_after_archive),
        is_active = COALESCE((config->>'is_active')::boolean, is_active),
        updated_at = now()
      WHERE id = (config->>'id')::integer
      RETURNING to_jsonb(archive_policies.*) INTO result;
      
      IF result IS NULL THEN
        RETURN jsonb_build_object(
          'status', 'error',
          'message', 'Policy not found',
          'timestamp', now()
        );
      END IF;
      
      RETURN jsonb_build_object(
        'status', 'updated',
        'policy', result,
        'timestamp', now()
      );
      
    WHEN 'delete' THEN
      -- Validate ID
      IF config->>'id' IS NULL THEN
        RETURN jsonb_build_object(
          'status', 'error',
          'message', 'Missing required field: id',
          'timestamp', now()
        );
      END IF;
      
      -- Delete policy
      DELETE FROM archive_policies
      WHERE id = (config->>'id')::integer
      RETURNING to_jsonb(archive_policies.*) INTO result;
      
      IF result IS NULL THEN
        RETURN jsonb_build_object(
          'status', 'error',
          'message', 'Policy not found',
          'timestamp', now()
        );
      END IF;
      
      RETURN jsonb_build_object(
        'status', 'deleted',
        'policy', result,
        'timestamp', now()
      );
      
    WHEN 'get' THEN
      -- Get policies, filter by table if provided
      IF config->>'source_table' IS NOT NULL THEN
        SELECT jsonb_agg(to_jsonb(t.*))
        FROM archive_policies t
        WHERE source_table = config->>'source_table'
        INTO result;
      ELSIF config->>'id' IS NOT NULL THEN
        SELECT to_jsonb(t.*)
        FROM archive_policies t
        WHERE id = (config->>'id')::integer
        INTO result;
      ELSE
        SELECT jsonb_agg(to_jsonb(t.*))
        FROM archive_policies t
        INTO result;
      END IF;
      
      RETURN jsonb_build_object(
        'status', 'success',
        'policies', COALESCE(result, '[]'::jsonb),
        'timestamp', now()
      );
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute pending archive policies
CREATE OR REPLACE FUNCTION run_archive_policies(
  policy_id integer DEFAULT NULL
) 
RETURNS jsonb AS $$
DECLARE
  policy record;
  result jsonb := '[]'::jsonb;
  policy_result jsonb;
BEGIN
  -- Create temporary table to hold results
  CREATE TEMP TABLE IF NOT EXISTS temp_archive_results (
    policy_id integer,
    source_table text,
    archive_table text,
    result jsonb
  );
  
  -- Run policies that are due or specific policy if ID provided
  FOR policy IN (
    SELECT * FROM archive_policies
    WHERE (
      policy_id IS NULL AND
      is_active = true AND
      (last_run IS NULL OR last_run + frequency < now())
    ) OR (
      policy_id IS NOT NULL AND
      id = policy_id
    )
    ORDER BY id
  )
  LOOP
    -- Execute the archive operation
    policy_result := archive_records(
      policy.source_table,
      policy.condition,
      policy.reason,
      policy.archive_table,
      policy.delete_after_archive
    );
    
    -- Store the result
    INSERT INTO temp_archive_results (
      policy_id,
      source_table,
      archive_table,
      result
    ) VALUES (
      policy.id,
      policy.source_table,
      policy.archive_table,
      policy_result
    );
    
    -- Update last_run timestamp
    UPDATE archive_policies
    SET 
      last_run = now(),
      updated_at = now()
    WHERE id = policy.id;
  END LOOP;
  
  -- Collect all results
  SELECT jsonb_agg(
    jsonb_build_object(
      'policy_id', policy_id,
      'source_table', source_table,
      'archive_table', archive_table,
      'result', result
    )
  )
  FROM temp_archive_results
  INTO result;
  
  -- Drop temporary table
  DROP TABLE temp_archive_results;
  
  -- Return results
  RETURN jsonb_build_object(
    'status', 'completed',
    'execution_time', now(),
    'results', COALESCE(result, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sample archive policies for common tables

-- Example 1: Archive old bookings
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'bookings',
  'condition', 'created_at < now() - interval ''1 year''',
  'reason', 'Booking older than 1 year',
  'frequency', 'interval ''1 day''',
  'delete_after_archive', true,
  'is_active', true
));

-- Example 2: Archive read notifications
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'notifications',
  'condition', 'read = true AND created_at < now() - interval ''3 months''',
  'reason', 'Notification read and older than 3 months',
  'frequency', 'interval ''1 week''',
  'delete_after_archive', true,
  'is_active', true
));

-- Example 3: Archive past events
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'events',
  'condition', 'end_date < now() - interval ''6 months''',
  'reason', 'Event ended more than 6 months ago',
  'frequency', 'interval ''1 month''',
  'delete_after_archive', true,
  'is_active', true
)); 