/**
 * Test Script for execute_raw_query Database Function with Parameters
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
    
    console.log('=== Database Function Test with Parameters ===');
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('\nTesting execute_raw_query function with a parameter...');
    
    // Test the function with a simple SELECT query with a parameter
    const testVal = 'Hello World';
    const { data: testData, error: testError } = await supabase.rpc('execute_raw_query', {
      query_text: 'SELECT $1::text as test_value',
      query_params: JSON.stringify([testVal])
    });
    
    if (testError) {
      console.error('Error executing test query:', testError.message);
      return;
    }
    
    console.log('Query result:');
    console.log(JSON.stringify(testData, null, 2));
    
    // Verify result
    if (testData && testData[0] && testData[0].test_value === testVal) {
      console.log('\nSUCCESS: Parameter binding works correctly!');
    } else {
      console.log('\nFAILURE: Parameter binding did not work as expected.');
      console.log('Expected:', testVal);
      console.log('Actual:', testData);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDatabaseFunction(); 