import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key for full access
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const API_URL = 'http://localhost:5173/api'; // Adjust if your dev server uses a different port
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || 'test-admin-token'; // Replace with a valid admin token for testing

// Test tables
const TABLES_TO_TEST = ['programs', 'courses', 'lessons', 'modules'];

// Create test directory if it doesn't exist
const TEST_RESULTS_DIR = path.join(__dirname, 'test-results');
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Helper function to log results to file
function logResult(testName: string, result: any) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(TEST_RESULTS_DIR, `${testName}-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${filePath}`);
}

// Helper function to remove order columns for testing
async function removeOrderColumns() {
  console.log('Removing order columns from tables for testing...');
  
  for (const table of TABLES_TO_TEST) {
    try {
      // Check if the column exists first
      const { data: columnExists, error: checkError } = await supabase
        .rpc('execute_sql', {
          query: `SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = '${table}' AND column_name = 'order'
          );`
        });
      
      if (checkError) {
        console.error(`Error checking if order column exists in ${table}:`, checkError);
        continue;
      }
      
      // If the column exists, remove it
      if (columnExists && columnExists[0] && columnExists[0].exists) {
        console.log(`Removing order column from ${table}...`);
        const { error: dropError } = await supabase
          .rpc('execute_sql', {
            query: `ALTER TABLE ${table} DROP COLUMN IF EXISTS "order";`
          });
        
        if (dropError) {
          console.error(`Error removing order column from ${table}:`, dropError);
        } else {
          console.log(`Successfully removed order column from ${table}`);
        }
      } else {
        console.log(`No order column exists in ${table}, skipping removal`);
      }
    } catch (error) {
      console.error(`Unexpected error removing order column from ${table}:`, error);
    }
  }
}

// Helper function to check if order columns exist
async function checkOrderColumnsExist() {
  console.log('Checking if order columns exist in tables...');
  const results: { [key: string]: boolean } = {};
  
  for (const table of TABLES_TO_TEST) {
    try {
      const { data, error } = await supabase
        .rpc('execute_sql', {
          query: `SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = '${table}' AND column_name = 'order'
          );`
        });
      
      if (error) {
        console.error(`Error checking if order column exists in ${table}:`, error);
        results[table] = false;
        continue;
      }
      
      results[table] = data && data[0] && data[0].exists;
      console.log(`Table ${table} has order column: ${results[table]}`);
    } catch (error) {
      console.error(`Unexpected error checking if order column exists in ${table}:`, error);
      results[table] = false;
    }
  }
  
  return results;
}

