#!/usr/bin/env node

/**
 * E11EVEN Central App - Health Check Script
 * 
 * This script verifies the health of all services (API, Frontend, MCP-Supabase, MCP-WebSearch)
 * and generates a comprehensive status report.
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';
import fs from 'fs';

// Define service endpoints
const services = {
  api: {
    name: 'API Server',
    url: 'http://localhost:3001/api/health',
    method: 'GET'
  },
  frontend: {
    name: 'Frontend Server',
    url: 'http://localhost:5174/',
    method: 'GET'
  },
  mcpSupabase: {
    name: 'MCP-Supabase Server',
    url: 'http://localhost:8000/rpc',
    method: 'POST',
    body: { jsonrpc: '2.0', id: 1 }
  },
  mcpWebSearch: {
    name: 'MCP-WebSearch Server',
    url: 'http://localhost:8100/health',
    method: 'GET'
  }
};

// Results storage
const results = {
  services: {},
  environment: null,
  mcpVerification: null
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Check a single service
async function checkService(key, service) {
  console.log(`\n${colors.blue}Checking ${service.name}...${colors.reset}`);
  
  try {
    const options = {
      method: service.method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (service.body) {
      options.body = JSON.stringify(service.body);
    }
    
    const response = await fetch(service.url, options);
    let content = null;
    
    // If frontend, just check for 200 status
    if (key === 'frontend') {
      content = { status: 'ok', message: 'Frontend is serving HTML content' };
      results.services[key] = {
        status: response.status === 200 ? 'up' : 'down',
        statusCode: response.status,
        message: response.status === 200 ? 'Frontend is serving content' : 'Failed to serve content',
        response: content
      };
    } else {
      // For API and MCP servers, parse the JSON response
      try {
        content = await response.json();
      } catch (e) {
        content = { error: 'Failed to parse JSON response' };
      }
      
      results.services[key] = {
        status: response.status === 200 ? 'up' : (key === 'mcpSupabase' && response.status === 400 ? 'up' : 'down'),
        statusCode: response.status,
        message: response.status === 200 ? 'Service is healthy' : 
                (key === 'mcpSupabase' && response.status === 400 ? 'Service is running but returned 400 (expected for empty request)' : 'Service returned non-200 status'),
        response: content
      };
    }
    
    // Print status
    const statusEmoji = results.services[key].status === 'up' ? '✅' : '❌';
    const statusColor = results.services[key].status === 'up' ? colors.green : colors.red;
    console.log(`${statusEmoji} ${statusColor}${service.name}: ${results.services[key].status.toUpperCase()} (Status: ${results.services[key].statusCode})${colors.reset}`);
    
    if (content && typeof content === 'object') {
      console.log('   Response:', JSON.stringify(content, null, 2).slice(0, 500) + (JSON.stringify(content, null, 2).length > 500 ? '...' : ''));
    }
    
  } catch (error) {
    results.services[key] = {
      status: 'down',
      statusCode: null,
      message: `Failed to connect: ${error.message}`,
      error: error.message
    };
    console.log(`❌ ${colors.red}${service.name}: DOWN (Connection failed: ${error.message})${colors.reset}`);
  }
}

// Run MCP verification script
function runMCPVerification() {
  console.log(`\n${colors.blue}Running MCP verification script...${colors.reset}`);
  try {
    const output = execSync('node scripts/verify-mcp.js').toString();
    results.mcpVerification = {
      status: 'success',
      output: output
    };
    console.log(output);
  } catch (error) {
    results.mcpVerification = {
      status: 'error',
      error: error.message,
      output: error.stdout ? error.stdout.toString() : null
    };
    console.log(`❌ ${colors.red}MCP verification failed: ${error.message}${colors.reset}`);
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
  }
}

// Run environment test
function runEnvironmentTest() {
  console.log(`\n${colors.blue}Running environment test...${colors.reset}`);
  try {
    const output = execSync('node scripts/test-env-loading.js').toString();
    results.environment = {
      status: 'success',
      output: output
    };
    console.log(output);
  } catch (error) {
    results.environment = {
      status: 'error',
      error: error.message,
      output: error.stdout ? error.stdout.toString() : null
    };
    console.log(`❌ ${colors.red}Environment test failed: ${error.message}${colors.reset}`);
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
  }
}

// Run authentication tests
async function runAuthenticationTest() {
  console.log(`\n${colors.blue}Running authentication unit tests...${colors.reset}`);
  try {
    const output = execSync('npm run test:auth:unit').toString();
    results.authTests = {
      status: 'success',
      output: output
    };
    console.log(output);
  } catch (error) {
    results.authTests = {
      status: 'error',
      error: error.message,
      output: error.stdout ? error.stdout.toString() : null
    };
    console.log(`❌ ${colors.red}Authentication tests failed: ${error.message}${colors.reset}`);
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
  }
}

// Generate the final summary report
function generateSummaryReport() {
  console.log(`\n${colors.cyan}=====================================${colors.reset}`);
  console.log(`${colors.cyan}      SYSTEM STATUS SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}\n`);
  
  // Services status
  console.log(`${colors.magenta}Services Status:${colors.reset}`);
  let allServicesUp = true;
  Object.entries(results.services).forEach(([key, data]) => {
    const serviceName = services[key].name;
    const statusEmoji = data.status === 'up' ? '✅' : '❌';
    const statusColor = data.status === 'up' ? colors.green : colors.red;
    console.log(`  ${statusEmoji} ${statusColor}${serviceName}: ${data.status.toUpperCase()}${colors.reset}`);
    
    if (data.status !== 'up') {
      allServicesUp = false;
    }
  });
  
  // Environment test result
  console.log(`\n${colors.magenta}Environment Configuration:${colors.reset}`);
  if (results.environment) {
    const statusEmoji = results.environment.status === 'success' ? '✅' : '❌';
    const statusColor = results.environment.status === 'success' ? colors.green : colors.red;
    console.log(`  ${statusEmoji} ${statusColor}Environment Test: ${results.environment.status.toUpperCase()}${colors.reset}`);
  } else {
    console.log(`  ❓ ${colors.yellow}Environment Test: NOT RUN${colors.reset}`);
  }
  
  // MCP verification result
  console.log(`\n${colors.magenta}MCP Verification:${colors.reset}`);
  if (results.mcpVerification) {
    const statusEmoji = results.mcpVerification.status === 'success' ? '✅' : '❌';
    const statusColor = results.mcpVerification.status === 'success' ? colors.green : colors.red;
    console.log(`  ${statusEmoji} ${statusColor}MCP Verification: ${results.mcpVerification.status.toUpperCase()}${colors.reset}`);
  } else {
    console.log(`  ❓ ${colors.yellow}MCP Verification: NOT RUN${colors.reset}`);
  }
  
  // Authentication tests result
  console.log(`\n${colors.magenta}Authentication System:${colors.reset}`);
  if (results.authTests) {
    const statusEmoji = results.authTests.status === 'success' ? '✅' : '❌';
    const statusColor = results.authTests.status === 'success' ? colors.green : colors.red;
    console.log(`  ${statusEmoji} ${statusColor}Authentication Tests: ${results.authTests.status.toUpperCase()}${colors.reset}`);
  } else {
    console.log(`  ❓ ${colors.yellow}Authentication Tests: NOT RUN${colors.reset}`);
  }
  
  // Overall system status
  const environmentSuccess = results.environment && results.environment.status === 'success';
  const mcpSuccess = results.mcpVerification && results.mcpVerification.status === 'success';
  const authSuccess = results.authTests && results.authTests.status === 'success';
  
  const allSystemsGo = allServicesUp && environmentSuccess && mcpSuccess && authSuccess;
  
  console.log(`\n${colors.magenta}Overall System Status:${colors.reset}`);
  if (allSystemsGo) {
    console.log(`  ✅ ${colors.green}ALL SYSTEMS OPERATIONAL${colors.reset}`);
  } else {
    console.log(`  ❌ ${colors.red}SYSTEM PARTIALLY OPERATIONAL${colors.reset}`);
    console.log(`  ℹ️ ${colors.yellow}Check the detailed output above for issues.${colors.reset}`);
  }
  
  // Save the full results to a file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `health-check-${timestamp}.json`;
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`\n📋 ${colors.cyan}Full report saved to: ${filePath}${colors.reset}`);
  
  return allSystemsGo;
}

// Main function to run all checks
async function main() {
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  console.log(`${colors.cyan}    E11EVEN CENTRAL HEALTH CHECK${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  console.log(`${colors.yellow}Time: ${new Date().toISOString()}${colors.reset}`);
  
  // Check each service
  const serviceChecks = Object.entries(services).map(([key, service]) => 
    checkService(key, service)
  );
  
  await Promise.all(serviceChecks);
  
  // Run additional verifications
  runMCPVerification();
  runEnvironmentTest();
  await runAuthenticationTest();
  
  // Generate and print the summary report
  const success = generateSummaryReport();
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error running health check: ${error}${colors.reset}`);
  process.exit(1);
}); 