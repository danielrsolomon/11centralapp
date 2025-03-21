#!/usr/bin/env node

const http = require('http');

// Configuration
const HOST = 'localhost';
const PORT = 8100;
const TIMEOUT = 10000;

/**
 * Make a request to the WebSearch MCP server
 * @param {string} query - The search query
 * @returns {Promise<any>} - The response from the server
 */
function searchRequest(query) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      query
    });

    console.log(`\n[REQUEST] Search query: "${query}"`);

    const options = {
      hostname: HOST,
      port: PORT,
      path: '/search',
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
          
          if (response.error) {
            console.log(`❌ Error: ${response.error}`);
            reject(new Error(response.error));
            return;
          }
          
          console.log(`✅ Success! Found ${response.results.length} results`);
          console.log(`📊 Response time: ${response.response_time}ms`);
          console.log(`🕒 Timestamp: ${response.timestamp}`);
          console.log(`ℹ️ Message: ${response.message}`);
          console.log(`🔄 Using mock data: ${response.is_mock ? 'Yes' : 'No'}`);
          
          // Print the first result
          if (response.results.length > 0) {
            const firstResult = response.results[0];
            console.log('\n📑 First result:');
            console.log(`  📌 Title: ${firstResult.title}`);
            console.log(`  🔗 URL: ${firstResult.url}`);
            console.log(`  📝 Description: ${firstResult.description.substring(0, 100)}...`);
          }
          
          resolve(response);
        } catch (err) {
          console.error('Error parsing response:', err);
          console.error('Raw response:', data);
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
 * Run the test with the provided query
 */
async function runTest() {
  console.log(`\n===== TESTING WEB SEARCH MCP SERVER (${HOST}:${PORT}) =====\n`);
  
  const query = process.argv[2] || 'latest AI news';
  
  try {
    console.log('Testing Web Search MCP server...');
    await searchRequest(query);
    console.log('\n✅ Test completed successfully!');
  } catch (err) {
    console.log('\n❌ Error testing Web Search MCP server:');
    console.log(`Status: ${err.status || 'Unknown'}`);
    console.log(`Error message: ${err.message || 'Unknown error'}`);
  }
}

// Run the test
runTest(); 