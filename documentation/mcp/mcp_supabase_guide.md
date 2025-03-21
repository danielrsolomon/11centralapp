# MCP-Supabase Integration Guide

*Last Updated: March 16, 2025*

## Overview

The MCP-Supabase integration provides advanced Supabase database access and management capabilities for the E11EVEN Central App. This service enables direct database operations, schema management, and advanced debugging tools.

## Quick Start

```bash
# Make the script executable (first time only)
chmod +x start-mcp-supabase.sh

# Start the MCP-Supabase server
./start-mcp-supabase.sh

# In a separate terminal, start the development server
npm run dev
```

## Prerequisites

- Node.js v16+ installed
- npm or yarn package manager
- Supabase project with proper credentials
- `.env.local` file with required environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Detailed Setup Instructions

### 1. Environment Configuration

Ensure your `.env.local` file contains the necessary Supabase credentials:

```
# Required for MCP-Supabase server
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **IMPORTANT SECURITY NOTE**: The service role key grants FULL ACCESS to your database. Never expose it in client-side code or public repositories.

### 2. Starting the MCP-Supabase Server

```bash
# Make the script executable (only needed once)
chmod +x start-mcp-supabase.sh

# Start the server
./start-mcp-supabase.sh
```

When started successfully, you should see output similar to:
```
-------------------------------------
Starting E11EVEN MCP-Supabase Server
-------------------------------------
✅ Loading environment variables from .env.local
✅ Environment variables loaded:
   SUPABASE_URL: https://xx...
   SUPABASE_ANON_KEY: eyJhbG...
   SERVICE_ROLE_KEY: [MASKED FOR SECURITY]
✅ Starting Supabase MCP server on port 8000
   This provides full database access capabilities
   Press Ctrl+C to stop the server
-------------------------------------
[List of registered tools]
MCP Server running at http://localhost:8000
```

### 3. Verifying the Server is Running

To verify the server is running properly, you can:

```bash
# Check if the server process is running
ps aux | grep mcp

# Check if the port is in use
lsof -i :8000

# Test server response
curl http://localhost:8000/mcp
```

The server runs on port 8000 by default and must remain running while you use the application.

### 4. Starting the Development Server

In a separate terminal window (while keeping the MCP-Supabase server running):

```bash
npm run dev
```

This starts the Vite development server on port 5173 (usually accessible at http://localhost:5173).

## Available Tools

The MCP-Supabase server provides access to over 20 database management tools:

### Basic Tools
- `echo`: Echo back the input message (useful for testing)
- `test_table_access`: Test access to a specific table
- `analyze_table_structure`: Analyze table structures
- `analyze_roles`: Analyze Supabase roles configuration

### Schema Management
- `create_table`: Create new tables
- `add_column`: Add columns to existing tables
- `list_tables`: List all database tables
- `create_all_missing_tables`: Create all tables defined in expected schema

### Data Management
- `insert_record`: Insert records with proper UUID generation
- `enhanced_insert`: Insert with enhanced error reporting
- `advanced_insert`: Insert with comprehensive validation

### Debugging Tools
- `inspect_table`: Get detailed table schema information
- `execute_sql`: Execute raw SQL queries (SERVICE ROLE only)
- `validate_schema`: Validate records against table schemas
- `detect_constraints`: Get all constraints for debugging
- `get_detailed_schema`: Get comprehensive schema details

## Using MCP Tools

The MCP tools are accessible via HTTP requests to the server. When using Cursor, the AI assistant can directly access these tools.

Example usage:
```javascript
// Example of executing SQL through MCP
const response = await fetch('http://localhost:8000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'execute_sql',
    args: {
      query: 'SELECT * FROM programs LIMIT 5;'
    }
  })
});
```

## Troubleshooting

### Server Won't Start

1. **Missing Environment Variables**: Ensure `.env.local` file exists with all required variables
2. **Permission Issues**: Run `chmod +x start-mcp-supabase.sh` to make the script executable
3. **Port Conflicts**: Check if another process is using port 8000 with `lsof -i :8000`
4. **Missing Dependencies**: Run `npm install tsx dotenv` if those dependencies are missing

### Database Access Issues

1. **Invalid Credentials**: Verify Supabase service role key is correct
2. **Project Status**: Check if the Supabase project is active
3. **RLS Policies**: Look for any RLS policies that might restrict access
4. **Network Issues**: Ensure your network can reach the Supabase project URL

### Connection Refused Errors

1. **Server Not Running**: Ensure MCP server is running on port 8000
2. **Firewall Issues**: Check for firewall or networking restrictions
3. **Local Access**: Verify localhost access is permitted
4. **Server Crashed**: Check terminal for error messages if the server crashed

## Development Workflow

The typical workflow when using MCP-Supabase:

1. Start MCP-Supabase server first: `./start-mcp-supabase.sh`
2. Start development server in a separate terminal: `npm run dev`
3. Keep both terminals open during development
4. Make database changes through MCP tools or Cursor AI
5. Use the application in development mode to test changes
6. Press Ctrl+C in the MCP-Supabase terminal to stop the server when done

## Security Considerations

The MCP-Supabase server uses the service role key which bypasses Row Level Security (RLS) policies and grants full access to your database. This provides powerful capabilities but should be used carefully:

- Only run the MCP server in development environments
- Never expose the service role key in client-side code
- Be cautious when executing raw SQL queries
- Use RLS policies for production security

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MCP Server Implementation](src/mcp/index.ts)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript) 