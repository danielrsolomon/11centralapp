import http from 'http';

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
      port: 8000,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

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
    const response = await mcpRequest('tools/list');
    console.log('Available tools:', JSON.stringify(response, null, 2));
    return response.result?.tools || [];
  } catch (error) {
    console.error('Error listing tools:', error);
    return [];
  }
}

// Query departments using queryTable tool
async function queryDepartments() {
  try {
    const response = await mcpRequest('tools/call', {
      name: 'queryTable',
      arguments: {
        table: 'departments',
        select: '*'
      }
    });
    console.log('Departments query result:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error querying departments:', error);
  }
}

// Run the tests
async function runTests() {
  console.log('Testing MCP integration...');
  await listTools();
  await queryDepartments();
  console.log('Tests completed');
}

runTests(); 