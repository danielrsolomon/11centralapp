#!/bin/bash

# --------------------------------------------------------
# E11EVEN Central App - MCP-Supabase Server Startup Script
# --------------------------------------------------------
# This script starts the MCP server for Supabase integration.
# The MCP (Machine Collaboration Protocol) server provides 
# advanced database access and management capabilities.
# 
# Usage:
#   ./start-mcp-supabase.sh [port]
#
# Default port is 8000 if not specified.
# The port is fixed to 8000 for MCP-Supabase to ensure compatibility.
# --------------------------------------------------------

# Allow custom port (though fixed to 8000 for now)
PORT=${1:-8000}

# Display startup banner
echo "-------------------------------------"
echo "Starting E11EVEN MCP-Supabase Server"
echo "-------------------------------------"

# Load environment variables from .env.local
if [ -f .env.local ]; then
  echo "✅ Loading environment variables from .env.local"
  export $(grep -v '^#' .env.local | xargs)
else
  echo "❌ Warning: .env.local file not found"
  echo "   Please create this file with required Supabase credentials:"
  echo "   - VITE_SUPABASE_URL"
  echo "   - VITE_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Display loaded environment variables (masked for security)
echo "✅ Environment variables loaded:"
echo "   SUPABASE_URL: ${VITE_SUPABASE_URL:0:10}..."
echo "   SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:10}..."
echo "   SERVICE_ROLE_KEY: [MASKED FOR SECURITY]"

# Start the server with explicit port assignment
echo "✅ Starting Supabase MCP server on port 8000"
echo "   This provides full database access capabilities"
echo "   Press Ctrl+C to stop the server"
echo "-------------------------------------"
MCP_FORCE_PORT=8000 npx tsx src/mcp/index.ts

# Exit with the script's exit code
exit $? 