/**
 * Test Script: Create Program and Verify API Response
 *
 * This script:
 * 1. Authenticates with Supabase using service role key
 * 2. Creates a test department (if needed)
 * 3. Creates a sample training program
 * 4. Authenticates as a user and calls the /api/learning/programs endpoint
 * 5. Verifies the newly created program appears in the response
 * 6. Cleans up by deleting the test program
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ====== CONFIGURATION ======
// Configure these values for your test
const TEST_PREFIX = 'TEST_';  // Prefix for test data to identify it easily
const TEST_USER_EMAIL = 'test@example.com';  // Replace with a valid test user
const TEST_USER_PASSWORD = 'password123';    // Replace with correct password

// Parse command line arguments
const args = process.argv.slice(2);
const SKIP_CLEANUP = args.includes('--skip-cleanup') || args.includes('-s');

// ====== UTILITY FUNCTIONS ======
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
    
    console.log('✅ Loaded environment variables from .env.local');
  } catch (error) {
    console.error('❌ Error loading .env.local file:', error.message);
  }
}

// Format console log with timestamp
function log(message, data = null) {
  const timestamp = new Date().toISOString().substr(11, 8);
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Wait for specified milliseconds
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add a function to check if the Next.js server is running
async function isServerRunning() {
  try {
    // Try to connect to the root page since we might not have a health endpoint
    const response = await fetch('http://localhost:3000', { 
      method: 'HEAD',
      // Add a timeout to avoid hanging if server is not responsive
      signal: AbortSignal.timeout(2000)
    });
    return true; // If we get any response, consider the server running
  } catch (error) {
    return false;
  }
}

// ====== TEST IMPLEMENTATION ======
async function runTest() {
  try {
    // Step 1: Load environment variables
    loadEnvVars();
    
    log('🚀 Starting Program Creation and API Verification Test');
    
    // Step 1.5: Check if Next.js server is running
    log('🔍 Checking if Next.js server is running...');
    const serverRunning = await isServerRunning();
    if (!serverRunning) {
      log('⚠️ Warning: Next.js server does not appear to be running or responding');
      log('⚠️ The API test part will likely fail. Start the server with "npm run dev"');
      log('⚠️ Continuing with database-only tests...');
    } else {
      log('✅ Next.js server is running');
    }
    
    // Step 2: Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log('❌ Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
      return;
    }
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Step 3: Check if test department exists, create if not
    log('📂 Checking for test department...');
    const departmentName = `${TEST_PREFIX}Department`;
    let { data: existingDepartment, error: deptQueryError } = await adminClient
      .from('departments')
      .select('*')
      .eq('name', departmentName)
      .single();
    
    if (deptQueryError && deptQueryError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
      log('❌ Error querying departments:', deptQueryError);
      return;
    }
    
    let departmentId;
    
    if (!existingDepartment) {
      log('🆕 Creating test department...');
      const { data: newDepartment, error: deptCreateError } = await adminClient
        .from('departments')
        .insert({
          name: departmentName,
          description: 'Test department for API testing'
        })
        .select()
        .single();
      
      if (deptCreateError) {
        log('❌ Error creating department:', deptCreateError);
        return;
      }
      
      departmentId = newDepartment.id;
      log('✅ Created test department', newDepartment);
    } else {
      departmentId = existingDepartment.id;
      log('✅ Found existing test department', existingDepartment);
    }
    
    // Step 4: Create a test program
    const testProgram = {
      title: `${TEST_PREFIX}Training Program ${Date.now()}`,
      description: 'This is a test program created by the test script',
      department_id: departmentId,
      thumbnail_url: 'https://via.placeholder.com/300',
      status: 'active',
      created_by: null // This is a foreign key to auth.users
    };
    
    log('🆕 Creating test program...');
    const { data: createdProgram, error: programCreateError } = await adminClient
      .from('programs')
      .insert(testProgram)
      .select()
      .single();
    
    if (programCreateError) {
      log('❌ Error creating program:', programCreateError);
      
      // Try to diagnose the issue
      const { data: tableInfo, error: tableError } = await adminClient
        .rpc('execute_raw_query', {
          query_text: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'programs'",
          query_params: '[]'
        });
      
      log('📊 Programs table structure:', tableInfo);
      return;
    }
    
    log('✅ Created test program', createdProgram);
    
    // Step 5: Create a regular client and sign in as test user
    const regularClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    log(`🔑 Signing in as ${TEST_USER_EMAIL}...`);
    const { data: authData, error: authError } = await regularClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    if (authError) {
      log('❌ Authentication error:', authError);
      log('⚠️ Will continue with admin client, but API test will be less accurate');
      
      // For departments that require user roles, grant access to the test user if needed
      // This step would be done here if authentication was successful
    }
    
    // Step 6: Ensure the test user has access to the test department
    if (authData?.user) {
      log('✅ Authentication successful');
      
      // Check if user has role for this department
      const { data: existingRole, error: roleCheckError } = await adminClient
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('department_id', departmentId)
        .single();
      
      if (roleCheckError && roleCheckError.code !== 'PGRST116') {
        log('❌ Error checking user roles:', roleCheckError);
      }
      
      if (!existingRole) {
        log('🔐 Granting test user access to department...');
        const { data: newRole, error: roleCreateError } = await adminClient
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            department_id: departmentId,
            role: 'member'
          });
          
        if (roleCreateError) {
          log('❌ Error creating user role:', roleCreateError);
        } else {
          log('✅ Granted department access to test user');
        }
      } else {
        log('✅ User already has access to department');
      }
    } else {
      // For demo purposes, create a test account if needed
      log('⚠️ Using admin client for testing since user auth failed');
    }
    
    // Allow some time for changes to propagate
    await wait(1000);
    
    // Step 7: Call the API endpoint to get programs
    log('🔍 Testing /api/learning/programs endpoint...');
    
    let fetchClient;
    let fetchOptions = {};
    
    if (authData?.session) {
      // Use the authenticated user's session
      fetchClient = regularClient;
      fetchOptions = {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
          Cookie: `sb-refresh-token=${authData.session.refresh_token}; sb-access-token=${authData.session.access_token}`
        }
      };
    } else {
      // Fallback to admin client
      fetchClient = adminClient;
    }
    
    // First try via REST API (direct database access)
    const { data: apiPrograms, error: apiError } = await fetchClient
      .from('programs')
      .select('*, departments(name)')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: false });
    
    if (apiError) {
      log('❌ Error fetching programs via REST API:', apiError);
    } else {
      log(`✅ Found ${apiPrograms.length} programs via REST API`);
      const ourProgram = apiPrograms.find(p => p.id === createdProgram.id);
      
      if (ourProgram) {
        log('✅ Successfully found our test program via REST API', ourProgram);
      } else {
        log('❌ Our test program was not found in REST API results');
      }
    }
    
    // Now try via the actual endpoint
    if (serverRunning) {
      let apiUrl = 'http://localhost:3000/api/learning/programs';
      log(`📡 Fetching from endpoint: ${apiUrl}`);
      
      try {
        // Don't follow redirects automatically
        const response = await fetch(apiUrl, {
          ...fetchOptions,
          redirect: 'manual'
        });
        log(`📡 API Response Status: ${response.status}`);
        
        if (response.status === 200) {
          try {
            const jsonData = await response.json();
            log('📡 API Response Data:', jsonData);
            
            if (jsonData.programs && Array.isArray(jsonData.programs)) {
              log(`✅ API returned ${jsonData.programs.length} programs`);
              
              const ourProgram = jsonData.programs.find(p => p.id === createdProgram.id);
              if (ourProgram) {
                log('✅ SUCCESS: Our test program was found in the API response', ourProgram);
              } else {
                log('❌ Our test program was not found in the API response');
              }
            } else {
              log('❌ Unexpected API response format', jsonData);
            }
          } catch (e) {
            log(`❌ Could not parse JSON response: ${e.message}`);
            // Try to see what the response actually contains
            const text = await response.text();
            log(`Response starts with: ${text.substring(0, 100)}...`);
          }
        } else if (response.status === 307 || response.status === 302 || response.status === 301) {
          const location = response.headers.get('location');
          log(`⚠️ API returned a ${response.status} redirect to: ${location}`);
          
          if (location === '/auth/login') {
            log('Authentication required: The API endpoint requires a valid authenticated session.');
            log('This is actually the expected behavior for unauthenticated requests!');
            log('To fully test the API, you need valid credentials in TEST_USER_EMAIL and TEST_USER_PASSWORD');
          }
        } else {
          log('❌ API returned error status', response.status);
          try {
            const errorText = await response.text();
            log(`Error response: ${errorText.substring(0, 200)}...`);
          } catch (e) {
            log('Could not read error response');
          }
        }
      } catch (error) {
        log(`❌ Error connecting to API endpoint: ${error.message}`);
        log('Make sure the Next.js server is running with "npm run dev"');
      }
    } else {
      log('⏩ Skipping API endpoint test since server is not running');
    }
    
    // Step 8: Clean up test data
    if (SKIP_CLEANUP) {
      log('⏩ Skipping cleanup because --skip-cleanup flag was provided');
      log(`📝 Test program ID for reference: ${createdProgram.id}`);
    } else {
      log('🧹 Cleaning up test data...');
      
      const { error: deleteError } = await adminClient
        .from('programs')
        .delete()
        .eq('id', createdProgram.id);
      
      if (deleteError) {
        log('❌ Error deleting test program:', deleteError);
      } else {
        log('✅ Successfully deleted test program');
      }
      
      // Optional: Delete department too if we want completely clean slate
      // Uncomment the following to also delete the test department
      /*
      const { error: deleteDeptError } = await adminClient
        .from('departments')
        .delete()
        .eq('id', departmentId);
      
      if (deleteDeptError) {
        log('❌ Error deleting test department:', deleteDeptError);
      } else {
        log('✅ Successfully deleted test department');
      }
      */
    }
    
    log('🏁 Test completed');
    
  } catch (error) {
    console.error('❌ Unhandled test error:', error);
  }
}

// Add command-line help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Program Creation and API Verification Test

Usage:
  node test-create-program.js [options]

Options:
  --skip-cleanup, -s   Skip cleanup of test data (useful for debugging)
  --help, -h           Show this help message

Example:
  node test-create-program.js --skip-cleanup   # Create test data but don't delete it
  `);
} else {
  // Run the test
  runTest();
} 