/**
 * API Diagnostic Script
 * 
 * This script helps diagnose issues with the /api/learning/programs endpoint
 * by testing different scenarios and providing detailed error information.
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

async function diagnoseAPI() {
  try {
    // Load environment variables
    loadEnvVars();
    
    console.log('=== API Diagnostic Tool ===');
    console.log('Testing /api/learning/programs endpoint...\n');
    
    // 1. Test unauthenticated request (should redirect to login)
    console.log('1. Testing unauthenticated request:');
    const unauthResponse = await fetch('http://localhost:3000/api/learning/programs', {
      redirect: 'manual' // Don't follow redirects automatically
    });
    console.log(`   Status: ${unauthResponse.status}`);
    console.log(`   Redirect: ${unauthResponse.headers.get('location') || 'none'}`);
    console.log('   Expected: 307 redirect to /auth/login');
    console.log(`   Result: ${unauthResponse.status === 307 && unauthResponse.headers.get('location') === '/auth/login' ? 'PASS' : 'FAIL'}`);
    
    if (unauthResponse.status === 200) {
      try {
        const responseData = await unauthResponse.json();
        console.log('   Response data:', responseData);
      } catch (e) {
        console.log(`   Could not parse response: ${e.message}`);
      }
    }
    
    console.log();
    
    // 2. Test with mock token (should return 401 or detailed error)
    console.log('2. Testing with mock token:');
    const mockResponse = await fetch('http://localhost:3000/api/learning/programs', {
      headers: {
        'Cookie': 'sb-refresh-token=mock-token; sb-access-token=mock-token'
      },
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log(`   Status: ${mockResponse.status}`);
    
    if (mockResponse.status === 307) {
      console.log(`   Redirect: ${mockResponse.headers.get('location')}`);
    } else {
      try {
        const responseData = await mockResponse.json();
        console.log('   Response data:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log(`   Could not parse response: ${e.message}`);
      }
    }
    
    // 3. Skip real authentication test since we don't have valid credentials
    
    // 4. Test the Supabase client directly
    console.log('\n4. Testing Supabase client directly:');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('   ERROR: Missing Supabase credentials.');
      return;
    }
    
    console.log(`   Supabase URL: ${supabaseUrl}`);
    console.log(`   Supabase Anon Key: ${supabaseAnonKey.substring(0, 5)}...`);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test getUser() method
    console.log('\n   Testing getUser():');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log(`   Error: ${userError.message}`);
    } else {
      console.log(`   User: ${userData.user ? 'Found' : 'Not found'}`);
    }
    
    // Test getSession() method
    console.log('\n   Testing getSession():');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log(`   Error: ${sessionError.message}`);
    } else {
      console.log(`   Session: ${sessionData.session ? 'Found' : 'Not found'}`);
    }
    
  } catch (error) {
    console.error('Diagnostic error:', error);
  }
}

diagnoseAPI(); 