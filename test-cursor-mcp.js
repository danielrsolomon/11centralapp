// Test script for the MCP server using Cursor's approach
const http = require('http');

// Function to create an MCP request (similar to how Cursor would do it)
function makeMcpRequest(prompt, tools = []) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3100,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
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
    
    // This is closer to how Cursor would structure the request
    const requestBody = JSON.stringify({
      prompt: prompt,
      tools: tools,
      id: Date.now().toString()
    });
    
    console.log('Sending Cursor-style request:', requestBody);
    req.write(requestBody);
    req.end();
  });
}

// Test using a simple prompt
async function testCursorMcp() {
  console.log('Testing Cursor-style MCP request...');
  
  try {
    // Try a very simple prompt
    const response = await makeMcpRequest("Can you show me all tables in the database?", []);
    console.log('MCP Response:', JSON.stringify(response, null, 2));
    console.log('MCP test completed!');
  } catch (error) {
    console.error('MCP test failed:', error.message);
  }
}

// Run the test
testCursorMcp(); 