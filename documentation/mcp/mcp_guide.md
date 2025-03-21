# E11EVEN Central App - MCP Integration Guide

*Last Updated: March 16, 2025*

## Introduction

This document provides a comprehensive guide to the Model Context Protocol (MCP) integration with the E11EVEN Central App. MCP allows Cursor to interact with the app's Supabase database and services, providing powerful database management, debugging, performance optimization, and security tools.

## Table of Contents

1. [Overview](#overview)
2. [Basic MCP Integration](#basic-mcp-integration)
   - [Installation](#installation)
   - [Configuration](#configuration)
   - [Core Features](#core-features)
3. [Enhanced Database Tools](#enhanced-database-tools)
   - [Schema Management](#schema-management)
   - [Data Archiving](#data-archiving)
   - [Security Tools](#security-tools)
   - [Performance Optimization](#performance-optimization)
   - [Alerting System](#alerting-system)
   - [Scheduled Tasks](#scheduled-tasks)
4. [Usage Examples](#usage-examples)
5. [Troubleshooting](#troubleshooting)

## Overview

The MCP integration provides an interface between Cursor and the E11EVEN Central App, allowing you to:

1. Read and write data directly to the Supabase database
2. Interact with app services like the E11EVEN University LMS
3. Send and receive messages from the chat system
4. Execute advanced database operations
5. Monitor and optimize database performance
6. Enforce security policies and audit access
7. Automate maintenance tasks
8. Perform web searches using the Web Search MCP integration

> **Note:** The project includes two separate MCP components:
> - **Supabase MCP** (in `mcp-supabase/` directory): For database operations and administration
> - **Web Search MCP** (in `mcp-websearch/` directory): For web search functionality
>
> For detailed information on the Web Search MCP, which provides real-time web search capabilities using the Brave Search API, please refer to the [Web Search MCP Guide](./mcp_websearch_guide.md).

## Basic MCP Integration

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the MCP Server**:
   ```bash
   npm run mcp:start
   ```

   This will start the MCP server on port 3100 by default.

### Configuration

Configure the MCP server by creating or modifying the `.env.local` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
MCP_PORT=3100
MCP_LOG_LEVEL=info
```

### Core Features

The core MCP integration provides the following features:

1. **Database Access**: Execute SQL queries against the Supabase database
   ```bash
   npm run mcp:client -- execute "SELECT * FROM roles"
   ```

2. **Authentication**: Test and verify authentication flows
   ```bash
   npm run mcp:client -- test-auth
   ```

3. **Debug Tools**: Enhanced error reporting and logging
   ```bash
   npm run mcp:client -- debug-database
   ```

4. **Schema Information**: View table structures and relationships
   ```bash
   npm run mcp:client -- show-schema
   ```

## Enhanced Database Tools

The enhanced MCP tools provide advanced capabilities for managing, optimizing, and maintaining the database.

### Schema Management

#### Schema Cache Refresh

The schema cache system improves performance by maintaining a local cache of the database schema:

1. **Deploy Schema Cache System**:
   ```bash
   npm run mcp:deploy-schema-cache
   ```

2. **Refresh Schema Cache**:
   ```bash
   npm run mcp:refresh-schema
   ```

3. **Verify Schema Cache**:
   ```bash
   npm run mcp:verify-schema-cache
   ```

#### Schema Cache Functions

- `refresh_schema_cache_enhanced()`: Refreshes the complete schema cache
- `get_table_schema(table_name)`: Retrieves schema information for a specific table
- `validate_schema_integrity()`: Validates the integrity of the schema cache

### Data Archiving

The data archiving system manages historic data to maintain database performance:

1. **Deploy Archiving System**:
   ```bash
   npm run mcp:deploy-archiving
   ```

2. **Deploy Archive Policies**:
   ```bash
   npm run mcp:deploy-archive-policies
   ```

3. **Run Archive Process**:
   ```bash
   npm run mcp:archive-run
   ```

4. **View Archive Statistics**:
   ```bash
   npm run mcp:archive-stats
   ```

#### Archiving Functions

- `run_archive_policies()`: Executes all configured archive policies
- `get_archive_statistics()`: Retrieves statistics about archived data
- `configure_table_archive(table_name, archive_days, archive_method)`: Configures archiving for a table

### Security Tools

The security tools enforce and audit Row Level Security (RLS) policies:

1. **Deploy Security Tools**:
   ```bash
   npm run mcp:deploy-security
   ```

2. **Test RLS Policies**:
   ```bash
   npm run mcp:test-rls
   ```

3. **Fix RLS Issues**:
   ```bash
   npm run mcp:test-rls:fix
   ```

4. **Run Security Audit**:
   ```bash
   npm run mcp:security-fix
   ```

#### Security Functions

- `run_security_audit(apply_fixes)`: Audits and optionally fixes security issues
- `test_rls_policy(table_name, policy_name, user_id)`: Tests a specific RLS policy
- `verify_user_access(user_id, table_name)`: Verifies a user's access to a table

### Performance Optimization

The performance tools monitor and optimize database performance:

1. **Deploy Indexing System**:
   ```bash
   npm run mcp:deploy-indexing
   ```

2. **Run Performance Monitor**:
   ```bash
   npm run mcp:performance
   ```

3. **View Performance Dashboard**:
   ```