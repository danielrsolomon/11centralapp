# MCP Server for E11EVEN Central App

This directory contains the MCP (Management Control Panel) server and related enhanced database tools for the E11EVEN Central App.

## Overview

The MCP server provides a comprehensive set of tools for managing the E11EVEN Central app database, including:

- **Data Management**: Advanced inserts, schema validation, data archiving
- **Schema Management**: Schema cache refresh, SQL execution
- **Security Tools**: RLS policy testing, security audits
- **Performance Tools**: Monitoring, dashboard, query optimization, indexing
- **Alerting System**: Performance, security, system alerts
- **Scheduled Tasks**: Task scheduler, verification jobs, maintenance jobs

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase project with service role key

### Environment Setup

Create a `.env.local` file in the project root with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Starting the MCP Server

Run the MCP server with:

```bash
npm run mcp:start
```

This will start the server on port 3100 by default.

## Installing Enhanced Tools

To deploy all enhanced tools to your Supabase instance, execute these commands in the Supabase SQL Editor:

1. Deploy Schema Cache Refresh System:
   ```bash
   npm run mcp:deploy-schema-cache
   ```

2. Deploy Data Archiving System:
   ```bash
   npm run mcp:deploy-archiving
   ```

3. Deploy Database Indexing:
   ```bash
   npm run mcp:deploy-indexing
   ```

4. Deploy Security Review System:
   ```bash
   npm run mcp:deploy-security
   ```

5. Deploy Archive Policies:
   ```bash
   npm run mcp:deploy-archive-policies
   ```

## Using Enhanced Tools

All the enhanced tools can be accessed using npm scripts defined in the package.json:

### Data Archiving

```bash
# Deploy archive policies
npm run mcp:deploy-archive-policies

# Execute archiving
npm run mcp:archive-run

# View archiving statistics
npm run mcp:archive-stats
```

### Schema Cache Management

```bash
# Refresh schema cache
npm run mcp:refresh-schema

# Verify schema cache functionality
npm run mcp:verify-schema-cache
```

### Security Management

```bash
# Deploy security review system
npm run mcp:deploy-security

# Fix security issues
npm run mcp:security-fix

# Test RLS policies
npm run mcp:test-rls
```

### Performance Optimization

```bash
# Deploy database indexing
npm run mcp:deploy-indexing

# Run performance monitoring
npm run mcp:performance

# Start performance dashboard
npm run mcp:dashboard
```

### Alerting System

```bash
# Start continuous alert monitoring
npm run mcp:alerts

# Run a single alert check
npm run mcp:alerts:once
```

### Scheduled Tasks

```bash
# Start the scheduler (runs continuously)
npm run mcp:scheduler

# List all configured tasks
npm run mcp:scheduler:list

# Run a specific task immediately
npm run mcp:run-task verifyAll
```

### Comprehensive Verification

```bash
# Run all verification tests
npm run mcp:verify-all
```

## Comprehensive Documentation

For complete documentation of all enhanced tools, please refer to:

1. `documentation/mcp_enhanced_tools.md` - Comprehensive guide to all enhanced database tools
2. `src/mcp/ENHANCED-TOOLS-SUMMARY.md` - Detailed summary of all features and capabilities
3. `src/mcp/SQL-COMMANDS-GUIDE.md` - Guide to SQL commands for setup and maintenance

## Troubleshooting

If you encounter issues with the MCP server or enhanced tools, try:

1. Verify your environment variables and database connection
2. Ensure all database dependencies are properly deployed using the commands above
3. Check the logs in the MCP terminal for error messages
4. Run the verification tests using `npm run mcp:verify-all`
5. For specific component issues, use the component-specific verification scripts 