// Test Case 1: Test the schema operations endpoint with a valid admin token
async function testSchemaOperationsSuccess() {
  console.log('=== TEST CASE 1: Test schema operations endpoint with valid admin token ===');
  
  try {
    // First, remove order columns to ensure the test has columns to add
    await removeOrderColumns();
    
    // Verify columns were removed
    const beforeColumns = await checkOrderColumnsExist();
    console.log('Before API call:', beforeColumns);
    
    // Call the API endpoint
    const response = await fetch(`${API_URL}/admin/schema/fix-order-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
    // Check if the API call was successful
    if (!response.ok) {
      console.error('API call failed:', result);
      logResult('schema-operations-failure', { 
        status: response.status, 
        statusText: response.statusText,
        result 
      });
      return;
    }
    
    // Verify order columns were added
    const afterColumns = await checkOrderColumnsExist();
    console.log('After API call:', afterColumns);
    
    // Check if all tables now have order columns
    const allColumnsAdded = Object.values(afterColumns).every(exists => exists);
    
    if (allColumnsAdded) {
      console.log('SUCCESS: All order columns were added successfully');
    } else {
      console.error('FAILURE: Not all order columns were added');
    }
    
    // Log the test results
    logResult('schema-operations-success', {
      apiResponse: result,
      beforeColumns,
      afterColumns,
      success: allColumnsAdded
    });
  } catch (error) {
    console.error('Error in testSchemaOperationsSuccess:', error);
    logResult('schema-operations-error', { error: String(error) });
  }
}

// Test Case 2: Test the schema operations endpoint with an invalid token
async function testSchemaOperationsUnauthorized() {
  console.log('=== TEST CASE 2: Test schema operations endpoint with invalid token ===');
  
  try {
    // Call the API endpoint with an invalid token
    const response = await fetch(`${API_URL}/admin/schema/fix-order-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
    // Check if the API call was denied as expected
    if (response.status === 401) {
      console.log('SUCCESS: Unauthorized access was correctly rejected');
    } else {
      console.error(`FAILURE: Expected 401 status code, got ${response.status}`);
    }
    
    // Log the test results
    logResult('schema-operations-unauthorized', {
      status: response.status,
      statusText: response.statusText,
      result
    });
  } catch (error) {
    console.error('Error in testSchemaOperationsUnauthorized:', error);
    logResult('schema-operations-unauthorized-error', { error: String(error) });
  }
}

// Test Case 3: Test the schema operations endpoint with no authentication
async function testSchemaOperationsNoAuth() {
  console.log('=== TEST CASE 3: Test schema operations endpoint with no authentication ===');
  
  try {
    // Call the API endpoint without an auth token
    const response = await fetch(`${API_URL}/admin/schema/fix-order-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
    // Check if the API call was denied as expected
    if (response.status === 401) {
      console.log('SUCCESS: Unauthenticated access was correctly rejected');
    } else {
      console.error(`FAILURE: Expected 401 status code, got ${response.status}`);
    }
    
    // Log the test results
    logResult('schema-operations-no-auth', {
      status: response.status,
      statusText: response.statusText,
      result
    });
  } catch (error) {
    console.error('Error in testSchemaOperationsNoAuth:', error);
    logResult('schema-operations-no-auth-error', { error: String(error) });
  }
}

// Test Case 4: Test adding order columns when they already exist
async function testSchemaOperationsIdempotent() {
  console.log('=== TEST CASE 4: Test schema operations endpoint when columns already exist ===');
  
  try {
    // First, make sure order columns exist
    // Call the API endpoint once to add columns
    await fetch(`${API_URL}/admin/schema/fix-order-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    // Verify order columns exist
    const beforeColumns = await checkOrderColumnsExist();
    console.log('Before second API call:', beforeColumns);
    
    // Call the API endpoint again
    const response = await fetch(`${API_URL}/admin/schema/fix-order-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    const result = await response.json();
    console.log('API Response (second call):', result);
    
    // Check if the API call was successful
    if (!response.ok) {
      console.error('API call failed:', result);
      logResult('schema-operations-idempotent-failure', { 
        status: response.status, 
        statusText: response.statusText,
        result 
      });
      return;
    }
    
    // Verify order columns still exist
    const afterColumns = await checkOrderColumnsExist();
    console.log('After second API call:', afterColumns);
    
    // Check if all tables still have order columns
    const allColumnsExist = Object.values(afterColumns).every(exists => exists);
    
    if (allColumnsExist) {
      console.log('SUCCESS: Order columns remain after second call (idempotent operation)');
    } else {
      console.error('FAILURE: Not all order columns exist after second call');
    }
    
    // Log the test results
    logResult('schema-operations-idempotent', {
      apiResponse: result,
      beforeColumns,
      afterColumns,
      success: allColumnsExist
    });
  } catch (error) {
    console.error('Error in testSchemaOperationsIdempotent:', error);
    logResult('schema-operations-idempotent-error', { error: String(error) });
  }
}

// Run all the tests
async function runTests() {
  console.log('Starting schema operations API tests...');
  
  try {
    await testSchemaOperationsSuccess();
    console.log('\n');
    
    await testSchemaOperationsUnauthorized();
    console.log('\n');
    
    await testSchemaOperationsNoAuth();
    console.log('\n');
    
    await testSchemaOperationsIdempotent();
    console.log('\n');
    
    console.log('All tests completed.');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Execute tests
runTests().catch(console.error); 