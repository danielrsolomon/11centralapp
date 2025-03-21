/**
 * Test Script to Verify Authentication Fixes
 * 
 * This script tests the university endpoints to confirm that:
 * 1. They properly reject unauthorized requests
 * 2. They accept properly authenticated requests
 * 
 * Run with: node src/tests/test-auth-fix.js
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN;

// Endpoints to test
const ENDPOINTS = [
  '/api/university/programs',
  '/api/university/content/hierarchy'
];

/**
 * Test an endpoint with and without authentication
 * @param {string} endpoint - The API endpoint to test
 */
async function testEndpoint(endpoint) {
  console.log(`\n===== Testing Endpoint: ${endpoint} =====`);
  
  // Test 1: Without auth token (should fail with 401)
  try {
    console.log('Testing without authentication...');
    const unauthResponse = await fetch(`${BASE_URL}${endpoint}`);
    
    console.log(`Status: ${unauthResponse.status}`);
    
    if (unauthResponse.status === 401) {
      console.log('✓ SUCCESS: Endpoint properly rejected unauthenticated request');
    } else {
      console.log('✗ FAILURE: Endpoint should return 401 for unauthenticated requests');
    }
    
    const unauthData = await unauthResponse.json().catch(() => ({}));
    console.log('Response:', JSON.stringify(unauthData, null, 2));
  } catch (error) {
    console.error('Error testing unauthenticated request:', error.message);
  }
  
  // Test 2: With auth token (should succeed with 200)
  if (TEST_TOKEN) {
    try {
      console.log('\nTesting with authentication...');
      const authResponse = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      
      console.log(`Status: ${authResponse.status}`);
      
      if (authResponse.status === 200) {
        console.log('✓ SUCCESS: Endpoint accepted authenticated request');
      } else {
        console.log('✗ FAILURE: Endpoint should return 200 for authenticated requests');
      }
      
      const authData = await authResponse.json().catch(() => ({}));
      console.log('Response contains data:', !!authData.data);
      console.log('Response success:', authData.success);
    } catch (error) {
      console.error('Error testing authenticated request:', error.message);
    }
  } else {
    console.log('\n⚠ Skipping authenticated test: No TEST_AUTH_TOKEN provided.');
    console.log('To test authenticated requests, set the TEST_AUTH_TOKEN environment variable.');
  }
}

/**
 * Run all tests sequentially
 */
async function runTests() {
  console.log('🔍 Starting Authentication Fix Verification Tests');
  console.log('================================================');
  
  if (!TEST_TOKEN) {
    console.warn('\n⚠ Warning: TEST_AUTH_TOKEN environment variable not set.');
    console.warn('Only unauthenticated tests will be run.');
    console.warn('To run authenticated tests, set TEST_AUTH_TOKEN to a valid auth token.');
  }
  
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n================================================');
  console.log('🏁 Authentication Fix Verification Tests Complete');
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
}); 