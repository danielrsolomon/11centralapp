/**
 * E11EVEN Central App - MCP Server Verification Script
 * 
 * This script checks connectivity to MCP servers and verifies
 * they are responding correctly.
 * 
 * Usage:
 *   node scripts/verify-mcp.js
 */

import http from 'http';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// MCP server configurations
const mcpServers = [
  { 
    name: 'Supabase MCP', 
    port: process.env.MCP_SUPABASE_PORT || 8000, 
    path: '/mcp',
    // For Supabase MCP, both 200 and 400 with "Invalid JSON" are valid responses
    validateResponse: (statusCode, data) => 
      statusCode === 200 || (statusCode === 400 && data.includes('Invalid JSON'))
  },
  { 
    name: 'Web Search MCP', 
    port: process.env.MCP_WEBSEARCH_PORT || 8100, 
    path: '/health',
    // For Web Search MCP, only 200 is a valid response
    validateResponse: (statusCode) => statusCode === 200
  }
];

/**
 * Log information to the console with colors
 */
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Make an HTTP request to check server status
 */
function checkServer(name, port, path, validateResponse) {
  return new Promise((resolve) => {
    log(`Checking ${name} server on port ${port}...`, colors.blue);
    
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Use the custom validation function to determine if response is valid
        const isValid = validateResponse(res.statusCode, data);
        
        if (isValid) {
          log(`✅ ${name} server is running (Status: ${res.statusCode})`, colors.green);
          try {
            // Try to parse the response as JSON to provide additional info
            const response = JSON.parse(data);
            log(`   Server info: ${JSON.stringify(response, null, 2)}`, colors.white);
          } catch (error) {
            // If not JSON, show the raw response (limited to 100 chars)
            log(`   Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`, colors.white);
          }
          resolve(true);
        } else {
          log(`❌ ${name} server returned status code ${res.statusCode}`, colors.yellow);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ ${name} server is not responding: ${error.message}`, colors.red);
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      log(`❌ ${name} server request timed out`, colors.red);
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Main function to verify MCP servers
 */
async function verifyMcpServers() {
  log('\n🔍 E11EVEN Central App - MCP Server Verification\n', colors.cyan);
  
  let allServersRunning = true;
  
  for (const server of mcpServers) {
    const isRunning = await checkServer(server.name, server.port, server.path, server.validateResponse);
    if (!isRunning) {
      allServersRunning = false;
    }
    console.log(); // Add space between server checks
  }
  
  console.log();
  if (allServersRunning) {
    log('✅ All MCP servers are running correctly!\n', colors.green);
  } else {
    log('❌ Some MCP servers are not running or responding correctly.\n', colors.red);
    log('Troubleshooting tips:', colors.yellow);
    log('1. Ensure scripts are executable: chmod +x start-mcp-supabase.sh start-websearch-mcp.sh', colors.white);
    log('2. Check .env.local for proper MCP configuration', colors.white);
    log('3. Review server logs for error messages', colors.white);
    log('4. Try starting servers manually:', colors.white);
    log('   - Supabase MCP: ./start-mcp-supabase.sh', colors.white);
    log('   - Web Search MCP: ./start-websearch-mcp.sh', colors.white);
    log('5. Or start both with: ./start-mcp-services.sh\n', colors.white);
  }
}

// Run the verification
verifyMcpServers().catch((error) => {
  log(`\n❌ Error running verification: ${error.message}\n`, colors.red);
  process.exit(1);
}); 