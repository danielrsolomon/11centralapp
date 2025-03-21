# E11EVEN Central App Troubleshooting Guide

This guide contains common issues and their solutions for the E11EVEN Central application.

## Authentication Issues

### UNAUTHORIZED (401) Errors When Accessing University Content

**Symptoms:**
- Receiving 401 Unauthorized errors when accessing university pages
- University content not loading despite being logged in
- Console errors related to "/api/university/programs" or "/api/university/content" endpoints

**Potential Causes:**
1. Session token expired or invalid
2. Authentication headers not being sent properly
3. Authentication middleware missing on backend routes

**Solutions:**

1. **Clear Browser Cache and Login Again**
   - Log out of the application
   - Clear browser cookies and localStorage (DevTools > Application > Storage > Clear Site Data)
   - Log back in to get a fresh authentication token

2. **Check Network Requests**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Look for requests to university endpoints
   - Verify that "Authorization" header is present with "Bearer [token]"

3. **Verify Your Login Status**
   - Navigate to Dashboard to confirm your account is properly logged in
   - If Dashboard loads but university content doesn't, it's likely an auth token issue

4. **Refresh Authentication Token**
   - Click your profile picture and select "Refresh Session"
   - If that option is not available, log out and log back in

5. **Contact Support**
   - If the issue persists, contact technical support with:
     - Your username/email
     - Approximate time of the error
     - Screenshots of any error messages
     - Browser and OS information

## Environment Variable Issues

### API Server Not Loading Environment Variables

**Symptoms:**
- API server fails to start
- "Missing required environment variable" errors
- Features dependent on external services (Supabase, OpenAI) not working

**Solutions:**

1. **Check .env.local File**
   - Ensure your `.env.local` file exists in the project root
   - Verify that it contains all required variables

2. **Use Explicit Values**
   - Avoid using variable substitution in `.env.local` (e.g., `SUPABASE_URL=$VITE_SUPABASE_URL`)
   - Use explicit values instead (e.g., `SUPABASE_URL=https://your-project.supabase.co`)

3. **Restart the API Server**
   - Stop any running API servers
   - Run `npm run api:start` to restart with fresh environment variables

## Database Connection Issues

### Database Queries Failing with Column Errors

**Symptoms:**
- Errors mentioning "column does not exist" 
- 500 errors when accessing content lists

**Solutions:**

1. **Check Database Schema**
   - Verify that your database schema matches what the application expects
   - Run migrations if needed

2. **Update API Code**
   - If the schema has changed, ensure the API code is updated to match

## MCP Server Issues

### MCP Server Not Responding

**Symptoms:**
- Features like web search or Supabase access not working
- Error messages about services being unavailable

**Solutions:**

1. **Check MCP Server Status**
   - Run `node scripts/verify-mcp.js` to check if MCP servers are running

2. **Restart MCP Services**
   - Run `./start-mcp-services.sh` to restart all MCP services

3. **Check Logs**
   - Review `logs/mcp-supabase.log` and `logs/mcp-websearch.log` for errors

## Frontend Build Issues

### Vite Build Failing

**Symptoms:**
- Build errors when running `npm run build`
- TypeScript errors during compilation

**Solutions:**

1. **Clear Node Modules**
   - Delete `node_modules` directory
   - Run `npm install` to reinstall dependencies

2. **Check TypeScript Errors**
   - Run `npm run typecheck` to identify TypeScript issues
   - Fix type errors in your code

3. **Update Dependencies**
   - Run `npm update` to update dependencies to their latest compatible versions 