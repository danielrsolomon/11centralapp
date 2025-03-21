# Environment Variable Troubleshooting Guide

This guide provides detailed troubleshooting steps for common environment variable issues in the E11EVEN Central App.

## Common Issues

### 1. Missing Environment Variables

**Symptoms:**
- API server fails to start with errors about missing environment variables
- Server logs show `Missing critical environment variables` errors
- MCP servers return connection errors

**Solutions:**
1. Verify that `.env.local` exists in the project root
2. Check that all required variables are defined:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_KEY=your-service-role-key
   VITE_OPENAI_API_KEY=your-openai-key
   ```
3. Run the environment test script:
   ```bash
   node scripts/test-env-loading.js
   ```
4. Look for any specific environment variables mentioned in error messages

### 2. Variable Substitution Issues

**Symptoms:**
- Server starts but API calls to Supabase fail
- Errors about invalid or undefined Supabase URL/key
- Warning messages about unresolved variable substitution

**Solutions:**
1. Replace variable substitution patterns with explicit values:
   ```
   # REPLACE THIS:
   SUPABASE_URL=${VITE_SUPABASE_URL}
   
   # WITH THIS:
   SUPABASE_URL=https://your-project.supabase.co
   ```
2. Make sure both VITE_ and non-VITE versions of variables are defined with identical values
3. Verify the environment with the diagnostic script:
   ```bash
   node scripts/test-env-loading.js
   ```

### 3. Environment Files Not Loading

**Symptoms:**
- No environment variables are available despite being defined in `.env.local`
- Server logs show "No environment file found. Using system environment variables only"

**Solutions:**
1. Check file paths - make sure `.env.local` is in the project root
2. Verify file permissions - ensure the environment file is readable
3. Try renaming `.env.local` to `.env` as a test
4. Check that the environment file has the correct format:
   - No spaces around `=` sign
   - No quotes around values unless they're part of the actual value
   - No trailing whitespace

### 4. API Server and MCP Servers Using Different Variables

**Symptoms:**
- API server works but MCP servers fail
- Or MCP servers work but API server fails
- Inconsistent behavior between different parts of the application

**Solutions:**
1. Ensure all services use the same environment file
2. Define both VITE_ and non-VITE versions of critical variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_URL=https://your-project.supabase.co
   ```
3. Check startup scripts to verify they're loading environment variables correctly
4. Reset the environment by closing all terminals and restarting the services

## Diagnostic Tools

### Environment Variable Test Script

The project includes a comprehensive test script for environment variables:

```bash
node scripts/test-env-loading.js
```

This script performs the following tests:
1. Basic environment file loading
2. Variable substitution functionality
3. Application environment file validation

The script will also provide specific recommendations based on the test results.

### API Server Diagnostics

When starting the API server, detailed diagnostics are printed to help identify environment issues:

```bash
npm run api:start
```

Look for the following sections in the output:
- `Environment configuration diagnostic`
- `Environment variable debugging`
- Any error messages with 🚨 emoji

### Manual Environment Inspection

You can manually inspect the loaded environment variables:

```bash
# Start Node.js REPL
node

# Load dotenv and check variables
import dotenv from 'dotenv'
dotenv.config()
console.log(process.env.VITE_SUPABASE_URL)
console.log(process.env.SUPABASE_URL)
```

## Advanced Troubleshooting

### Environment Variable Precedence

The system loads environment variables with the following precedence:

1. `.env.local` (highest priority)
2. `.env.development`
3. `.env` (lowest priority)
4. System environment variables

To debug precedence issues, you can check which file is being loaded:

```bash
NODE_ENV=development node -e "
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const cwd = process.cwd();
const envLocalPath = path.resolve(cwd, '.env.local');
const envDevPath = path.resolve(cwd, '.env.development');
const envPath = path.resolve(cwd, '.env');

console.log('Current working directory:', cwd);
console.log('.env.local exists:', fs.existsSync(envLocalPath));
console.log('.env.development exists:', fs.existsSync(envDevPath));
console.log('.env exists:', fs.existsSync(envPath));

const result = dotenv.config();
console.log('Loaded from:', result.parsed ? 'Success' : 'Failed');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
"
```

### Cross-Platform Issues

On Windows, environment variable handling might differ:
1. Use cross-env for consistent behavior: `npm install --save-dev cross-env`
2. Update npm scripts to use cross-env:
   ```json
   "scripts": {
     "dev": "cross-env NODE_ENV=development vite",
     "api:start": "cross-env NODE_ENV=development node scripts/start-api-server.js"
   }
   ```

### Docker Environment Issues

If running in Docker:
1. Make sure environment variables are passed to the container:
   ```bash
   docker run -p 3001:3001 --env-file .env.local your-image
   ```
2. Or set them in the Dockerfile:
   ```dockerfile
   COPY .env.local .env.local
   ```

## Getting Help

If you've tried these troubleshooting steps and still have issues:

1. Run the environment test script and save the output:
   ```bash
   node scripts/test-env-loading.js > env-diagnostics.txt
   ```
2. Check for any non-standard characters in your environment files
3. Try a completely fresh .env.local file with only the essential variables
4. Contact the development team with your env-diagnostics.txt file (make sure to remove any sensitive keys first) 