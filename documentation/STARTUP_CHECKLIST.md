# E11EVEN Central App - Startup & Debugging Checklist

This document provides a systematic approach to starting the E11EVEN Central App and troubleshooting common issues.

## Quick Start Guide

Follow these steps in order to start the application:

### 1. Check for Running Processes

First, ensure that no conflicting processes are running on the required ports:

```bash
# Run the check-ports script
./scripts/check-ports.sh
```

If any processes are found on ports 3001 (API), 5173-5177 (Frontend), 8000 (MCP-Supabase), or 8100 (MCP-WebSearch), kill them:

```bash
# Kill a specific process
kill -9 <PID>

# Or kill all processes on a specific port
lsof -i :<PORT> | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### 2. Verify Environment Variables

Ensure your `.env.local` file exists and contains the required configuration:

```
# API URL for the frontend to connect to
VITE_API_URL=http://localhost:3001

# Supabase configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start the API Server

Start the API server in a dedicated terminal:

```bash
# Navigate to the project root
cd /path/to/project

# Start the API server
npm run api:start
```

Wait until you see a message similar to "API server listening on port 3001" or "API server started successfully".

### 4. Verify API is Running

In a separate terminal, check if the API server is responding:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

If the API isn't responding, check the API server terminal for error messages.

### 5. Start the Frontend (Vite) Server

Start the frontend server in a separate terminal:

```bash
# From the project root
npm run dev
```

This should start the Vite development server. Note the local URL provided (usually http://localhost:5173 or similar).

### 6. Start the MCP Servers

Start the MCP servers in separate terminals:

```bash
# From the project root - start Supabase MCP server (port 8000)
./start-mcp-supabase.sh
```

```bash
# From the project root - start Web Search MCP server (port 8100)
./start-websearch-mcp.sh
```

Alternatively, you can start both MCP servers at once:

```bash
# From the project root
./start-mcp-services.sh
```

Wait until you see success messages indicating that the MCP servers have started on their respective ports.

### 7. Verify Frontend is Running

Open the URL provided by the Vite dev server in your browser. You should see the login page.

### 8. Verify API Connectivity

Run the API verification script to check both API and Supabase connectivity:

```bash
# From the project root
node scripts/verify-api.js
```

You should see "API Health: OK" and "Supabase Service: OK".

### 9. Verify MCP Server Connectivity

Run the MCP verification script to check both MCP servers:

```bash
# From the project root
node scripts/verify-mcp.js
```

You should see success messages for both MCP servers. Alternatively, you can check them directly:

```bash
# Check Supabase MCP Server
curl http://localhost:8000/mcp

# Check Web Search MCP Server
curl http://localhost:8100/mcp
```

A successful response will display server status information. If you receive a "connection refused" error, the respective MCP server is not running.

## Troubleshooting Authentication Issues

If you experience authentication issues, follow these steps:

### 1. Clear Browser Storage

Clear authentication-related browser storage:

```javascript
// Run in browser console
Object.keys(localStorage)
  .filter(key => key.includes('auth') || key.includes('supabase'))
  .forEach(key => localStorage.removeItem(key));
```

Alternatively, open an incognito/private window.

### 2. Check Network Requests

1. Open browser DevTools (F12)
2. Go to the Network tab
3. Attempt to log in
4. Look for requests to `/auth/v1/token` or similar
5. Check if these requests succeed (status 200) or fail

### 3. Verify API Logs

Check the terminal where the API server is running for any error messages related to authentication.

### 4. Check Supabase Configuration

Verify that your Supabase URL and anon key are correct in `.env.local`.

### 5. Try a Test User

If you're in development mode, try logging in with one of the test user accounts available on the login page. These accounts are designed to work even when there might be issues with regular authentication.

Test users are:
- test@example.com (password: password123)
- admin@example.com (password: admin123)

For more information about test users, see `documentation/api/TEST_USERS.md`.

## Common Authentication Errors

### "Failed to fetch" Error

This typically indicates a network connectivity issue with the Supabase authentication API.

**Troubleshooting:**
1. Check your internet connection
2. Verify Supabase URL is correct
3. Check if Supabase service is running (status.supabase.com)
4. Look for CORS issues in browser console
5. Try using a test user account

### "Auth session missing!" Error

This indicates a problem with session storage or session validation.

**Troubleshooting:**
1. Clear browser localStorage
2. Check browser console for detailed error messages
3. Verify that localStorage is enabled in your browser
4. Check if the session is being stored correctly after login
5. Verify synchronization between session storage mechanisms

### "Network Error" during Login

This could indicate API server connectivity issues.

**Troubleshooting:**
1. Verify the API server is running (`

## Troubleshooting MCP Services

If you encounter issues with MCP services:

### 1. Verify Environment Variables

Ensure that your `.env.local` file contains the necessary MCP-related variables:

```
# MCP Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MCP_SUPABASE_PORT=8000
MCP_WEBSEARCH_PORT=8100
```

### 2. Check MCP Server Processes

```bash
# Check for any running MCP processes
ps aux | grep -i mcp
```

### 3. Test MCP Endpoints Directly

```bash
# Test Supabase MCP
curl http://localhost:8000/mcp

# Test Web Search MCP
curl http://localhost:8100/mcp
```

### 4. Check MCP Server Logs

If either MCP server fails to start or function properly, check the terminal where it's running for error messages.

### 5. Restart MCP Services

If needed, kill any existing MCP processes and restart them:

```bash
# Kill MCP processes
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :8100 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart MCP servers
./start-mcp-services.sh
```

## Important Notes