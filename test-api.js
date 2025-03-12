// Test script for /api/learning/programs API endpoint
// This script will make a direct call to the API using a valid token
const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Replace this with a valid auth token for testing
    // You can get this from your browser's cookies after login
    const authToken = process.env.TEST_AUTH_TOKEN || 'your-auth-token';
    
    console.log('Making API request to /api/learning/programs...');
    const response = await fetch('http://localhost:3000/api/learning/programs', {
      headers: {
        'Cookie': `sb-refresh-token=${authToken}`,
      },
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
    if (response.status === 307) {
      console.log('Redirect to:', response.headers.get('location'));
      console.log('Authentication issue: The token is not valid or the endpoint is not accepting it.');
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI(); 