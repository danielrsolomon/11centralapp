/**
 * Test Script for execute_raw_query Database Function
 * 
 * This script tests the execute_raw_query database function directly
 * using the Supabase client, without requiring authentication.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
function loadEnvVars() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if present
        process.env[key] = value;
      }
    });
    
    console.log('Loaded environment variables from .env.local');
  } catch (error) {
    console.error('Error loading .env.local file:', error.message);
  }
}

async function testDatabaseFunction() {
  try {
    // Load environment variables
    loadEnvVars();
    
    console.log('=== Database Function Test ===');
    
    // 1. Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
      return;
    }
    
    // 2. Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('\n1. Testing execute_raw_query function with a simple SELECT query...');
    
    // 3. Test the function with a simple SELECT query
    const { data: testData, error: testError } = await supabase.rpc('execute_raw_query', {
      query_text: 'SELECT $1::text as test_value, $2::int as test_number',
      query_params: JSON.stringify(['Hello World', 42])
    });
    
    if (testError) {
      console.error('Error executing test query:', testError.message);
      return;
    }
    
    console.log('Query result:');
    console.log(JSON.stringify(testData, null, 2));
    
    // 4. Now test with a more complex query - get all departments
    console.log('\n2. Testing execute_raw_query function with a SELECT from departments...');
    
    const { data: deptData, error: deptError } = await supabase.rpc('execute_raw_query', {
      query_text: 'SELECT * FROM departments LIMIT 5',
      query_params: JSON.stringify([])
    });
    
    if (deptError) {
      console.error('Error executing departments query:', deptError.message);
      return;
    }
    
    console.log('Departments query result:');
    console.log(JSON.stringify(deptData, null, 2));
    
    // 5. Test error handling
    console.log('\n3. Testing error handling with an invalid query...');
    
    const { data: errorData, error: invalidError } = await supabase.rpc('execute_raw_query', {
      query_text: 'SELECT * FROM non_existent_table',
      query_params: JSON.stringify([])
    });
    
    if (invalidError) {
      console.error('RPC error:', invalidError.message);
      return;
    }
    
    console.log('Error handling result:');
    console.log(JSON.stringify(errorData, null, 2));
    
    console.log('\nAll tests completed!');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDatabaseFunction(); 