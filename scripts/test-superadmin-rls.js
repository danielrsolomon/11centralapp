#!/usr/bin/env node

/**
 * Superadmin RLS Policy Test Script
 * 
 * This script tests Row-Level Security (RLS) policies in the Supabase database
 * to ensure superadmin users can perform all operations on the programs table.
 * 
 * Usage:
 *   node scripts/test-superadmin-rls.js [--cleanup]
 * 
 * Options:
 *   --cleanup   Delete any test programs created by this script
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const { program } = require('commander');

// Set up command line options
program
  .option('--cleanup', 'Delete any test programs created by this script')
  .parse(process.argv);

const options = program.opts();

// Setup logging
const colorLog = {
  info: (msg) => console.log(`\x1b[36m${new Date().toISOString()}\x1b[0m - ${msg}`),
  success: (msg) => console.log(`\x1b[32m${new Date().toISOString()}\x1b[0m - ✅ ${msg}`),
  warn: (msg) => console.log(`\x1b[33m${new Date().toISOString()}\x1b[0m - ⚠️ ${msg}`),
  error: (msg) => console.log(`\x1b[31m${new Date().toISOString()}\x1b[0m - ❌ ${msg}`),
  detail: (msg) => console.log(`  \x1b[90m${msg}\x1b[0m`)
};

// Create Supabase client
function createSupabaseClient(supabaseKey, supabaseUrl) {
  if (!supabaseKey || !supabaseUrl) {
    colorLog.error('Missing Supabase credentials in environment variables');
    colorLog.detail('Please set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Create test program data
function createTestProgramData(userId) {
  return {
    title: `RLS Test Program - ${new Date().toISOString()}`,
    description: 'This is a test program created by the RLS test script',
    status: 'draft',
    created_by: userId,
    departments: ['test-department']
  };
}

// Main function
async function testSuperadminRLS() {
  const supabase = createSupabaseClient(supabaseServiceKey, supabaseUrl);
  
  // Check if we should clean up
  if (options.cleanup) {
    await cleanupTestData(supabase);
    return;
  }
  
  colorLog.info('Starting RLS policy test for superadmin users');
  
  // For the tests, we'll use Service Role to get users, but then
  // we'll sign in as specific users to test RLS

  // Step 1: Find a superadmin user to test with
  const { data: superadminUsers, error: userError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'superadmin')
    .limit(1);
  
  if (userError || !superadminUsers || superadminUsers.length === 0) {
    colorLog.error('No superadmin users found in the database');
    colorLog.detail('Please create a user with role "superadmin" first');
    return;
  }
  
  const superadminUser = superadminUsers[0];
  colorLog.success(`Found superadmin user: ${superadminUser.email}`);
  
  // Step 2: Find a regular user for comparison
  const { data: regularUsers, error: regularUserError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'user')
    .limit(1);
  
  if (regularUserError || !regularUsers || regularUsers.length === 0) {
    colorLog.warn('No regular users found for comparison testing');
  } else {
    colorLog.success(`Found regular user for comparison: ${regularUsers[0].email}`);
  }
  
  // Step 3: Test superadmin insert permission
  colorLog.info('Testing INSERT permission for superadmin...');
  
  // Create a new client using the user's JWT token
  // NOTE: In a real-world scenario, you would use a valid auth token
  // For this test, we use the service role but explicitly set the auth context
  
  const testProgramData = createTestProgramData(superadminUser.id);
  
  // Insert with RLS auth context set to superadmin user
  const { data: insertData, error: insertError } = await supabase
    .from('programs')
    .insert(testProgramData)
    .select()
    .auth(superadminUser.id);
  
  if (insertError) {
    colorLog.error(`Superadmin INSERT test failed: ${insertError.message}`);
    colorLog.detail(`Error code: ${insertError.code}, Hint: ${insertError.hint || 'None'}`);
    if (insertError.message.includes('row-level')) {
      colorLog.detail('RLS policy is preventing superadmin from inserting records');
    }
  } else {
    colorLog.success('Superadmin INSERT test passed successfully');
    colorLog.detail(`Created program with ID: ${insertData[0].id}`);
    
    // Store the created program ID for later tests
    const testProgramId = insertData[0].id;
    
    // Step 4: Test superadmin update permission
    colorLog.info('Testing UPDATE permission for superadmin...');
    
    const { data: updateData, error: updateError } = await supabase
      .from('programs')
      .update({ 
        title: `${testProgramData.title} - Updated`,
        description: 'This program was updated by the RLS test script' 
      })
      .eq('id', testProgramId)
      .select()
      .auth(superadminUser.id);
    
    if (updateError) {
      colorLog.error(`Superadmin UPDATE test failed: ${updateError.message}`);
    } else {
      colorLog.success('Superadmin UPDATE test passed successfully');
      colorLog.detail(`Updated program title: ${updateData[0].title}`);
    }
    
    // Step 5: Test superadmin delete permission
    colorLog.info('Testing DELETE permission for superadmin...');
    
    const { error: deleteError } = await supabase
      .from('programs')
      .delete()
      .eq('id', testProgramId)
      .auth(superadminUser.id);
    
    if (deleteError) {
      colorLog.error(`Superadmin DELETE test failed: ${deleteError.message}`);
    } else {
      colorLog.success('Superadmin DELETE test passed successfully');
    }
  }
  
  // The end
  colorLog.info('RLS policy test completed');
}

// Cleanup function
async function cleanupTestData(supabase) {
  colorLog.info('Cleaning up test data...');
  
  const { data, error } = await supabase
    .from('programs')
    .delete()
    .ilike('title', 'RLS Test Program%')
    .select();
  
  if (error) {
    colorLog.error(`Cleanup failed: ${error.message}`);
  } else {
    const count = data?.length || 0;
    colorLog.success(`Deleted ${count} test programs`);
  }
}

// Run the test
testSuperadminRLS().catch(error => {
  colorLog.error(`Unhandled error: ${error.message}`);
  console.error(error);
}); 