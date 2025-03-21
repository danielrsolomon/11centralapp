#!/bin/bash

# Start the E11EVEN Web Search MCP Server
# This script can be called by Cursor to enable web search integration

echo "==================================================="
echo "  Starting E11EVEN Web Search MCP Server"
echo "==================================================="
echo ""
echo "This server enables web search capabilities for Claude 3.7 Sonnet"
echo "using the Brave Search API."
echo ""
echo "API Key: ${BRAVE_API_KEY:0:5}...[hidden]"
echo ""
echo "Press Ctrl+C to stop the server"
echo "==================================================="
echo ""

# Navigate to the server directory
cd "$(dirname "$0")"

# Start the server
node server.js

# Exit with the script's exit code
exit $? 