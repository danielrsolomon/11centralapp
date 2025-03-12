/**
 * Test Script for /api/learning/programs API Endpoint
 * 
 * This script tests the Programs API endpoint with the new implementation
 * that uses the execute_raw_query database function.
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

async function testProgramsAPI() {
  try {
    // Load environment variables
    loadEnvVars();
    
    console.log('=== Programs API Test ===');
    
    // 1. Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    // 2. Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 3. Sign in with test credentials (replace with valid credentials)
    console.log('\n1. Authenticating with Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Replace with a valid test user
      password: 'password123'    // Replace with the correct password
    });
    
    if (authError) {
      console.error('Authentication error:', authError.message);
      console.log('\nPlease update the script with valid test credentials.');
      return;
    }
    
    console.log('Authentication successful!');
    console.log('User ID:', authData.user.id);
    
    // 4. Get session for cookies
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      console.error('No session available after authentication');
      return;
    }
    
    // 5. Get auth cookies
    const cookies = [
      `sb-access-token=${sessionData.session.access_token}`,
      `sb-refresh-token=${sessionData.session.refresh_token}`
    ];
    
    // 6. Test the Programs API endpoint
    console.log('\n2. Testing /api/learning/programs endpoint...');
    const response = await fetch('http://localhost:3000/api/learning/programs', {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('Status:', response.status);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('\n3. API Response Data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.programs && Array.isArray(data.programs)) {
        console.log('\nSuccess! The API returned', data.programs.length, 'programs.');
        console.log('pagination:', data.pagination);
      } else {
        console.error('Unexpected response format. Expected "programs" array in the response.');
      }
    } else if (response.status === 307) {
      console.error('Redirect detected. Authentication may have failed.');
      console.log('Redirect location:', response.headers.get('location'));
    } else {
      console.error('Unexpected status code:', response.status);
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (error) {
        console.error('Could not parse error response');
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testProgramsAPI(); 