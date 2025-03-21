#!/usr/bin/env node

/**
 * Run Authentication Flow Tests
 * 
 * This script sets up the environment and runs the authentication flow tests.
 * It ensures that all required environment variables are available and that
 * the API server is running before executing the tests.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get current file directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env.local file found. Using existing environment variables.');
}

// Test credentials - override with environment variables if available
const testCredentials = {
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'password123',
  API_URL: process.env.API_URL || 'http://localhost:3001'
};

// Check if API server is running
function checkApiServer() {
  return new Promise((resolve) => {
    const req = http.get(`${testCredentials.API_URL}/api/health`, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log('✅ API server is running');
              resolve(true);
            } else {
              console.log('❌ API server is not healthy');
              resolve(false);
            }
          } catch (e) {
            console.log('❌ API server returned invalid response');
            resolve(false);
          }
        });
      } else {
        console.log(`❌ API server returned status code ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`❌ API server is not running: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

// Run Mocha tests
function runTests() {
  console.log('\n📋 Running authentication flow tests...\n');
  
  // Set test environment variables
  const testEnv = {
    ...process.env,
    ...testCredentials
  };
  
  // Run tests using Mocha
  const mochaPath = path.resolve(process.cwd(), 'node_modules/.bin/mocha');
  const testPath = path.resolve(process.cwd(), 'tests/api/auth-flow.test.js');
  
  const testProcess = spawn(mochaPath, ['--experimental-modules', '--no-warnings', testPath], {
    env: testEnv,
    stdio: 'inherit'
  });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Authentication flow tests completed successfully');
    } else {
      console.log(`\n❌ Authentication flow tests failed with code ${code}`);
    }
    process.exit(code);
  });
}

// Main execution
async function main() {
  console.log('🔍 Checking API server status...');
  const isApiRunning = await checkApiServer();
  
  if (!isApiRunning) {
    console.log('\n❌ API server must be running to execute authentication tests');
    console.log('   Please start the API server with: npm run api:start');
    process.exit(1);
  }
  
  // Display test configuration
  console.log('\n📋 Test configuration:');
  console.log(`   API URL: ${testCredentials.API_URL}`);
  console.log(`   Test User: ${testCredentials.TEST_USER_EMAIL}`);
  
  // Run the tests
  runTests();
}

// Execute the main function
main().catch((err) => {
  console.error('❌ Error running tests:', err);
  process.exit(1);
}); 