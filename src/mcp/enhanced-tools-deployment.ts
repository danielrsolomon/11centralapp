/**
 * Enhanced Tools Deployment Script
 * 
 * This script handles the deployment of all enhanced MCP server tools, 
 * RLS policies, sample data, and ensures the schema cache is properly refreshed.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.local' });

// Helper for executing shell commands
const exec = promisify(childProcess.exec);

// Initialize Supabase client with service role for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Deployment steps and SQL files
const deploymentSteps = [
  {
    name: 'Constraint Detection Enhancements',
    sqlFile: 'fix-information-schema-access.sql',
    description: 'Creating functions for improved constraint detection without direct information_schema access'
  },
  {
    name: 'RLS Policies for Core Tables',
    sqlFile: 'add-rls-policies.sql',
    description: 'Adding Row Level Security policies to roles, departments, and venues tables'
  },
  {
    name: 'RLS Policies for Remaining Tables',
    sqlFile: 'add-rls-policies-remaining.sql',
    description: 'Adding Row Level Security policies to users, schedules, messages, and gratuities tables'
  },
  {
    name: 'Sample Data for Core Tables',
    sqlFile: 'create-sample-data.sql',
    description: 'Creating baseline sample data for venues, roles, departments, and users'
  },
  {
    name: 'Interconnected Sample Data',
    sqlFile: 'create-interconnected-sample-data.sql',
    description: 'Creating comprehensive interconnected data across all tables'
  },
  {
    name: 'Schema Cache Refresh Function',
    sql: `
      CREATE OR REPLACE FUNCTION refresh_schema_cache() RETURNS void AS $$
      BEGIN
        NOTIFY pgrst, 'reload schema';
        RETURN;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `,
    description: 'Creating a function to easily refresh the PostgREST schema cache'
  }
];

// Execute a SQL file against the database
async function executeSqlFile(filePath: string, description: string) {
  try {
    console.log(chalk.blue(`Executing ${path.basename(filePath)}: ${description}`));
    
    // Read SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('execute_custom_sql', {
      sql_string: sql
    });
    
    if (error) {
      console.error(chalk.red(`Error executing SQL file: ${error.message}`));
      return false;
    }
    
    console.log(chalk.green(`✓ Successfully executed ${path.basename(filePath)}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to execute SQL file: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Execute a SQL string against the database
async function executeSql(sql: string, description: string) {
  try {
    console.log(chalk.blue(`Executing SQL: ${description}`));
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('execute_custom_sql', {
      sql_string: sql
    });
    
    if (error) {
      console.error(chalk.red(`Error executing SQL: ${error.message}`));
      return false;
    }
    
    console.log(chalk.green(`✓ Successfully executed SQL`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Refresh the schema cache
async function refreshSchemaCache() {
  try {
    console.log(chalk.blue('Refreshing schema cache...'));
    
    const { data, error } = await supabase.rpc('execute_custom_sql', {
      sql_string: "SELECT refresh_schema_cache();"
    });
    
    if (error) {
      console.error(chalk.red(`Error refreshing schema cache: ${error.message}`));
      return false;
    }
    
    console.log(chalk.green('✓ Schema cache refreshed successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to refresh schema cache: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Check if MCP server is running
async function isMcpServerRunning(): Promise<boolean> {
  try {
    const { stdout } = await exec("pgrep -f 'ts-node src/mcp/index.ts'");
    return stdout.trim() !== '';
  } catch (error) {
    return false;
  }
}

// Start the MCP server
async function startMcpServer() {
  try {
    console.log(chalk.blue('Starting MCP server...'));
    
    if (await isMcpServerRunning()) {
      console.log(chalk.yellow('MCP server is already running.'));
      return true;
    }
    
    const child = childProcess.spawn('npm', ['run', 'mcp:start'], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();
    
    // Wait for server to start
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      console.log(`Waiting for MCP server to start (attempt ${attempts + 1}/${maxAttempts})...`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await fetch('http://localhost:3100', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'rpc.methodCall',
            params: {
              function_name: 'echo',
              parameters: { message: 'test' }
            },
            id: 1
          })
        });
        
        if (response.ok) {
          console.log(chalk.green('✓ MCP server started successfully'));
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      attempts++;
    }
    
    console.error(chalk.red('Failed to start MCP server after multiple attempts'));
    return false;
  } catch (error) {
    console.error(chalk.red(`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Stop the MCP server
async function stopMcpServer() {
  try {
    console.log(chalk.blue('Stopping MCP server...'));
    
    if (!(await isMcpServerRunning())) {
      console.log(chalk.yellow('MCP server is not running.'));
      return true;
    }
    
    await exec("pkill -f 'ts-node src/mcp/index.ts'");
    
    console.log(chalk.green('✓ MCP server stopped successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to stop MCP server: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Run RLS policy tests
async function runRlsTests() {
  try {
    console.log(chalk.blue('Running RLS policy tests...'));
    
    const { stdout, stderr } = await exec('npx ts-node src/mcp/test-rls-policies.ts');
    
    if (stderr) {
      console.error(chalk.red(`RLS tests produced errors: ${stderr}`));
    }
    
    console.log(stdout);
    console.log(chalk.green('✓ RLS tests completed'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to run RLS tests: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Run performance monitoring
async function runPerformanceMonitoring() {
  try {
    console.log(chalk.blue('Running performance monitoring...'));
    
    const { stdout, stderr } = await exec('npx ts-node src/mcp/performance-monitor.ts');
    
    if (stderr) {
      console.error(chalk.red(`Performance monitoring produced errors: ${stderr}`));
    }
    
    console.log(stdout);
    console.log(chalk.green('✓ Performance monitoring completed'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to run performance monitoring: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Main deployment function
async function deploy() {
  console.log(chalk.blue('Starting Enhanced Tools Deployment'));
  
  // Ensure the MCP server is stopped before deployment
  await stopMcpServer();
  
  // Execute each deployment step
  const results = [];
  
  for (const step of deploymentSteps) {
    console.log(chalk.yellow(`\n==== ${step.name} ====`));
    let success = false;
    
    if (step.sqlFile) {
      const filePath = path.join(__dirname, step.sqlFile);
      if (fs.existsSync(filePath)) {
        success = await executeSqlFile(filePath, step.description);
      } else {
        console.error(chalk.red(`SQL file not found: ${step.sqlFile}`));
        success = false;
      }
    } else if (step.sql) {
      success = await executeSql(step.sql, step.description);
    }
    
    results.push({
      name: step.name,
      success
    });
  }
  
  // Refresh schema cache
  const refreshSuccess = await refreshSchemaCache();
  results.push({
    name: 'Schema Cache Refresh',
    success: refreshSuccess
  });
  
  // Start MCP server for testing
  const startSuccess = await startMcpServer();
  results.push({
    name: 'MCP Server Start',
    success: startSuccess
  });
  
  // Wait a moment for server to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run RLS tests if server started successfully
  if (startSuccess) {
    const rlsTestSuccess = await runRlsTests();
    results.push({
      name: 'RLS Policy Tests',
      success: rlsTestSuccess
    });
    
    const perfMonSuccess = await runPerformanceMonitoring();
    results.push({
      name: 'Performance Monitoring',
      success: perfMonSuccess
    });
  }
  
  // Generate deployment report
  console.log(chalk.yellow('\n==== Deployment Summary ===='));
  
  for (const result of results) {
    const status = result.success ? chalk.green('✓ SUCCESS') : chalk.red('✗ FAILED');
    console.log(`${status} | ${result.name}`);
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  console.log(chalk.yellow('\n==== Final Status ===='));
  console.log(`Total Steps: ${results.length}`);
  console.log(`${chalk.green(`Successful: ${successCount}`)}`);
  console.log(`${chalk.red(`Failed: ${failureCount}`)}`);
  
  if (failureCount === 0) {
    console.log(chalk.green('\n✓ Deployment completed successfully!'));
  } else {
    console.log(chalk.red(`\n✗ Deployment completed with ${failureCount} failed steps.`));
  }
  
  // Ask if user wants to keep the MCP server running
  console.log('\nMCP server is still running. You can:');
  console.log('1. Keep it running for further testing');
  console.log('2. Stop it with: npm run mcp:stop');
}

// Run the deployment
deploy().catch(error => {
  console.error(chalk.red('Deployment failed with error:'), error);
}); 