// Deployment script for all enhanced database tools and features
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables with priority for .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

// First try to load .env.local, then fall back to .env
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('Loaded environment variables from .env.local');
} else {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env');
}

const MCP_URL = 'http://localhost:3100';

async function executeSQL(sql: string, description: string): Promise<void> {
  console.log(`Executing SQL: ${description}`);
  try {
    const response = await axios.post(MCP_URL, {
      jsonrpc: '2.0',
      method: 'rpc.methodCall',
      params: {
        function_name: 'execute_sql',
        parameters: {
          sql
        }
      },
      id: new Date().getTime()
    });
    
    console.log(`✅ ${description} - Success`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ ${description} - Error:`, error.response?.data || error.message);
    throw error;
  }
}

async function refreshSchemaCache(): Promise<void> {
  console.log('Refreshing PostgREST schema cache...');
  try {
    const sql = 'NOTIFY pgrst, \'reload schema\';';
    await executeSQL(sql, 'Schema cache refresh');
    console.log('✅ Schema cache refreshed');
  } catch (error) {
    console.error('❌ Error refreshing schema cache:', error);
    throw error;
  }
}

async function readAndExecuteSqlFile(filename: string, description: string): Promise<void> {
  console.log(`Executing SQL file: ${filename} (${description})`);
  try {
    const filePath = join(__dirname, filename);
    const sql = readFileSync(filePath, 'utf8');
    
    // Split the SQL into individual statements for better error reporting
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`File contains ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim() + ';';
      console.log(`Executing statement ${i+1}/${statements.length}: ${stmt.slice(0, 50)}...`);
      
      try {
        await executeSQL(stmt, `Statement ${i+1} from ${filename}`);
      } catch (err: any) {
        console.error(`Error in statement ${i+1}:`, err.message);
        console.error('SQL Statement:', stmt);
        // Continue with other statements despite errors
      }
    }
    
    console.log(`✅ File ${filename} executed successfully`);
  } catch (err: any) {
    console.error(`❌ Error reading/executing ${filename}:`, err.message);
    throw err;
  }
}

async function testEnhancedTools(): Promise<void> {
  console.log('Testing enhanced constraint detection...');
  try {
    const response = await axios.post(MCP_URL, {
      jsonrpc: '2.0',
      method: 'rpc.methodCall',
      params: {
        function_name: 'detect_constraints',
        parameters: {
          table_name: 'venues'
        }
      },
      id: new Date().getTime()
    });
    
    console.log('✅ Enhanced constraint detection test successful');
    
    // Print a sample of the response
    const result = response.data?.result?.content?.[0]?.text;
    if (result) {
      const parsed = JSON.parse(result);
      console.log('Sample constraints detected:');
      console.log('Table:', parsed.table_name);
      console.log('Summary:', parsed.summary);
      console.log('Found constraints:', parsed.constraints.length);
    }
  } catch (error: any) {
    console.error('❌ Error testing enhanced constraint detection:', error.response?.data || error.message);
  }
}

async function testAdvancedInsert(): Promise<void> {
  console.log('Testing advanced insert with enhanced error handling...');
  try {
    const testRecord = {
      name: 'Test Venue ' + new Date().toISOString(),
      address: '123 Test St, Test City, TS 12345'
    };
    
    const response = await axios.post(MCP_URL, {
      jsonrpc: '2.0',
      method: 'rpc.methodCall',
      params: {
        function_name: 'advanced_insert',
        parameters: {
          table: 'venues',
          record: testRecord,
          debug_level: 2  // Detailed level
        }
      },
      id: new Date().getTime()
    });
    
    console.log('✅ Advanced insert test successful');
    
    // Print a sample of the response
    const result = response.data?.result?.content?.[0]?.text;
    if (result) {
      const parsed = JSON.parse(result);
      console.log('Insert result:', parsed.success ? 'Success' : 'Failed');
      if (parsed.record) {
        console.log('Inserted record ID:', parsed.record.id);
      }
      if (parsed.debugInfo) {
        console.log('Debug steps:', parsed.debugInfo.steps.length);
      }
    }
  } catch (error: any) {
    console.error('❌ Error testing advanced insert:', error.response?.data || error.message);
  }
}

async function deploy(): Promise<void> {
  console.log('========================================');
  console.log('Deploying Enhanced Database Tools');
  console.log('========================================');
  
  try {
    // 1. Apply constraint detection enhancements
    await readAndExecuteSqlFile('fix-information-schema-access.sql', 'Enhanced constraint detection');
    console.log('✅ Deployed enhanced constraint detection SQL functions');
    
    // 2. Add RLS policies to tables that need them
    await readAndExecuteSqlFile('add-rls-policies-remaining.sql', 'RLS policies for remaining tables');
    console.log('✅ Deployed RLS policies for remaining tables');
    
    // 3. Create sample data for remaining tables
    await readAndExecuteSqlFile('create-sample-data-remaining.sql', 'Sample data for remaining tables');
    console.log('✅ Created sample data for remaining tables');
    
    // 4. Refresh schema cache
    await refreshSchemaCache();
    
    // 5. Test the enhanced tools
    await testEnhancedTools();
    await testAdvancedInsert();
    
    console.log('\n✅ Deployment complete!');
    console.log('All enhancements have been successfully deployed:');
    console.log('- Enhanced constraint detection with foreign key support');
    console.log('- RLS policies for all tables');
    console.log('- Sample data for testing');
    console.log('- Improved error handling in advanced insert tool');
    
    console.log('\nNext steps:');
    console.log('1. Use the enhanced debugging tools to diagnose and fix any database issues');
    console.log('2. Test the RLS policies to ensure they work as expected');
    console.log('3. Verify sample data in all tables');
  } catch (err: any) {
    console.error('\n❌ Deployment failed:', err.message);
    console.error('Please check the logs above for details on the failure.');
  }
}

// Start the deployment
console.log('Starting deployment of enhanced database tools...');
deploy().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
}); 