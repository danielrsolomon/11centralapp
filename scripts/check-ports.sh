#!/bin/bash

# ANSI color codes for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}E11EVEN Central App - Port Check Tool${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Function to check if a port is in use
check_port() {
  local port=$1
  local description=$2
  
  # Check if the port is in use
  if lsof -i :$port -P -n | grep LISTEN > /dev/null; then
    echo -e "${RED}✗ Port $port ($description) is in use:${NC}"
    lsof -i :$port -P -n | grep LISTEN
    return 1
  else
    echo -e "${GREEN}✓ Port $port ($description) is available${NC}"
    return 0
  fi
}

# Check API server ports
echo -e "${YELLOW}Checking API server ports...${NC}"
api_ports_available=true
check_port 3001 "API server" || api_ports_available=false

echo ""
echo -e "${YELLOW}Checking frontend ports...${NC}"
frontend_ports_available=true
check_port 5173 "Vite dev server" || frontend_ports_available=false
check_port 5174 "Vite dev server (alternative 1)" || frontend_ports_available=false
check_port 5175 "Vite dev server (alternative 2)" || frontend_ports_available=false
check_port 5176 "Vite dev server (alternative 3)" || frontend_ports_available=false
check_port 5177 "Vite dev server (alternative 4)" || frontend_ports_available=false

echo ""
echo -e "${YELLOW}Checking MCP server ports...${NC}"
mcp_ports_available=true
check_port 8000 "MCP-Supabase server" || mcp_ports_available=false
check_port 8100 "MCP-WebSearch server" || mcp_ports_available=false

echo ""
echo -e "${YELLOW}Checking environment configuration...${NC}"

# Check if .env.local exists
if [ -f ".env.local" ]; then
  echo -e "${GREEN}✓ .env.local file exists${NC}"
  
  # Check for required environment variables
  api_url=$(grep -E "^VITE_API_URL=" .env.local | cut -d= -f2)
  supabase_url=$(grep -E "^VITE_SUPABASE_URL=" .env.local | cut -d= -f2)
  supabase_key=$(grep -E "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d= -f2)
  supabase_service_key=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2)
  mcp_supabase_port=$(grep -E "^MCP_SUPABASE_PORT=" .env.local | cut -d= -f2)
  mcp_websearch_port=$(grep -E "^MCP_WEBSEARCH_PORT=" .env.local | cut -d= -f2)
  
  if [ -n "$api_url" ]; then
    echo -e "${GREEN}✓ VITE_API_URL is set to ${api_url}${NC}"
  else
    echo -e "${RED}✗ VITE_API_URL is not set in .env.local${NC}"
  fi
  
  if [ -n "$supabase_url" ]; then
    echo -e "${GREEN}✓ VITE_SUPABASE_URL is set${NC}"
  else
    echo -e "${RED}✗ VITE_SUPABASE_URL is not set in .env.local${NC}"
  fi
  
  if [ -n "$supabase_key" ]; then
    echo -e "${GREEN}✓ VITE_SUPABASE_ANON_KEY is set${NC}"
  else
    echo -e "${RED}✗ VITE_SUPABASE_ANON_KEY is not set in .env.local${NC}"
  fi
  
  if [ -n "$supabase_service_key" ]; then
    echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY is set${NC}"
  else
    echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local${NC}"
  fi
  
  if [ -n "$mcp_supabase_port" ]; then
    echo -e "${GREEN}✓ MCP_SUPABASE_PORT is set to ${mcp_supabase_port}${NC}"
  else
    echo -e "${YELLOW}! MCP_SUPABASE_PORT is not set in .env.local (default: 8000)${NC}"
  fi
  
  if [ -n "$mcp_websearch_port" ]; then
    echo -e "${GREEN}✓ MCP_WEBSEARCH_PORT is set to ${mcp_websearch_port}${NC}"
  else
    echo -e "${YELLOW}! MCP_WEBSEARCH_PORT is not set in .env.local (default: 8100)${NC}"
  fi
else
  echo -e "${RED}✗ .env.local file does not exist${NC}"
  echo -e "${YELLOW}Create a .env.local file with the following variables:${NC}"
  echo "VITE_API_URL=http://localhost:3001"
  echo "VITE_SUPABASE_URL=https://your-project.supabase.co"
  echo "VITE_SUPABASE_ANON_KEY=your-anon-key"
  echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
  echo "MCP_SUPABASE_PORT=8000"
  echo "MCP_WEBSEARCH_PORT=8100"
fi

echo ""
echo -e "${YELLOW}Checking start commands in package.json...${NC}"

# Extract start commands from package.json
if [ -f "package.json" ]; then
  echo -e "${GREEN}✓ package.json file exists${NC}"
  
  # Extract API start command
  api_start=$(grep -o '"api:start": *"[^"]*"' package.json)
  if [ -n "$api_start" ]; then
    echo -e "${GREEN}✓ API start command: ${api_start#*\"}${NC}"
  else
    echo -e "${RED}✗ API start command not found in package.json${NC}"
  fi
  
  # Extract frontend start command
  frontend_start=$(grep -o '"dev": *"[^"]*"' package.json)
  if [ -n "$frontend_start" ]; then
    echo -e "${GREEN}✓ Frontend start command: ${frontend_start#*\"}${NC}"
  else
    echo -e "${RED}✗ Frontend start command not found in package.json${NC}"
  fi
else
  echo -e "${RED}✗ package.json file does not exist${NC}"
fi

echo ""
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo ""

if [ "$api_ports_available" = false ] || [ "$frontend_ports_available" = false ] || [ "$mcp_ports_available" = false ]; then
  echo -e "1. ${RED}Kill processes using required ports:${NC}"
  echo "   lsof -i :<PORT> | grep LISTEN | awk '{print \$2}' | xargs kill -9"
  echo ""
fi

echo -e "2. ${YELLOW}Start the API server:${NC}"
echo "   npm run api:start"
echo ""
echo -e "3. ${YELLOW}Start the frontend:${NC}"
echo "   npm run dev"
echo ""
echo -e "4. ${YELLOW}Start the MCP servers:${NC}"
echo "   ./start-mcp-services.sh"
echo ""
echo -e "5. ${YELLOW}Check API health:${NC}"
echo "   curl http://localhost:3001/api/health"
echo ""
echo -e "6. ${YELLOW}Check MCP servers:${NC}"
echo "   node scripts/verify-mcp.js"
echo ""
echo -e "7. ${YELLOW}Attempt to log in:${NC}"
echo "   Open the frontend URL and try logging in with a test user"
echo ""
echo -e "${BLUE}====================================${NC}" 