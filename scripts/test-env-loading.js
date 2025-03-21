#!/usr/bin/env node

/**
 * Environment Variable Loading Test Script
 * 
 * This script tests environment variable loading, including variable substitution.
 * It validates that .env files are correctly loaded and processed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import chalk from 'chalk';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Log a message with color
 */
function log(message, type = 'info') {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    header: chalk.bold.cyan,
  };
  
  console.log(colors[type](message));
}

/**
 * Create a test .env file with variable substitution
 */
async function createTestEnvFile() {
  const testEnvPath = path.join(projectRoot, '.env.test');
  const testEnvContent = `
# Test environment file with variable substitution
TEST_BASE_URL=https://test-project.supabase.co
TEST_SUPABASE_URL=\${TEST_BASE_URL}
TEST_SUPABASE_KEY=test-key-12345
TEST_REFERENCE_VAR=original-value
TEST_NESTED_VAR=\${TEST_REFERENCE_VAR}-extended
`;

  try {
    await fs.promises.writeFile(testEnvPath, testEnvContent);
    log(`Created test environment file at ${testEnvPath}`, 'success');
    return testEnvPath;
  } catch (error) {
    log(`Failed to create test environment file: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Test environment variable loading with dotenv
 */
function testDotenvLoading(envPath) {
  log('\nTEST 1: Basic dotenv loading', 'header');
  try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      log(`Failed to load environment file: ${result.error.message}`, 'error');
      return false;
    }
    
    log('Environment file loaded successfully with dotenv', 'success');
    return true;
  } catch (error) {
    log(`Error during dotenv loading: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test environment variable expansion with dotenv-expand
 */
function testDotenvExpand(envPath) {
  log('\nTEST 2: Variable substitution with dotenv-expand', 'header');
  try {
    // First load with dotenv
    const env = dotenv.config({ path: envPath });
    if (env.error) {
      log(`Failed to load environment file: ${env.error.message}`, 'error');
      return false;
    }
    
    // Then expand variables
    const expanded = dotenvExpand.expand(env);
    if (expanded.error) {
      log(`Failed to expand variables: ${expanded.error.message}`, 'error');
      return false;
    }
    
    // Check if variables were properly expanded
    const baseUrl = process.env.TEST_BASE_URL;
    const supabaseUrl = process.env.TEST_SUPABASE_URL;
    const referenceVar = process.env.TEST_REFERENCE_VAR;
    const nestedVar = process.env.TEST_NESTED_VAR;
    
    log('Environment variables after expansion:', 'info');
    log(`TEST_BASE_URL = ${baseUrl}`, 'info');
    log(`TEST_SUPABASE_URL = ${supabaseUrl}`, 'info');
    log(`TEST_NESTED_VAR = ${nestedVar}`, 'info');
    
    // Validate variable substitution
    const substitutionWorked = (
      baseUrl === supabaseUrl && 
      nestedVar === `${referenceVar}-extended` &&
      !supabaseUrl.includes('${') &&
      !nestedVar.includes('${')
    );
    
    if (substitutionWorked) {
      log('Variable substitution worked correctly!', 'success');
      return true;
    } else {
      log('Variable substitution did NOT work correctly', 'error');
      return false;
    }
  } catch (error) {
    log(`Error during dotenv-expand testing: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test actual application environment file
 */
function testApplicationEnvFile() {
  log('\nTEST 3: Testing actual application environment files', 'header');
  
  // Check for .env.local first, then .env
  const envLocalPath = path.join(projectRoot, '.env.local');
  const envPath = path.join(projectRoot, '.env');
  
  let testPath = null;
  
  if (fs.existsSync(envLocalPath)) {
    log(`Found .env.local file`, 'info');
    testPath = envLocalPath;
  } else if (fs.existsSync(envPath)) {
    log(`Found .env file`, 'info');
    testPath = envPath;
  } else {
    log('No .env or .env.local file found in project root', 'warning');
    return false;
  }
  
  try {
    // Reset environment before testing
    const keysToDelete = Object.keys(process.env)
      .filter(key => key.startsWith('VITE_') || key.startsWith('SUPABASE_'));
    
    keysToDelete.forEach(key => {
      delete process.env[key];
    });
    
    // Load with dotenv first
    const env = dotenv.config({ path: testPath });
    if (env.error) {
      log(`Failed to load application environment file: ${env.error.message}`, 'error');
      return false;
    }
    
    // Then expand variables
    const expanded = dotenvExpand.expand(env);
    if (expanded.error) {
      log(`Failed to expand variables in application environment file: ${expanded.error.message}`, 'error');
      return false;
    }
    
    // Check important environment variables
    const viteSupabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    log('Application environment variables after expansion:', 'info');
    log(`VITE_SUPABASE_URL = ${viteSupabaseUrl ? 'Present' : 'Missing'}`, viteSupabaseUrl ? 'success' : 'warning');
    log(`SUPABASE_URL = ${supabaseUrl ? 'Present' : 'Missing'}`, supabaseUrl ? 'success' : 'warning');
    log(`SUPABASE_SERVICE_ROLE_KEY = ${supabaseServiceKey ? 'Present (value hidden)' : 'Missing'}`, supabaseServiceKey ? 'success' : 'warning');
    log(`SUPABASE_KEY = ${supabaseKey ? 'Present (value hidden)' : 'Missing'}`, supabaseKey ? 'success' : 'warning');
    
    // Check for unresolved variable substitution
    const hasUnresolvedVars = 
      (viteSupabaseUrl && viteSupabaseUrl.includes('${')) ||
      (supabaseUrl && supabaseUrl.includes('${')) ||
      (supabaseServiceKey && supabaseServiceKey.includes('${')) ||
      (supabaseKey && supabaseKey.includes('${'));
    
    if (hasUnresolvedVars) {
      log('WARNING: Detected unresolved variable substitution in application environment variables', 'warning');
      log('This may cause issues with your application. Consider using explicit values instead.', 'warning');
      return false;
    }
    
    // Check if we have at least one URL and one key
    const hasUrl = viteSupabaseUrl || supabaseUrl;
    const hasKey = supabaseServiceKey || supabaseKey;
    
    if (hasUrl && hasKey) {
      log('Application environment variables loaded successfully!', 'success');
      return true;
    } else {
      log('Missing critical environment variables for application', 'error');
      return false;
    }
  } catch (error) {
    log(`Error testing application environment file: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Clean up test files
 */
async function cleanup(testEnvPath) {
  try {
    if (fs.existsSync(testEnvPath)) {
      await fs.promises.unlink(testEnvPath);
      log(`\nRemoved test environment file`, 'success');
    }
  } catch (error) {
    log(`Error during cleanup: ${error.message}`, 'error');
  }
}

/**
 * Main function
 */
async function main() {
  log('===============================================', 'header');
  log('ENVIRONMENT VARIABLE LOADING TEST', 'header');
  log('===============================================', 'header');
  
  let testEnvPath = null;
  
  try {
    // Create test environment file
    testEnvPath = await createTestEnvFile();
    
    // Run tests
    const test1Result = testDotenvLoading(testEnvPath);
    const test2Result = testDotenvExpand(testEnvPath);
    const test3Result = testApplicationEnvFile();
    
    // Report summary
    log('\n===============================================', 'header');
    log('TEST SUMMARY', 'header');
    log('===============================================', 'header');
    log(`Basic dotenv loading: ${test1Result ? 'PASSED' : 'FAILED'}`, test1Result ? 'success' : 'error');
    log(`Variable substitution: ${test2Result ? 'PASSED' : 'FAILED'}`, test2Result ? 'success' : 'error');
    log(`Application env file: ${test3Result ? 'PASSED' : 'FAILED'}`, test3Result ? 'success' : 'error');
    
    // Provide recommendations based on test results
    log('\n===============================================', 'header');
    log('RECOMMENDATIONS', 'header');
    log('===============================================', 'header');
    
    if (!test2Result) {
      log('❌ Variable substitution is not working correctly.', 'error');
      log('RECOMMENDED ACTION: Use explicit values in your environment files instead of ${VAR} syntax.', 'warning');
    }
    
    if (!test3Result) {
      log('❌ Application environment file has issues.', 'error');
      log('RECOMMENDED ACTIONS:', 'warning');
      log('1. Check that your .env.local file exists and contains all required variables', 'warning');
      log('2. Ensure that VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or their alternatives) are properly set', 'warning');
      log('3. Use explicit values instead of variable substitution if that is causing problems', 'warning');
    }
    
    if (test1Result && test2Result && test3Result) {
      log('✅ All tests passed! Your environment configuration is working correctly.', 'success');
    }
    
  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'error');
  } finally {
    // Clean up
    if (testEnvPath) {
      await cleanup(testEnvPath);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 