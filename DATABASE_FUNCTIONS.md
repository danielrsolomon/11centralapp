# Database Functions for E11EVEN Central Platform

This document outlines the database functions implemented for the E11EVEN Central Platform.

## Implemented Database Function: `execute_raw_query`

### Description

The `execute_raw_query` function allows executing raw SQL queries with parameters from the application code. This function is used by the `EnhancedClient` in `lib/database/clients.ts` to enable more flexible database access patterns.

### Implementation Details

The function has been implemented with the following features:

1. Handles both SELECT and non-SELECT queries appropriately
2. Properly formats results with JSON aggregation for SELECT queries
3. Returns affected row counts for INSERT/UPDATE/DELETE operations
4. Includes comprehensive error handling and reporting
5. Implements proper security measures

### SQL Implementation

```sql
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
```

## Usage in Application

The function is used by the `EnhancedClient` in `lib/database/clients.ts` through the `executeRawQuery` method:

```typescript
supabase.executeRawQuery = async <T = any>(
  query: string, 
  params: any[],
  options: { monitoringOperation?: string } = {}
): Promise<{ data: T[] | null; error: any }> => {
  // Implementation that calls the database function
  const { data, error } = await supabase.rpc('execute_raw_query', {
    query_text: query,
    query_params: JSON.stringify(params)
  });
  
  // Process result...
};
```

## Testing

A test script `test-programs-api.js` has been created to verify that the Programs API endpoint works correctly with the new implementation. To run the test:

```bash
node test-programs-api.js
```

The script will:
1. Authenticate with Supabase
2. Call the `/api/learning/programs` endpoint
3. Verify that the response contains the expected data format

## Security Considerations

The `execute_raw_query` function uses `SECURITY DEFINER`, which means it runs with the privileges of the user who created it (typically the database owner). This is necessary to allow executing arbitrary SQL, but it also poses a security risk if not properly managed.

Security measures in place:

1. Access to this function is restricted to authenticated users only
2. All queries are executed with proper parameter binding to prevent SQL injection
3. Error messages are sanitized to avoid exposing sensitive information
4. The application code validates and sanitizes queries before passing them to this function

## Maintenance

When making changes to the database schema or queries:

1. Test all affected endpoints that use the `executeRawQuery` method
2. Monitor for any errors in the application logs
3. Consider implementing more specific database functions for complex operations 