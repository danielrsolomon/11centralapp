# 11Central Enhanced Database Tools

This document provides an overview of the enhanced database tools developed for the 11Central application. These tools facilitate database management, debugging, testing, and performance optimization.

## Table of Contents

1. [Data Management Tools](#data-management-tools)
   - [Advanced Insert Tool](#advanced-insert-tool)
   - [Schema Validation Tool](#schema-validation-tool)
   - [Constraint Detection Tool](#constraint-detection-tool)
   - [Data Archiving System](#data-archiving-system)
2. [Schema Management Tools](#schema-management-tools)
   - [Schema Cache Refresh](#schema-cache-refresh)
   - [Enhanced Execute SQL Tool](#enhanced-execute-sql-tool)
3. [Security Tools](#security-tools)
   - [Table Access Testing Tool](#table-access-testing-tool)
   - [RLS Policy Testing Tool](#rls-policy-testing-tool)
   - [Comprehensive Security Audit](#comprehensive-security-audit)
4. [Performance Tools](#performance-tools)
   - [Performance Monitoring](#performance-monitoring)
   - [Real-time Performance Dashboard](#real-time-performance-dashboard)
   - [Query Optimization](#query-optimization)
   - [Database Indexing](#database-indexing)
5. [Alerting System](#alerting-system)
   - [Performance Alerts](#performance-alerts)
   - [Security Alerts](#security-alerts)
   - [System Status Alerts](#system-status-alerts)
6. [Scheduled Tasks](#scheduled-tasks)
   - [Task Scheduler](#task-scheduler)
   - [Verification Jobs](#verification-jobs)
   - [Maintenance Jobs](#maintenance-jobs)
7. [Utility Functions](#utility-functions)
   - [SQL Helper Functions](#sql-helper-functions)
   - [Sample Data Generation](#sample-data-generation)
   - [Deployment Scripts](#deployment-scripts)
8. [Configuration](#configuration)
   - [Environment Variables](#environment-variables)
   - [Debugging Levels](#debugging-levels)
9. [Known Issues and Limitations](#known-issues-and-limitations)
10. [Next Steps](#next-steps)

## Data Management Tools

### Advanced Insert Tool

The Advanced Insert Tool facilitates inserting data into database tables with comprehensive debugging, validation, and error analysis.

**Key Features:**
- Multiple debug levels (none, basic, detailed, verbose)
- Automatic schema validation
- UUID generation for primary keys
- Transaction handling
- Detailed error analysis

**Usage Example:**
```json
{
  "method": "rpc.methodCall",
  "params": {
    "name": "advanced_insert",
    "args": {
      "table": "venues",
      "record": {
        "name": "Example Venue",
        "address": "123 Test St"
      },
      "debug_level": "detailed"
    }
  }
}
```

### Schema Validation Tool

The Schema Validation Tool checks if a given record conforms to a table's schema, providing detailed information about any validation issues.

**Key Features:**
- Validates record fields against table schema
- Identifies missing required fields
- Detects invalid or unknown fields
- Returns detailed validation results

**Usage Example:**
```json
{
  "method": "rpc.methodCall",
  "params": {
    "name": "validate_schema",
    "args": {
      "table": "venues",
      "record": {
        "name": "Test Venue",
        "address": "123 Main St",
        "invalid_field": "This field doesn't exist"
      }
    }
  }
}
```

### Constraint Detection Tool

The Constraint Detection Tool identifies database constraints that might affect data insertion, helping diagnose and prevent constraint violation errors.

**Key Features:**
- Detects primary key, foreign key, unique, and check constraints
- Retrieves constraint definitions
- Works without direct access to information_schema
- Returns constraints in structured JSON format

**Usage Example:**
```json
{
  "method": "rpc.methodCall",
  "params": {
    "name": "detect_constraints",
    "args": {
      "table": "bookings"
    }
  }
}
```

### Data Archiving System

The Data Archiving System facilitates moving older records from active tables to archive tables with the same structure, improving database performance and data organization.

**Key Features:**
- Automatic archive table creation with matching schema
- Scheduled archiving based on configurable policies
- Custom archive conditions and reasons
- Archive statistics and monitoring
- Data restoration capabilities
- Row Level Security on archive tables

**Usage Example:**
```sql
-- Create an archiving policy for old bookings
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'bookings',
  'condition', 'created_at < now() - interval ''1 year''',
  'reason', 'Booking older than 1 year',
  'frequency', 'interval ''1 day''',
  'delete_after_archive', true,
  'is_active', true
));

-- Run all active archive policies
SELECT run_archive_policies();

-- Get statistics about archived data
SELECT get_archive_statistics();
```

**Business-Appropriate Archive Policies:**

For 11Central, we've implemented the following archive policies based on business requirements:

1. **Gratuities** - Archive records older than 6 months
2. **Messages** - Archive read messages older than 3 months
3. **Schedules** - Archive schedules older than 1 year
4. **Events** - Archive events ended more than 6 months ago
5. **Course Enrollments** - Archive completed enrollments older than 2 years
6. **Notifications** - Archive read notifications older than 1 month
7. **Audit Logs** - Archive logs older than 1 year
8. **System Logs** - Archive logs older than 3 months

These policies can be deployed and managed using:
```bash
npm run mcp:deploy-archive-policies  # Deploy all predefined policies
npm run mcp:archive-run              # Execute archiving based on policies
npm run mcp:archive-stats            # View archive statistics
```

## Schema Management Tools

### Schema Cache Refresh

The Schema Cache Refresh system ensures PostgREST always has the latest database schema, resolving issues with outdated schema cache after schema modifications.

**Key Features:**
- Reliable schema cache refreshing
- Verification of refresh operations
- Automatic schema change logging
- Triggers for schema-modifying operations
- Detailed statistics on refresh operations

**Usage Example:**
```sql
-- Basic schema refresh
SELECT refresh_schema_cache();

-- Enhanced schema refresh with verification
SELECT refresh_schema_cache_enhanced();

-- Verify schema cache status
SELECT verify_schema_cache();

-- Log schema change and refresh cache
SELECT log_schema_change('ALTER', 'public', 'venues', 'table');

-- Test all schema cache refresh functionality
SELECT test_schema_cache_refresh();
```

To verify and troubleshoot schema cache functionality:
```bash
npm run mcp:verify-schema-cache  # Run comprehensive verification tests
```

### Enhanced Execute SQL Tool

The Enhanced Execute SQL Tool allows executing complex SQL statements with improved error handling, transaction support, and automatic schema refreshing.

**Key Features:**
- Support for multi-statement SQL execution
- Transaction handling with automatic rollback on errors
- Detailed error reporting
- Automatic schema cache refresh after schema changes
- Query analysis and optimization suggestions

**Usage Example:**
```json
{
  "method": "rpc.methodCall",
  "params": {
    "name": "execute_sql",
    "args": {
      "query": "BEGIN; UPDATE venues SET name = 'Updated Venue' WHERE id = '123'; COMMIT;",
      "params": [],
      "options": {
        "transaction": true,
        "refresh_schema": true
      }
    }
  }
}
```

## Security Tools

### Table Access Testing Tool

The Table Access Testing Tool verifies permissions for various operations (SELECT, INSERT, UPDATE, DELETE) on database tables.

**Key Features:**
- Tests access for different user roles
- Verifies RLS policy effectiveness
- Supports testing specific operations
- Returns detailed access results

**Usage Example:**
```json
{
  "method": "rpc.methodCall",
  "params": {
    "name": "test_table_access",
    "args": {
      "table": "venues",
      "role": "authenticated"
    }
  }
}
```

### RLS Policy Testing Tool

The RLS Policy Testing Tool comprehensively tests and adjusts Row Level Security policies, ensuring proper access control across tables and roles.

**Key Features:**
- Tests RLS policies across multiple tables and roles
- Verifies policy effectiveness for all operations
- Applies template policies to fix security issues
- Generates HTML reports of testing results
- Identifies tables without RLS enabled

**Usage Example:**
```bash
# Check RLS status and test permissions
npm run mcp:test-rls

# Fix issues by applying template policies
npm run mcp:test-rls:fix
```

### Comprehensive Security Audit

The Security Audit tool performs a systematic review of database security, focusing on RLS policies, table permissions, and user role access.

**Key Features:**
- Identifies tables without RLS enabled
- Detects sensitive tables with insufficient policies
- Automatically applies appropriate security policies
- Generates detailed audit reports
- Provides specific recommendations for improving security

**Usage Example:**
```bash
# Run security audit without fixing issues
npm run mcp:deploy-security

# Run security audit and fix identified issues
npm run mcp:security-fix
```

## Performance Tools

### Performance Monitoring

The Performance Monitoring tool analyzes database performance, identifying bottlenecks and suggesting optimizations.

**Key Features:**
- Measures read/write performance
- Identifies slow queries
- Tracks index usage
- Recommends performance improvements
- Generates performance reports

**Usage Example:**
```bash
# Run performance monitoring
npm run mcp:performance
```

### Real-time Performance Dashboard

The Real-time Performance Dashboard provides a web interface for monitoring database performance metrics, status, and optimization recommendations in real-time.

**Key Features:**
- Real-time visualization of query performance
- Transaction rate monitoring
- Slow query identification
- Table statistics with row counts and sizes
- Status monitoring for database, schema cache, RLS, and archiving
- Automatic performance recommendations
- Interactive charts and tables

**Usage Example:**
```bash
# Start the performance dashboard
npm run mcp:dashboard

# Access the dashboard in a browser
# http://localhost:3200
```

### Query Optimization

The Query Optimization tools identify and optimize slow-performing SQL queries in the application.

**Key Features:**
- Analyzes query execution plans
- Identifies missing indexes
- Suggests query rewrites
- Monitors query performance improvements
- Provides optimization recommendations

**Implementation:**
The query optimization capabilities are integrated into the performance dashboard and alerting system, automatically identifying slow queries and suggesting optimizations.

### Database Indexing

The Database Indexing tool analyzes query patterns and creates appropriate indexes to improve database performance.

**Key Features:**
- Identifies frequently queried columns
- Creates indexes for high-impact tables and columns
- Monitors index usage effectiveness
- Suggests composite indexes for complex queries
- Detects and reports unused indexes

**Usage Example:**
```bash
# Deploy indexing tools and create indexes
npm run mcp:deploy-indexing
```

## Alerting System

### Performance Alerts

The system monitors database performance and generates alerts for performance issues.

**Key Features:**
- Identifies slow queries exceeding threshold
- Monitors large tables that may need archiving
- Tracks transaction times and throughput
- Detects abnormal performance patterns
- Provides specific recommendations for addressing issues

### Security Alerts

The system monitors database security and generates alerts for security concerns.

**Key Features:**
- Detects tables without proper RLS policies
- Identifies excessive user role permissions
- Monitors for potential security vulnerabilities
- Provides security breach prevention recommendations
- Alerts on suspicious access patterns

### System Status Alerts

The system monitors the overall database system status and generates alerts for system issues.

**Key Features:**
- Monitors high connection counts
- Tracks database size growth
- Checks schema cache status
- Monitors transaction log size
- Alerts on system resource constraints

**Usage Example:**
```bash
# Start continuous alert monitoring
npm run mcp:alerts

# Run a single alert check
npm run mcp:alerts:once
```

## Scheduled Tasks

### Task Scheduler

The Task Scheduler automates database maintenance and monitoring tasks.

**Key Features:**
- Customizable scheduling for all maintenance tasks
- Detailed logs of executed tasks
- Email notifications for task results
- Automatic retry for failed tasks
- Supports one-time and recurring tasks

### Verification Jobs

Scheduled jobs to verify the functionality of various database tools and systems.

**Key Features:**
- Weekly verification of all enhanced tools
- Daily schema cache refresh
- RLS policy checks
- Database constraint verification
- Archive policy validation

### Maintenance Jobs

Scheduled jobs for routine database maintenance.

**Key Features:**
- Daily archiving of old data
- Regular security audits
- Performance optimization runs
- System status checks
- Database statistics collection

**Usage Example:**
```bash
# Start the scheduler (runs continuously)
npm run mcp:scheduler

# List all configured tasks
npm run mcp:scheduler:list

# Run a specific task immediately
npm run mcp:run-task verifyAll
```

## Utility Functions

### SQL Helper Functions

Various SQL helper functions simplify common database operations and enhance debugging capabilities.

**Key Functions:**
- `refresh_schema_cache()`: Refreshes PostgREST schema cache
- `parse_constraint_error()`: Parses database constraint errors
- `create_schema_refresh_trigger()`: Creates triggers for automatic schema refreshing
- `transaction_wrapper()`: Wraps queries in transactions
- `analyze_query()`: Analyzes query performance

### Sample Data Generation

Scripts to generate consistent, interconnected sample data across tables for testing purposes.

**Key Features:**
- Generates realistic test data
- Maintains referential integrity
- Supports specific testing scenarios
- Creates data for all major tables

**Usage Example:**
```sql
-- Run the sample data generation script
\i src/mcp/create-interconnected-sample-data.sql
```

### Deployment Scripts

Scripts to deploy and configure the enhanced tools in various environments.

**Key Scripts:**
- `enhanced-tools-deployment.ts`: Deploys all enhanced tools
- `fix-information-schema-access.sql`: Fixes constraint detection issues
- `enhance-execute-sql.sql`: Enhances SQL execution capabilities

## Configuration

### Environment Variables

```
PGHOST - Database host (default: localhost)
PGPORT - Database port (default: 5432)
PGDATABASE - Database name (default: postgres)
PGUSER - Database user (default: postgres)
PGPASSWORD - Database password
DASHBOARD_PORT - Port for performance dashboard (default: 3200)
```

### Debugging Levels

The Advanced Insert Tool supports multiple debugging levels:

- `none`: No debugging information
- `basic`: Basic success/failure information
- `detailed`: Detailed information about the operation
- `verbose`: Comprehensive debugging with query details

## Known Issues and Limitations

- Schema cache refresh requires PostgreSQL 10+ and PostgREST 7+
- Performance dashboard requires the pg_stat_statements extension
- RLS policy testing may require database superuser privileges for some operations
- Data archiving doesn't support tables with composite primary keys
- Task scheduler requires a continuously running Node.js process

## Next Steps

- **Advanced Performance Optimization**: Implement AI-driven query optimization
- **Multi-Environment Support**: Add configuration profiles for different environments
- **Integration with Cloud Monitoring**: Integrate with AWS CloudWatch, Google Cloud Monitoring, etc.
- **User Interface for Archive Management**: Develop a user interface for managing archived data
- **Advanced Security Scanning**: Implement more sophisticated database security scanning tools 