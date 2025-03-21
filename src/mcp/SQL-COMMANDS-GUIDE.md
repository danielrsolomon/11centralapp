# SQL Commands Guide for 11Central Enhanced Tools

This guide provides the SQL commands that should be run in the Supabase SQL Editor to fully support the enhanced database tools for the 11Central application.

## Required SQL Commands for Initial Setup

Run these commands in the following order to set up the basic infrastructure for the enhanced tools:

### 1. Deploy Schema Cache Refresh System

```sql
\i src/mcp/schema-cache-refresh.sql
```

This script creates:
- `refresh_schema_cache()` function for basic schema cache refresh
- `refresh_schema_cache_enhanced()` function with verification
- `verify_schema_cache()` function to check schema cache status
- `log_schema_change()` function to track schema changes
- `schema_change_log` table for tracking schema changes
- Functions to create automatic schema refresh triggers

### 2. Deploy Data Archiving System

```sql
\i src/mcp/data-archiving.sql
```

This script creates:
- `create_archive_table()` function for creating archive tables
- `archive_records()` function for moving records to archive tables
- `restore_archived_records()` function for restoring archived data
- `get_archive_statistics()` function for viewing archive stats
- `manage_archive_policy()` function for managing archive policies
- `run_archive_policies()` function for executing archive policies
- Example archive tables and policies

### 3. Deploy Database Indexing

```sql
\i src/mcp/database-indexing.sql
```

This script:
- Creates functions to analyze query patterns and suggest indexes
- Adds indexes to the most frequently queried columns in key tables
- Creates composite indexes for common query patterns
- Adds a validation function to check index effectiveness

### 4. Deploy Security Review System

```sql
\i src/mcp/security-review.sql
```

This script creates:
- `identify_tables_without_rls()` function to find tables without RLS
- `enable_rls_for_tables()` function to enable RLS on all tables
- `identify_sensitive_tables_without_policies()` function to check policy coverage
- `create_default_policies()` function to create standard RLS policies
- `run_security_audit()` function to perform a comprehensive security audit

### 5. Fix Security Issues (Optional)

```sql
SELECT run_security_audit(true);
```

This command:
- Runs a comprehensive security audit
- Automatically fixes identified security issues
- Enables RLS on tables without it
- Creates appropriate RLS policies for sensitive tables

### 6. Deploy Archive Policies

```sql
\i src/mcp/archive-policies.sql
```

This script creates business-appropriate archive policies for:
- Gratuities (6 months)
- Messages (3 months for read messages)
- Schedules (1 year)
- Events (6 months after end date)
- Course Enrollments (2 years for completed courses)
- Notifications (1 month for read notifications)
- Audit Logs (1 year)
- System Logs (3 months)

### 7. Verify Schema Cache Refresh

```sql
\i src/mcp/schema-cache-verify.sql
```

This script:
- Verifies the schema cache refresh functionality
- Tests the NOTIFY permission
- Checks if PostgREST is listening on the correct channel
- Provides troubleshooting suggestions if issues are found

## Post-Setup Verification

After running the above scripts, verify that everything is working correctly:

```sql
-- Check that schema cache refresh works
SELECT verify_schema_cache();

-- View archive policies
SELECT * FROM archive_policies;

-- Test archive functionality
SELECT run_archive_policies();
SELECT get_archive_statistics();

-- Check security status
SELECT run_security_audit(false);

-- Check indexes
SELECT validate_indexes();
```

## Maintenance Commands

Run these commands periodically to maintain optimal database performance:

```sql
-- Refresh schema cache (daily)
SELECT refresh_schema_cache_enhanced();

-- Run archive policies (weekly)
SELECT run_archive_policies();

-- Analyze database for query optimizer (weekly)
ANALYZE;

-- Security audit (monthly)
SELECT run_security_audit(false);
```

## Troubleshooting Commands

If you encounter issues, these commands can help diagnose the problem:

```sql
-- Schema cache issues
\i src/mcp/schema-cache-verify.sql

-- Security policy issues
SELECT * FROM identify_tables_without_rls();
SELECT * FROM identify_sensitive_tables_without_policies();

-- Archiving issues
SELECT manage_archive_policy('get', '{}'::jsonb);

-- Performance issues
SELECT * FROM pg_stat_statements 
ORDER BY total_time / calls DESC 
LIMIT 10;
```

## Service User Setup

For the MCP server to have the necessary permissions, ensure your service role has the following privileges:

```sql
-- Grant NOTIFY permission to service role
GRANT USAGE ON SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
```

## Scheduled Tasks Setup

The enhanced tools include a task scheduler that automates many maintenance tasks. Configure your system to start the scheduler as a background service:

```bash
npm run mcp:scheduler
```

This will run scheduled tasks according to the defined schedule, including:
- Weekly verification of all database tools
- Daily schema cache refresh
- Daily data archiving
- Regular security audits
- Regular performance checks 