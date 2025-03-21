#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==== E11EVEN Central App Server Restart ====${NC}"

# Find and kill API server process
API_PID=$(lsof -i:3001 -t 2>/dev/null)
if [ -n "$API_PID" ]; then
  echo -e "${YELLOW}Stopping API server (PID: $API_PID)...${NC}"
  kill -9 $API_PID 2>/dev/null
  echo -e "${GREEN}API server stopped${NC}"
else
  echo -e "${YELLOW}No API server running on port 3001${NC}"
fi

# Find and kill frontend server process
FRONTEND_PID=$(lsof -i:5174 -t 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
  echo -e "${YELLOW}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
  kill -9 $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}Frontend server stopped${NC}"
else
  echo -e "${YELLOW}No frontend server running on port 5174${NC}"
fi

# Clear npm process cache
echo -e "${YELLOW}Clearing cached processes...${NC}"
killall -9 node 2>/dev/null
sleep 1

# Start servers
echo -e "${YELLOW}Starting API server...${NC}"
npm run api:start &
API_PID=$!
echo -e "${GREEN}API server started with PID: $API_PID${NC}"

# Wait for API server to initialize
echo -e "${YELLOW}Waiting for API server to initialize...${NC}"
sleep 3

# Check if API server is responsive
echo -e "${YELLOW}Checking API server health...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health)
if [[ "$HEALTH_CHECK" == *"success"* ]]; then
  echo -e "${GREEN}API server is running and healthy${NC}"
else
  echo -e "${RED}API server health check failed. Please check logs.${NC}"
  echo "Response: $HEALTH_CHECK"
fi

echo -e "${YELLOW}Starting frontend server...${NC}"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"

echo -e "${YELLOW}Waiting for frontend server to initialize...${NC}"
sleep 5

echo -e "${GREEN}Servers restarted successfully!${NC}"
echo -e "${YELLOW}API server running at:${NC} http://localhost:3001"
echo -e "${YELLOW}Frontend server running at:${NC} http://localhost:5174"
echo
echo -e "${YELLOW}To stop the servers, press Ctrl+C or run:${NC}"
echo "kill -9 $API_PID $FRONTEND_PID" 