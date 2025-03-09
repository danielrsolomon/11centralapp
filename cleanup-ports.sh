#!/bin/bash

# Script to kill processes using ports 3000-3009
echo "Cleaning up Next.js development servers..."

# Get a list of pids for processes using ports 3000-3009
for port in {3000..3009}; do
  echo "Checking port $port..."
  
  # For macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    pids=$(lsof -ti:$port)
  # For Linux
  else
    pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
  fi
  
  if [ -n "$pids" ]; then
    echo "Found processes using port $port: $pids"
    for pid in $pids; do
      echo "Killing process $pid on port $port"
      kill -9 $pid
    done
  else
    echo "No processes found using port $port"
  fi
done

echo "Ports cleaned up!"
echo "You can now run 'npm run dev' to start the development server on port 3000." 