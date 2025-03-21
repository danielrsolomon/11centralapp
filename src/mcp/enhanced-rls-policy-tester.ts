import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Configuration
const config = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres',
};

// User roles to test
const roles = [
  'anon',
  'authenticated',
  'service_role'
];

// Tables to test (add specific tables required by user)
const tables = [
  'venues',
  'users',
  'profiles',
  'bookings',
  'sessions',
  'events',
  'notifications'
];

// RLS Policy Templates
const policyTemplates = {
  venues: {
    select: [
      { name: 'venues_read_all', role: 'authenticated', using: 'true' },
      { name: 'venues_read_public', role: 'anon', using: 'true' },
    ],
    insert: [
      { name: 'venues_insert_auth', role: 'authenticated', using: 'true', with_check: 'true' }
    ],
    update: [
      { name: 'venues_update_auth', role: 'authenticated', using: 'true', with_check: 'true' }
    ],
    delete: [
      { name: 'venues_delete_admin', role: 'authenticated', using: 'auth.uid() IN (SELECT user_id FROM admin_users)' }
    ]
  },
  users: {
    select: [
      { name: 'users_read_self', role: 'authenticated', using: 'auth.uid() = id' },
      { name: 'users_read_admin', role: 'authenticated', using: 'auth.uid() IN (SELECT user_id FROM admin_users)' }
    ],
    update: [
      { name: 'users_update_self', role: 'authenticated', using: 'auth.uid() = id', with_check: 'auth.uid() = id' }
    ],
    delete: [
      { name: 'users_delete_admin', role: 'authenticated', using: 'auth.uid() IN (SELECT user_id FROM admin_users)' }
    ]
  },
  profiles: {
    select: [
      { name: 'profiles_read_all', role: 'authenticated', using: 'true' },
      { name: 'profiles_read_public', role: 'anon', using: 'public = true' }
    ],
    insert: [
      { name: 'profiles_insert_self', role: 'authenticated', using: 'auth.uid() = user_id', with_check: 'auth.uid() = user_id' }
    ],
    update: [
      { name: 'profiles_update_self', role: 'authenticated', using: 'auth.uid() = user_id', with_check: 'auth.uid() = user_id' }
    ]
  },
  bookings: {
    select: [
      { name: 'bookings_read_self', role: 'authenticated', using: 'auth.uid() = user_id' },
      { name: 'bookings_read_admin', role: 'authenticated', using: 'auth.uid() IN (SELECT user_id FROM admin_users)' }
    ],
    insert: [
      { name: 'bookings_insert_self', role: 'authenticated', using: 'auth.uid() = user_id', with_check: 'auth.uid() = user_id' }
    ],
    update: [
      { name: 'bookings_update_self', role: 'authenticated', using: 'auth.uid() = user_id', with_check: 'auth.uid() = user_id' }
    ],
    delete: [
      { name: 'bookings_delete_self', role: 'authenticated', using: 'auth.uid() = user_id' }
    ]
  },
  events: {
    select: [
      { name: 'events_read_all', role: 'authenticated', using: 'true' },
      { name: 'events_read_public', role: 'anon', using: 'public = true' }
    ],
    insert: [
      { name: 'events_insert_auth', role: 'authenticated', using: 'true', with_check: 'true' }
    ],
    update: [
      { name: 'events_update_owner', role: 'authenticated', using: 'auth.uid() = created_by', with_check: 'auth.uid() = created_by' }
    ],
    delete: [
      { name: 'events_delete_owner', role: 'authenticated', using: 'auth.uid() = created_by' }
    ]
  },
  notifications: {
    select: [
      { name: 'notifications_read_self', role: 'authenticated', using: 'auth.uid() = user_id' }
    ],
    update: [
      { name: 'notifications_update_self', role: 'authenticated', using: 'auth.uid() = user_id', with_check: 'auth.uid() = user_id' }
    ],
    delete: [
      { name: 'notifications_delete_self', role: 'authenticated', using: 'auth.uid() = user_id' }
    ]
  }
};

