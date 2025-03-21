// Updated script to test MCP-Supabase connectivity
const http = require('http');

// Function to make a request to the MCP server
function mcpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method,
      params
    });

    const options = {
      hostname: 'localhost',
      port: 3100,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    console.log('Sending request:', requestData);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// First, get the list of available tools
async function listTools() {
  try {
    console.log('\n--- Testing tools/list ---');
    const response = await mcpRequest('tools/list');
    console.log('Available tools:', JSON.stringify(response, null, 2));
    return response.result?.tools || [];
  } catch (error) {
    console.error('Error listing tools:', error);
    return [];
  }
}

// Try the echo tool
async function testEcho() {
  try {
    console.log('\n--- Testing tools/call with echo ---');
    const response = await mcpRequest('tools/call', {
      name: 'echo',
      arguments: {
        message: 'Hello MCP Supabase!'
      }
    });
    console.log('Echo response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error with echo tool:', error);
  }
}

// Try the test_table_access tool
async function testTableAccess() {
  try {
    console.log('\n--- Testing tools/call with test_table_access ---');
    const response = await mcpRequest('tools/call', {
      name: 'test_table_access',
      arguments: {
        table_name: 'users'
      }
    });
    console.log('Table access response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error with test_table_access tool:', error);
  }
}

// Run the tests
async function runTests() {
  console.log('Testing MCP-Supabase integration on port 3100...');
  await listTools();
  await testEcho();
  await testTableAccess();
  console.log('\nTests completed');
}

runTests(); 