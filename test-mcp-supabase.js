// Simple script to test MCP-Supabase connectivity
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3100, // The port used by the MCP server
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Function to make a request to the MCP server
function makeMcpRequest(method, params) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: Date.now()
    });
    
    console.log('Sending request:', requestBody);
    req.write(requestBody);
    req.end();
  });
}

// Test database connection with valid methods
async function testMcpSupabase() {
  console.log('Testing MCP-Supabase connection on port 3100...');
  
  try {
    // Test the echo tool first (simplest case)
    console.log('\n--- Testing echo tool ---');
    const echoResponse = await makeMcpRequest('echo', {
      message: 'Hello MCP Supabase!'
    });
    console.log('Response from echo:', JSON.stringify(echoResponse, null, 2));
    
    // Test table analysis tool
    console.log('\n--- Testing analyze_table_structure tool ---');
    const analyzeResponse = await makeMcpRequest('analyze_table_structure', {});
    console.log('Response from analyze_table_structure:', JSON.stringify(analyzeResponse, null, 2));
    
    // Test specific table access
    console.log('\n--- Testing test_table_access tool ---');
    const tableTestResponse = await makeMcpRequest('test_table_access', {
      table_name: 'users' // Assuming there's a users table
    });
    console.log('Response from test_table_access:', JSON.stringify(tableTestResponse, null, 2));
    
    console.log('\nMCP-Supabase connection test completed!');
  } catch (error) {
    console.error('MCP-Supabase connection test failed:', error.message);
  }
}

// Run the test
testMcpSupabase(); 