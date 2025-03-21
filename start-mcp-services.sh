#!/bin/bash

# Start all MCP services for E11EVEN Central App
echo "Starting all MCP services for E11EVEN Central App..."

# Function to check if a port is already in use
is_port_in_use() {
  lsof -i :"$1" >/dev/null 2>&1
  return $?
}

# Kill existing processes if needed
kill_process_on_port() {
  local port=$1
  local pid=$(lsof -t -i :"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID: $pid)..."
    kill "$pid" 2>/dev/null
    sleep 1
  fi
}

# Clean up function when script is interrupted
cleanup() {
  echo "Shutting down MCP services..."
  
  # Find and kill the MCP-Supabase server
  local supabase_pid=$(lsof -t -i :8000 2>/dev/null)
  if [ -n "$supabase_pid" ]; then
    echo "Stopping MCP-Supabase (PID: $supabase_pid)..."
    kill "$supabase_pid" 2>/dev/null
  fi
  
  # Find and kill the MCP-WebSearch server
  local websearch_pid=$(lsof -t -i :3100 2>/dev/null)
  if [ -n "$websearch_pid" ]; then
    echo "Stopping MCP-WebSearch (PID: $websearch_pid)..."
    kill "$websearch_pid" 2>/dev/null
  fi
  
  exit 0
}

# Set up trap for clean termination
trap cleanup SIGINT SIGTERM

# Check and kill processes on ports if needed
echo "Checking for existing processes..."
if is_port_in_use 8000; then
  echo "Port 8000 is already in use. Killing the process..."
  kill_process_on_port 8000
fi

if is_port_in_use 3100; then
  echo "Port 3100 is already in use. Killing the process..."
  kill_process_on_port 3100
fi

# Start MCP-Supabase server
echo "Starting MCP-Supabase server on port 8000..."
./start-mcp-supabase.sh &
SUPABASE_PID=$!
sleep 2

# Check if MCP-Supabase server started successfully
if ! is_port_in_use 8000; then
  echo "❌ Failed to start MCP-Supabase server!"
else
  echo "✅ MCP-Supabase server is running on port 8000"
fi

# Start MCP-WebSearch server
echo "Starting MCP-WebSearch server on port 8100..."
(cd mcp-websearch && npm start) &
WEBSEARCH_PID=$!
sleep 2

# Check if MCP-WebSearch server started successfully
if ! is_port_in_use 8100; then
  echo "❌ Failed to start MCP-WebSearch server!"
else
  echo "✅ MCP-WebSearch server is running on port 8100"
fi

echo ""
echo "✅ All MCP services started successfully!"
echo ""
echo "MCP-Supabase: http://localhost:8000"
echo "MCP-WebSearch: http://localhost:8100"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running to allow Ctrl+C to properly cleanup
wait 