// Main client for database operations
const client = new Client(config);

// Utility functions
async function connect() {
  try {
    await client.connect();
    console.log(chalk.green('Connected to database'));
  } catch (error) {
    console.error(chalk.red('Error connecting to database:'), error);
    process.exit(1);
  }
}

async function disconnect() {
  try {
    await client.end();
    console.log(chalk.green('Disconnected from database'));
  } catch (error) {
    console.error(chalk.red('Error disconnecting from database:'), error);
  }
}

// Function to get existing RLS policies
async function getExistingPolicies(tableName: string) {
  const query = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename = $1
    ORDER BY policyname;
  `;
  
  try {
    const result = await client.query(query, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(chalk.red(`Error fetching policies for table ${tableName}:`), error);
    return [];
  }
}

// Function to enable RLS on a table
async function enableRLS(tableName: string) {
  try {
    await client.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
    console.log(chalk.green(`Enabled RLS on table ${tableName}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error enabling RLS on table ${tableName}:`), error);
    return false;
  }
}

// Function to check if RLS is enabled on a table
async function isRLSEnabled(tableName: string) {
  const query = `
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = $1;
  `;
  
  try {
    const result = await client.query(query, [tableName]);
    return result.rows.length > 0 ? result.rows[0].relrowsecurity : false;
  } catch (error) {
    console.error(chalk.red(`Error checking RLS status for table ${tableName}:`), error);
    return false;
  }
}

// Function to create/update a policy
async function createOrUpdatePolicy(tableName: string, policy: any) {
  // Drop the policy if it exists
  try {
    await client.query(`DROP POLICY IF EXISTS ${policy.name} ON ${tableName};`);
  } catch (error) {
    console.error(chalk.red(`Error dropping policy ${policy.name} on ${tableName}:`), error);
  }
  
  // Create the policy
  let query = `
    CREATE POLICY ${policy.name}
    ON ${tableName}
    FOR ${policy.cmd || 'ALL'}
    TO ${policy.role}
    USING (${policy.using})
  `;
  
  if (policy.with_check) {
    query += ` WITH CHECK (${policy.with_check})`;
  }
  
  try {
    await client.query(query);
    console.log(chalk.green(`Created/updated policy ${policy.name} on ${tableName}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error creating policy ${policy.name} on ${tableName}:`), error);
    return false;
  }
}

// Function to test table permissions for a role
async function testTablePermissions(tableName: string, role: string) {
  // Set role
  await client.query(`SET ROLE ${role};`);
  
  // Test operations
  const operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  const results: any = {};
  
  for (const operation of operations) {
    try {
      let query = '';
      
      switch (operation) {
        case 'SELECT':
          query = `SELECT EXISTS (SELECT 1 FROM ${tableName} LIMIT 1);`;
          break;
        case 'INSERT':
          await client.query('BEGIN');
          query = `INSERT INTO ${tableName} DEFAULT VALUES RETURNING true;`;
          break;
        case 'UPDATE':
          await client.query('BEGIN');
          query = `UPDATE ${tableName} SET id = id RETURNING true;`;
          break;
        case 'DELETE':
          await client.query('BEGIN');
          query = `DELETE FROM ${tableName} RETURNING true;`;
          break;
      }
      
      const result = await client.query(query);
      results[operation] = true;
      
      // Rollback if not SELECT
      if (operation !== 'SELECT') {
        await client.query('ROLLBACK');
      }
    } catch (error) {
      results[operation] = false;
      
      // Rollback if not SELECT
      if (operation !== 'SELECT') {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error(chalk.red(`Error rolling back transaction: ${rollbackError}`));
        }
      }
    }
  }
  
  // Reset role
  await client.query('RESET ROLE;');
  
  return {
    table: tableName,
    role: role,
    permissions: results
  };
}

// Function to apply template policies to a table
async function applyTemplatePolicies(tableName: string) {
  if (!policyTemplates[tableName]) {
    console.log(chalk.yellow(`No policy templates defined for table ${tableName}`));
    return false;
  }
  
  // Enable RLS if not already enabled
  const rlsEnabled = await isRLSEnabled(tableName);
  if (!rlsEnabled) {
    await enableRLS(tableName);
  }
  
  let success = true;
  const template = policyTemplates[tableName];
  
  // Process each operation type
  for (const [operation, policies] of Object.entries(template)) {
    for (const policy of policies) {
      // Set command based on operation
      const policyWithCmd = {
        ...policy,
        cmd: operation.toUpperCase()
      };
      
      const result = await createOrUpdatePolicy(tableName, policyWithCmd);
      if (!result) {
        success = false;
      }
    }
  }
  
  return success;
}

// Function to generate HTML report
function generateHTMLReport(testResults: any[], existingPolicies: any) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RLS Policy Test Results</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .success {
      color: #27ae60;
      font-weight: bold;
    }
    .failure {
      color: #e74c3c;
      font-weight: bold;
    }
    .policy-code {
      font-family: monospace;
      white-space: pre-wrap;
      background-color: #f8f8f8;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    .timestamp {
      color: #7f8c8d;
      font-style: italic;
    }
    .summary {
      margin: 20px 0;
      padding: 15px;
      background-color: #f2f2f2;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>RLS Policy Test Results</h1>
  <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>Tested ${Object.keys(testResults.reduce((acc, curr) => {
      acc[curr.table] = true;
      return acc;
    }, {})).length} tables with ${Object.keys(testResults.reduce((acc, curr) => {
      acc[curr.role] = true;
      return acc;
    }, {})).length} roles.</p>
  </div>
  
  <h2>Test Results by Table</h2>
  ${Object.keys(testResults.reduce((acc, curr) => {
    acc[curr.table] = true;
    return acc;
  }, {})).map(tableName => {
    const tableResults = testResults.filter(r => r.table === tableName);
    return `
      <h3>Table: ${tableName}</h3>
      <table>
        <tr>
          <th>Role</th>
          <th>SELECT</th>
          <th>INSERT</th>
          <th>UPDATE</th>
          <th>DELETE</th>
        </tr>
        ${tableResults.map(result => `
          <tr>
            <td>${result.role}</td>
            <td class="${result.permissions.SELECT ? 'success' : 'failure'}">${result.permissions.SELECT ? '✓' : '✗'}</td>
            <td class="${result.permissions.INSERT ? 'success' : 'failure'}">${result.permissions.INSERT ? '✓' : '✗'}</td>
            <td class="${result.permissions.UPDATE ? 'success' : 'failure'}">${result.permissions.UPDATE ? '✓' : '✗'}</td>
            <td class="${result.permissions.DELETE ? 'success' : 'failure'}">${result.permissions.DELETE ? '✓' : '✗'}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }).join('')}
  
  <h2>Existing Policies</h2>
  ${Object.entries(existingPolicies).map(([tableName, policies]) => `
    <h3>Table: ${tableName}</h3>
    ${(policies as any[]).length === 0 ? 
      '<p>No policies defined for this table.</p>' : 
      `<table>
        <tr>
          <th>Policy Name</th>
          <th>Permissive</th>
          <th>Roles</th>
          <th>Command</th>
          <th>USING Expression</th>
          <th>WITH CHECK Expression</th>
        </tr>
        ${(policies as any[]).map(policy => `
          <tr>
            <td>${policy.policyname}</td>
            <td>${policy.permissive ? 'Yes' : 'No'}</td>
            <td>${policy.roles.join(', ')}</td>
            <td>${policy.cmd}</td>
            <td class="policy-code">${policy.qual}</td>
            <td class="policy-code">${policy.with_check || '-'}</td>
          </tr>
        `).join('')}
      </table>`
    }
  `).join('')}
</body>
</html>
  `;
  
  return html;
}

// Main function
async function main() {
  try {
    await connect();
    
    // Step 1: Check RLS status for each table
    console.log(chalk.blue('Step 1: Checking RLS status for tables...'));
    const rlsStatus: any = {};
    for (const tableName of tables) {
      rlsStatus[tableName] = await isRLSEnabled(tableName);
      console.log(`Table ${tableName}: RLS ${rlsStatus[tableName] ? 'enabled' : 'disabled'}`);
    }
    
    // Step 2: Get existing policies for each table
    console.log(chalk.blue('\nStep 2: Fetching existing policies...'));
    const existingPolicies: any = {};
    for (const tableName of tables) {
      existingPolicies[tableName] = await getExistingPolicies(tableName);
      console.log(`Table ${tableName}: ${existingPolicies[tableName].length} policies found`);
    }
    
    // Step 3: Apply template policies if needed
    console.log(chalk.blue('\nStep 3: Applying template policies...'));
    const policyApplicationResults: any = {};
    for (const tableName of tables) {
      const shouldApply = process.argv.includes('--apply-templates') || 
                           process.argv.includes('--fix-policies');
      
      if (shouldApply) {
        console.log(`Applying template policies to ${tableName}...`);
        policyApplicationResults[tableName] = await applyTemplatePolicies(tableName);
      } else {
        console.log(`Skipping policy application for ${tableName} (use --apply-templates to apply)`);
        policyApplicationResults[tableName] = false;
      }
    }
    
    // Step 4: Test permissions for each role and table
    console.log(chalk.blue('\nStep 4: Testing permissions...'));
    const testResults = [];
    for (const tableName of tables) {
      for (const role of roles) {
        console.log(`Testing ${role} permissions on ${tableName}...`);
        const result = await testTablePermissions(tableName, role);
        testResults.push(result);
      }
    }
    
    // Step 5: Get updated policies after changes
    console.log(chalk.blue('\nStep 5: Fetching updated policies...'));
    const updatedPolicies: any = {};
    for (const tableName of tables) {
      updatedPolicies[tableName] = await getExistingPolicies(tableName);
      console.log(`Table ${tableName}: ${updatedPolicies[tableName].length} policies found`);
    }
    
    // Step 6: Generate HTML report
    console.log(chalk.blue('\nStep 6: Generating HTML report...'));
    const html = generateHTMLReport(testResults, updatedPolicies);
    const outputPath = path.join(__dirname, 'rls-policy-test-results.html');
    fs.writeFileSync(outputPath, html);
    console.log(chalk.green(`Report generated at ${outputPath}`));
    
    // Summary
    console.log(chalk.blue('\nSummary:'));
    console.log('Tables with RLS enabled:');
    for (const [tableName, enabled] of Object.entries(rlsStatus)) {
      console.log(`- ${tableName}: ${enabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    }
    
    console.log('\nPolicy application results:');
    for (const [tableName, success] of Object.entries(policyApplicationResults)) {
      console.log(`- ${tableName}: ${success ? chalk.green('Applied') : chalk.yellow('Not applied')}`);
    }
    
    console.log('\nPermission test results:');
    const tableRoleSummary: any = {};
    for (const result of testResults) {
      if (!tableRoleSummary[result.table]) {
        tableRoleSummary[result.table] = {};
      }
      
      const permissions = Object.entries(result.permissions)
        .filter(([_, allowed]) => allowed)
        .map(([op, _]) => op)
        .join(', ');
      
      tableRoleSummary[result.table][result.role] = permissions || 'None';
    }
    
    for (const [tableName, roles] of Object.entries(tableRoleSummary)) {
      console.log(`- ${tableName}:`);
      for (const [role, permissions] of Object.entries(roles as any)) {
        console.log(`  - ${role}: ${permissions}`);
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error during RLS policy testing:'), error);
  } finally {
    await disconnect();
  }
}

// Run main function
if (require.main === module) {
  main().catch(console.error);
}

// Export functions for programmatic use
export {
  getExistingPolicies,
  enableRLS,
  isRLSEnabled,
  createOrUpdatePolicy,
  testTablePermissions,
  applyTemplatePolicies,
  generateHTMLReport
}; 