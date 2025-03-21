# Machine Control Protocol (MCP) Documentation

*Last Updated: 2024-05-24*

## Overview

This document provides a comprehensive guide to the Machine Control Protocol (MCP) integration with the E11EVEN Central App. MCP is a tooling framework that enhances the development workflow by providing powerful database management, debugging, performance optimization, security tools, and web search capabilities.

The E11EVEN Central App uses two primary MCP components:
- **Supabase MCP**: For database operations and administration
- **Web Search MCP**: For real-time web search functionality

## Table of Contents

1. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Configuration](#configuration)
2. [Core Functionality](#core-functionality)
   - [Basic Tools](#basic-tools)
   - [Schema Management](#schema-management)
   - [Data Management](#data-management)
   - [Debugging Tools](#debugging-tools)
3. [Integration with Supabase](#integration-with-supabase)
   - [Authentication](#authentication)
   - [Database Operations](#database-operations)
   - [Storage Integration](#storage-integration)
   - [Realtime Subscriptions](#realtime-subscriptions)
   - [Enhanced Database Tools](#enhanced-database-tools)
   - [Security Tools](#security-tools)
4. [Integration with Web Search](#integration-with-web-search)
   - [Configuration](#web-search-configuration)
   - [Query Optimization](#query-optimization)
   - [Result Processing](#result-processing)
   - [Brave Search API Integration](#brave-search-api-integration)
5. [Development Workflow](#development-workflow)
6. [Troubleshooting](#troubleshooting)
   - [Server Issues](#server-issues)
   - [Database Access Issues](#database-access-issues)
   - [API Key Issues](#api-key-issues)
   - [Common Errors](#common-errors)
7. [Best Practices](#best-practices)
8. [Security Considerations](#security-considerations)
9. [Version History](#version-history)

## Getting Started

### Prerequisites

- Node.js v16+ installed
- npm or yarn package manager
- Supabase project with proper credentials
- Brave Search API key (for Web Search MCP)
- `.env.local` file with required environment variables

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Supabase MCP Server**:
   ```bash
   # Make the script executable (first time only)
   chmod +x start-mcp-supabase.sh

   # Start the MCP-Supabase server
   ./start-mcp-supabase.sh
   ```
   The Supabase MCP server will start on port 8000.

3. **Start the Web Search MCP Server** (in a different terminal):
   ```bash
   # Navigate to the mcp-websearch directory
   cd /path/to/mcp-websearch

   # Start the server
   npm start

   # Or use the provided script
   ./start-websearch-mcp.sh
   ```
   The Web Search MCP server will start on port 8100.

### Configuration

Configure the MCP servers by creating or modifying the `.env.local` file:

```
# Required for both MCP components
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for Supabase MCP
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MCP_SUPABASE_PORT=8000

# Required for Web Search MCP
MCP_WEBSEARCH_PORT=8100

# For future MCPs, use MCP_FUTURE_PORT=8200, 8300, etc.

# Required for Web Search MCP (configured in server.js)
# BRAVE_SEARCH_API_KEY=your-brave-search-api-key
```

> **IMPORTANT SECURITY NOTE**: The service role key grants FULL ACCESS to your database. Never expose it in client-side code or public repositories.

## Core Functionality

### Basic Tools

The core MCP integration provides the following basic tools:

- `echo`: Echo back the input message (useful for testing)
- `test_table_access`: Test access to a specific table
- `analyze_table_structure`: Analyze table structures
- `analyze_roles`: Analyze Supabase roles configuration

Sample usage:
```bash
# Test table access
npm run mcp:client -- test_table_access programs

# Echo test
npm run mcp:client -- echo "Test message"
```

### Schema Management

Tools for managing database schema:

- `create_table`: Create new tables
- `add_column`: Add columns to existing tables
- `list_tables`: List all database tables
- `create_all_missing_tables`: Create all tables defined in expected schema
- `inspect_table`: Get detailed table schema information

Sample usage:
```bash
# List all tables
npm run mcp:client -- list_tables

# Get schema information for a specific table
npm run mcp:client -- inspect_table programs
```

### Data Management

Tools for managing database data:

- `insert_record`: Insert records with proper UUID generation
- `enhanced_insert`: Insert with enhanced error reporting
- `advanced_insert`: Insert with comprehensive validation
- `execute_sql`: Execute raw SQL queries (SERVICE ROLE only)

Sample usage:
```bash
# Execute SQL
npm run mcp:client -- execute_sql "SELECT * FROM roles"
```

### Debugging Tools

Tools for debugging:

- `validate_schema`: Validate records against table schemas
- `detect_constraints`: Get all constraints for debugging
- `get_detailed_schema`: Get comprehensive schema details
- `debug-database`: Enhanced error reporting and logging

Sample usage:
```bash
# Debug database
npm run mcp:client -- debug-database
```

## Integration with Supabase

The MCP-Supabase integration provides advanced capabilities for managing the Supabase backend.

### Authentication

Authentication tools help test and verify authentication flows:

- Test authentication flows
  ```bash
  npm run mcp:client -- test-auth
  ```
- Verify user roles and permissions
- Debug authentication issues

### Database Operations

Database operation tools allow direct interaction with the Supabase database:

- Execute SQL queries
- Manage data through CRUD operations
- Monitor query performance
- Implement data archiving

### Storage Integration

Storage integration tools manage file storage in Supabase:

- Upload and download files
- Manage access permissions
- Handle storage buckets
- Monitor storage usage

### Realtime Subscriptions

Tools for working with Supabase's realtime features:

- Test realtime subscriptions
- Monitor active subscriptions
- Debug subscription issues
- Optimize realtime performance

### Enhanced Database Tools

The enhanced MCP tools provide advanced capabilities for database management.

#### Schema Cache System

The schema cache system improves performance:

```bash
# Deploy Schema Cache System
npm run mcp:deploy-schema-cache

# Refresh Schema Cache
npm run mcp:refresh-schema

# Verify Schema Cache
npm run mcp:verify-schema-cache
```

#### Data Archiving System

The data archiving system manages historic data:

```bash
# Deploy Archiving System
npm run mcp:deploy-archiving

# Deploy Archive Policies
npm run mcp:deploy-archive-policies

# Run Archive Process
npm run mcp:archive-run

# View Archive Statistics
npm run mcp:archive-stats
```

### Security Tools

The security tools enforce and audit Row Level Security (RLS) policies:

```bash
# Deploy Security Tools
npm run mcp:deploy-security

# Test RLS Policies
npm run mcp:test-rls

# Fix RLS Issues
npm run mcp:test-rls:fix

# Run Security Audit
npm run mcp:security-fix
```

## Integration with Web Search

The Web Search MCP enables Claude 3.7 Sonnet in Cursor.ai to perform web searches using the Brave Search API, providing real-time access to current information.

### Web Search Configuration

The Web Search MCP uses the Brave Search API with the following configuration:

- **Endpoint**: `https://api.search.brave.com/res/v1/web/search`
- **Default Parameters**:
  - `count`: 5 results per query
  - `safesearch`: moderate
  - `text_format`: plain
  - `wait_for_freshness`: false

### Query Optimization

The Web Search MCP includes query optimization features:

- Automatic query refinement
- Domain-specific query templates
- Keyword extraction and enhancement
- Context-aware search

### Result Processing

Search results are processed and formatted for readability:

```json
{
  "results": [
    {
      "title": "Result Title",
      "url": "https://example.com/result",
      "description": "Result description text...",
      "published_date": "2025-03-15T00:00:00Z"
    }
  ],
  "query": "your search query",
  "timestamp": "March 16, 2025 at 05:47 PM",
  "response_time": 625,
  "message": "Results from Brave Search API as of March 16, 2025",
  "is_mock": false
}
```

### Brave Search API Integration

The Web Search MCP integrates with the Brave Search API and includes:

- API key validation and management
- Comprehensive error handling
- Intelligent fallback mechanisms
- Domain-specific mock results for common query types
- Performance monitoring and logging

#### API Key Management

To test or update the Brave Search API key:

```bash
# Test the current API key
curl -X GET http://localhost:3100/test-api-key

# Update the API key
node update-api-key.js YOUR_NEW_API_KEY
```

## Development Workflow

The typical workflow when using MCP:

1. Start MCP-Supabase server first: `./start-mcp-supabase.sh` (runs on port 8000)
2. Start the Web Search MCP server in a separate terminal: `./start-websearch-mcp.sh` (runs on port 8100)
3. Start development server in yet another terminal: `npm run dev`
4. Keep all terminals open during development
5. Make database changes through MCP tools or Cursor AI
6. Use web search capabilities through the `@web-search` command in Cursor.ai
7. Use the application in development mode to test changes
8. Press Ctrl+C in the MCP terminal to stop the servers when done

## Troubleshooting

### Server Issues

If the MCP servers won't start:

1. **Missing Environment Variables**: Ensure `.env.local` file exists with all required variables
2. **Permission Issues**: Run `chmod +x start-mcp-supabase.sh` to make the script executable
3. **Port Conflicts**: 
   - Check if another process is using port 8000 (Supabase MCP): `lsof -i :8000`
   - Check if another process is using port 8100 (Web Search MCP): `lsof -i :8100`
   - If conflicts are found, either terminate the conflicting process or update port numbers in `.env.local`
4. **Missing Dependencies**: Run `npm install` to ensure all dependencies are installed

### Database Access Issues

If experiencing database access problems:

1. **Invalid Credentials**: Verify Supabase service role key is correct
2. **Project Status**: Check if the Supabase project is active
3. **RLS Policies**: Look for any RLS policies that might restrict access
4. **Network Issues**: Ensure your network can reach the Supabase project URL

### API Key Issues

If encountering issues with the Brave Search API key:

1. Use the `/test-api-key` endpoint to diagnose API key problems
2. Check terminal logs for detailed error messages
3. Generate a new API key from the Brave Search API Dashboard if needed
4. Use the `update-api-key.js` script to update the key

### Common Errors

- **Connection Refused**: MCP server not running or network/firewall issues
- **Authentication Failed**: Invalid Supabase credentials
- **422 Unprocessable Entity**: Invalid parameters in API request
- **429 Too Many Requests**: Rate limit reached for Brave Search API

## Best Practices

- Keep all MCP servers running during development
- Never expose the Supabase service role key
- Be cautious when executing raw SQL queries
- Use RLS policies for production security
- Regularly update API keys for security
- Monitor performance metrics for optimization opportunities
- Use mock results when appropriate for testing
- Document any custom MCP tools you create

## Security Considerations

The MCP-Supabase server uses the service role key which bypasses Row Level Security (RLS) policies and grants full access to your database. This provides powerful capabilities but should be used carefully:

- Only run the MCP server in development environments
- Never expose the service role key in client-side code
- Be cautious when executing raw SQL queries
- Use RLS policies for production security

## Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-05-24 | 1.0.0 | Consolidated MCP documentation | Documentation Team |
| 2024-03-16 | 0.3.0 | Updated Web Search MCP guide | Development Team |
| 2024-03-16 | 0.2.0 | Updated Supabase MCP guide | Development Team |
| 2024-03-16 | 0.1.0 | Initial MCP guide | Development Team | 