#!/bin/bash

# Start the MCP server for Supabase integration
# This script can be called by Cursor to enable MCP integration

PORT=${1:-8000}

# Load environment variables from .env.local
if [ -f .env.local ]; then
  echo "Loading environment variables from .env.local"
  export $(grep -v '^#' .env.local | xargs)
else
  echo "Warning: .env.local file not found"
fi

# Display loaded environment variables (masked)
echo "SUPABASE_URL: ${VITE_SUPABASE_URL:0:10}..."
echo "SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:10}..."

# Start the server
echo "Starting MCP server on port $PORT"
npx tsx src/mcp/index.ts $PORT

# Exit with the script's exit code
exit $? 