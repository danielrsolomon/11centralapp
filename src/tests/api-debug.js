/**
 * API Debug Test Script
 * 
 * This script tests the response format of key API endpoints that are
 * showing "Invalid response format" errors in the UI.
 * 
 * To run, execute with Node.js:
 * node src/tests/api-debug.js
 */

const fetch = require('node-fetch');

// Configuration
const API_HOST = 'http://localhost:5147'; // Change this to match your server port

// Utility functions
const formatResponse = (data) => {
  try {
    // Print a summary of the response
    return {
      success: data.success,
      hasData: data.data !== undefined,
      dataType: data.data ? Array.isArray(data.data) ? 'array' : typeof data.data : 'undefined',
      dataLength: Array.isArray(data.data) ? data.data.length : 'n/a',
      firstItem: Array.isArray(data.data) && data.data.length > 0 
        ? JSON.stringify(data.data[0]).substring(0, 100) + '...' 
        : 'none',
      hasError: data.error !== undefined,
      errorMessage: data.error ? data.error.message : 'none'
    };
  } catch (e) {
    return `Error formatting response: ${e.message}`;
  }
};

// Test functions
async function testEndpoint(url, options = {}) {
  try {
    console.log(`\n🔍 Testing endpoint: ${url}`);
    
    const response = await fetch(`${API_HOST}${url}`, {
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Error: Invalid content type: ${contentType}`);
      return;
    }
    
    // Get response text
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error('❌ Error: Empty response body');
      return;
    }
    
    console.log(`📝 Raw Response (first 200 chars): ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    
    // Try to parse JSON
    try {
      const data = JSON.parse(text);
      console.log(`📦 Parsed Response Structure:`, formatResponse(data));
      
      // Detailed validation
      if (data.success === undefined) {
        console.error('❌ Error: Missing "success" field in response');
      }
      
      if (data.data === undefined && data.error === undefined) {
        console.error('❌ Error: Response missing both "data" and "error" fields');
      }
      
      return data;
    } catch (parseError) {
      console.error(`❌ Error parsing JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error(`❌ Network error: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API Debug Tests');
  
  // Test the content hierarchy endpoint
  await testEndpoint('/api/university/content/hierarchy');
  
  // Test the programs endpoint
  await testEndpoint('/api/university/programs');
  
  console.log('\n✅ API Debug Tests Complete');
}

// Execute tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
}); 