/**
 * RLS Policy Testing Script
 * 
 * This script tests Row Level Security policies across different tables
 * and roles in the database. It simulates different user contexts and
 * verifies that the RLS policies are correctly enforcing access restrictions.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.local' });

// Get directory name for ESM modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Anonymous client for unauthenticated tests
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials
const testUsers = {
  owner: {
    email: 'owner@test.com',
    password: 'owner123',
    role: 'owner'
  },
  manager: {
    email: 'manager@test.com',
    password: 'manager123',
    role: 'manager'
  },
  employee: {
    email: 'employee@test.com',
    password: 'employee123',
    role: 'employee'
  }
};

// Tables to test
const tables = [
  'departments',
  'gratuities',
  'messages',
  'roles',
  'schedules',
  'users',
  'venues'
];

// Expected permissions matrix: [table][role][operation]
// Operations: read, insert, update, delete
const expectedPermissions = {
  departments: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: true, update: true, delete: false },
    employee: { read: true, insert: false, update: false, delete: false },
    anon: { read: false, insert: false, update: false, delete: false }
  },
  gratuities: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: true, update: true, delete: true },
    employee: { read: true, insert: true, update: true, delete: false },
    anon: { read: false, insert: false, update: false, delete: false }
  },
  messages: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: true, update: true, delete: true },
    employee: { read: true, insert: true, update: true, delete: false },
    anon: { read: false, insert: false, update: false, delete: false }
  },
  roles: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: false, update: false, delete: false },
    employee: { read: true, insert: false, update: false, delete: false },
    anon: { read: false, insert: false, update: false, delete: false }
  },
  schedules: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: true, update: true, delete: true },
    employee: { read: true, insert: false, update: false, delete: false },
    anon: { read: false, insert: false, update: false, delete: false }
  },
  users: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: true, update: true, delete: false },
    employee: { read: true, insert: false, update: false, delete: false },
    anon: { read: false, insert: false, update: false, delete: false }
  },
  venues: {
    owner: { read: true, insert: true, update: true, delete: true },
    manager: { read: true, insert: true, update: true, delete: false },
    employee: { read: true, insert: false, update: false, delete: false },
    anon: { read: true, insert: false, update: false, delete: false }
  }
};

// Create test users if they don't exist
async function createTestUsers() {
  console.log(chalk.blue('Creating test users if needed...'));
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', userData.email)
      .single();
    
    if (existingUsers) {
      console.log(chalk.green(`${userType} user already exists`));
      continue;
    }
    
    // Get role id
    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', userData.role)
      .single();
    
    if (!roleData) {
      console.error(chalk.red(`Role ${userData.role} not found`));
      continue;
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });
    
    if (authError) {
      console.error(chalk.red(`Failed to create auth user for ${userType}:`, authError.message));
      continue;
    }
    
    // Create user record
    const { data: userData2, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        first_name: userType.charAt(0).toUpperCase() + userType.slice(1),
        last_name: 'Test',
        role_id: roleData.id,
        active: true
      })
      .select()
      .single();
    
    if (userError) {
      console.error(chalk.red(`Failed to create user record for ${userType}:`, userError.message));
      continue;
    }
    
    console.log(chalk.green(`Created ${userType} user with id ${userData2.id}`));
  }
}

// Get authenticated client for a user
async function getAuthenticatedClient(userType) {
  if (userType === 'anon') {
    return supabaseAnon;
  }
  
  const { email, password } = testUsers[userType];
  
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error(chalk.red(`Failed to authenticate as ${userType}:`, error.message));
    return null;
  }
  
  // Create a new client with the session
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`
      }
    }
  });
}

// Test CRUD operations for a specific user and table
async function testCrudOperations(userType, table) {
  console.log(chalk.blue(`Testing ${table} access for ${userType}...`));
  
  const client = await getAuthenticatedClient(userType);
  if (!client) return null;
  
  const testId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  // Test data for each table
  const testData = {
    departments: { name: `Test Dept ${timestamp}`, venue_id: null },
    gratuities: { amount: 100, recipient_id: null, sender_id: null },
    messages: { content: `Test message ${timestamp}`, sender_id: null, recipient_id: null },
    roles: { name: `Test Role ${timestamp}` },
    schedules: { start_time: timestamp, end_time: timestamp, user_id: null, venue_id: null },
    users: { email: `test-${testId}@example.com`, first_name: 'Test', last_name: 'User', role_id: null },
    venues: { name: `Test Venue ${timestamp}`, address: `${testId} Main St` }
  };
  
  // Get reference IDs for foreign keys
  if (['departments', 'schedules'].includes(table)) {
    const { data: venueData } = await supabaseAdmin.from('venues').select('id').limit(1).single();
    if (venueData) {
      testData[table].venue_id = venueData.id;
    }
  }
  
  if (['gratuities', 'messages', 'schedules'].includes(table)) {
    const { data: userData } = await supabaseAdmin.from('users').select('id').limit(1).single();
    if (userData) {
      if (table === 'gratuities') {
        testData.gratuities.recipient_id = userData.id;
        testData.gratuities.sender_id = userData.id;
      } else if (table === 'messages') {
        testData.messages.sender_id = userData.id;
        testData.messages.recipient_id = userData.id;
      } else if (table === 'schedules') {
        testData.schedules.user_id = userData.id;
      }
    }
  }
  
  if (table === 'users') {
    const { data: roleData } = await supabaseAdmin.from('roles').select('id').limit(1).single();
    if (roleData) {
      testData.users.role_id = roleData.id;
    }
  }
  
  // Run tests
  const results = {
    read: null,
    insert: null,
    update: null,
    delete: null
  };
  
  let insertedId = null;
  
  // Test Read
  try {
    const { data, error } = await client.from(table).select('*').limit(1);
    results.read = !error;
    if (error) console.log(chalk.yellow(`  Read error: ${error.message}`));
  } catch (e) {
    results.read = false;
    console.log(chalk.yellow(`  Read exception: ${e.message}`));
  }
  
  // Test Insert
  try {
    const { data, error } = await client.from(table).insert(testData[table]).select().single();
    results.insert = !error;
    if (error) {
      console.log(chalk.yellow(`  Insert error: ${error.message}`));
    } else if (data) {
      insertedId = data.id;
      console.log(chalk.green(`  Inserted record with id: ${insertedId}`));
    }
  } catch (e) {
    results.insert = false;
    console.log(chalk.yellow(`  Insert exception: ${e.message}`));
  }
  
  // If insert failed but we need to test update/delete, use admin client to insert
  if (!insertedId && (expectedPermissions[table][userType].update || expectedPermissions[table][userType].delete)) {
    const { data, error } = await supabaseAdmin.from(table).insert(testData[table]).select().single();
    if (!error && data) {
      insertedId = data.id;
      console.log(chalk.blue(`  Admin inserted record with id: ${insertedId} for further testing`));
    }
  }
  
  // Test Update (if we have a record)
  if (insertedId) {
    try {
      const updateField = Object.keys(testData[table])[0];
      const updateValue = typeof testData[table][updateField] === 'string' 
        ? `${testData[table][updateField]} (updated)` 
        : (typeof testData[table][updateField] === 'number' ? testData[table][updateField] + 1 : testData[table][updateField]);
      
      const { error } = await client.from(table).update({ [updateField]: updateValue }).eq('id', insertedId);
      results.update = !error;
      if (error) console.log(chalk.yellow(`  Update error: ${error.message}`));
    } catch (e) {
      results.update = false;
      console.log(chalk.yellow(`  Update exception: ${e.message}`));
    }
  }
  
  // Test Delete (if we have a record)
  if (insertedId) {
    try {
      const { error } = await client.from(table).delete().eq('id', insertedId);
      results.delete = !error;
      if (error) {
        console.log(chalk.yellow(`  Delete error: ${error.message}`));
        // Clean up with admin if needed
        if (error) {
          await supabaseAdmin.from(table).delete().eq('id', insertedId);
        }
      }
    } catch (e) {
      results.delete = false;
      console.log(chalk.yellow(`  Delete exception: ${e.message}`));
      // Clean up with admin
      await supabaseAdmin.from(table).delete().eq('id', insertedId);
    }
  }
  
  return results;
}

// Validate results against expected permissions
function validateResults(userType, table, results) {
  const expected = expectedPermissions[table][userType];
  const success = 
    results.read === expected.read && 
    results.insert === expected.insert && 
    results.update === expected.update && 
    results.delete === expected.delete;
  
  if (success) {
    console.log(chalk.green(`✓ ${table} permissions for ${userType} match expected`));
  } else {
    console.log(chalk.red(`✗ ${table} permissions for ${userType} do not match expected`));
    console.log('  Expected:', JSON.stringify(expected));
    console.log('  Actual:  ', JSON.stringify(results));
  }
  
  return success;
}

// Generate HTML report
function generateReport(allResults) {
  const reportPath = path.join(__dirname, 'rls-test-report.html');
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>RLS Policy Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .success { background-color: #dff0d8; }
    .failure { background-color: #f2dede; }
    .true { color: green; }
    .false { color: red; }
    .summary { font-weight: bold; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Row Level Security (RLS) Policy Test Results</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
`;

  // Summary table
  html += `
  <h2>Summary</h2>
  <table>
    <tr>
      <th>Table</th>
      ${Object.keys(testUsers).map(user => `<th>${user}</th>`).join('')}
      <th>anon</th>
    </tr>
`;

  for (const table of tables) {
    html += `
    <tr>
      <td>${table}</td>
`;

    for (const userType of [...Object.keys(testUsers), 'anon']) {
      const result = allResults[table]?.[userType];
      const success = result ? validateResults(userType, table, result) : false;
      html += `
      <td class="${success ? 'success' : 'failure'}">${success ? '✓' : '✗'}</td>
`;
    }

    html += `
    </tr>
`;
  }

  html += `
  </table>
`;

  // Detailed tables for each user type
  for (const userType of [...Object.keys(testUsers), 'anon']) {
    html += `
  <h2>${userType.charAt(0).toUpperCase() + userType.slice(1)} Access Details</h2>
  <table>
    <tr>
      <th>Table</th>
      <th>Read</th>
      <th>Insert</th>
      <th>Update</th>
      <th>Delete</th>
      <th>Status</th>
    </tr>
`;

    for (const table of tables) {
      const result = allResults[table]?.[userType];
      const expected = expectedPermissions[table][userType];
      const success = result ? validateResults(userType, table, result) : false;

      html += `
    <tr class="${success ? 'success' : 'failure'}">
      <td>${table}</td>
`;

      if (result) {
        html += `
      <td class="${result.read === expected.read ? 'success' : 'failure'}"><span class="${result.read}">${result.read}</span> (${expected.read})</td>
      <td class="${result.insert === expected.insert ? 'success' : 'failure'}"><span class="${result.insert}">${result.insert}</span> (${expected.insert})</td>
      <td class="${result.update === expected.update ? 'success' : 'failure'}"><span class="${result.update}">${result.update}</span> (${expected.update})</td>
      <td class="${result.delete === expected.delete ? 'success' : 'failure'}"><span class="${result.delete}">${result.delete}</span> (${expected.delete})</td>
`;
      } else {
        html += `
      <td class="failure">-</td>
      <td class="failure">-</td>
      <td class="failure">-</td>
      <td class="failure">-</td>
`;
      }

      html += `
      <td>${success ? '✓' : '✗'}</td>
    </tr>
`;
    }

    html += `
  </table>
`;
  }

  html += `
</body>
</html>
`;

  fs.writeFileSync(reportPath, html);
  console.log(chalk.green(`Report generated at: ${reportPath}`));
}

// Main function
async function main() {
  try {
    console.log(chalk.blue('Starting RLS policy tests...'));
    
    // Create test users
    await createTestUsers();
    
    // Run tests for each table and user type
    const allResults = {};
    
    for (const table of tables) {
      allResults[table] = {};
      
      // Test for each user type including anonymous
      for (const userType of [...Object.keys(testUsers), 'anon']) {
        const results = await testCrudOperations(userType, table);
        if (results) {
          allResults[table][userType] = results;
          validateResults(userType, table, results);
        }
      }
    }
    
    // Generate report
    generateReport(allResults);
    
    console.log(chalk.green('All RLS policy tests completed!'));
  } catch (error) {
    console.error(chalk.red('Test failed with error:'), error);
  }
}

// Run the tests
main(); 