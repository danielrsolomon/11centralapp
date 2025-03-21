#!/usr/bin/env node

const http = require('http');

// Configuration
const HOST = 'localhost';
const PORT = 8000; // MCP port numbering scheme: MCP-Supabase on 8000, MCP-WebSearch on 8100, etc.
const TIMEOUT = 10000;

/**
 * Make a JSON-RPC 2.0 request to the MCP server
 * @param {string} method - The JSON-RPC method to call
 * @param {Object} params - Parameters for the method
 * @returns {Promise<any>} - The response from the server
 */
function jsonRpcRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    const requestData = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: requestId
    });

    console.log(`\n[REQUEST] ${method}`, JSON.stringify(params, null, 2));

    const options = {
      hostname: HOST,
      port: PORT,
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
        console.log(`[RESPONSE] Status: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          console.log(JSON.stringify(response, null, 2));
          resolve(response);
        } catch (err) {
          console.error('Error parsing response:', err);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });

    // Set timeout
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${TIMEOUT}ms`));
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Test the echo tool
 */
async function testEcho() {
  console.log('\n======== TESTING ECHO ========');
  
  // Standard JSON-RPC method call format
  try {
    await jsonRpcRequest('rpc.methodCall', {
      name: 'echo',
      args: { message: 'Hello from MCP test!' }
    });
  } catch (err) {
    console.error('Echo test failed:', err);
  }
  
  // Direct method call format (for backward compatibility)
  try {
    await jsonRpcRequest('echo', { message: 'Hello from direct method call!' });
  } catch (err) {
    console.error('Direct echo test failed:', err);
  }
  
  // tools/call format (Cursor-style)
  try {
    await jsonRpcRequest('tools/call', {
      name: 'echo',
      arguments: { message: 'Hello from tools/call!' }
    });
  } catch (err) {
    console.error('Tools/call echo test failed:', err);
  }
}

/**
 * Test the Supabase table access
 */
async function testTableAccess() {
  console.log('\n======== TESTING TABLE ACCESS ========');
  
  // Standard JSON-RPC method call format
  try {
    await jsonRpcRequest('rpc.methodCall', {
      name: 'test_table_access',
      args: {}
    });
  } catch (err) {
    console.error('Table access test failed:', err);
  }
  
  // Direct method call format
  try {
    await jsonRpcRequest('test_table_access', {});
  } catch (err) {
    console.error('Direct table access test failed:', err);
  }
  
  // tools/call format
  try {
    await jsonRpcRequest('tools/call', {
      name: 'test_table_access',
      arguments: {}
    });
  } catch (err) {
    console.error('Tools/call table access test failed:', err);
  }
}

/**
 * Test listing all tools
 */
async function testListTools() {
  console.log('\n======== TESTING TOOLS LIST ========');
  
  try {
    await jsonRpcRequest('tools/list');
  } catch (err) {
    console.error('List tools test failed:', err);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n===== TESTING MCP-SUPABASE SERVER (${HOST}:${PORT}) =====\n`);
  
  try {
    await testListTools();
    await testEcho();
    await testTableAccess();
    
    console.log('\n======== ALL TESTS COMPLETED ========');
  } catch (err) {
    console.error('Tests failed with error:', err);
    process.exit(1);
  }
}

// Run the tests
runTests(); 