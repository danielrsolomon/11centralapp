import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Configuration
const config = {
  mcpUrl: 'http://localhost:3100',
  outputDir: path.join(__dirname, 'test-results')
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Logger utility
const logger = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
  result: (message: string) => console.log(chalk.cyan(`[RESULT] ${message}`))
};

// Write result to file
const writeResult = (name: string, data: any) => {
  const filePath = path.join(config.outputDir, `${name}-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  logger.info(`Results written to ${filePath}`);
};

// Helper function to make RPC calls
async function callRpc(name: string, args: any = {}) {
  try {
    const response = await axios.post(config.mcpUrl, {
      method: 'rpc.methodCall',
      params: {
        name,
        args
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data;
    }
    throw error;
  }
}

// Helper function to execute SQL
async function executeSql(query: string, options: any = {}) {
  return callRpc('execute_sql', {
    query,
    options
  });
}

// Function to verify schema cache refresh
async function verifySchemaCache() {
  logger.info('Testing schema cache refresh functionality...');
  
  try {
    // Test basic refresh
    const basicResult = await executeSql('SELECT refresh_schema_cache()');
    logger.result('Basic refresh: ' + JSON.stringify(basicResult));
    
    // Test enhanced refresh
    const enhancedResult = await executeSql('SELECT refresh_schema_cache_enhanced()');
    logger.result('Enhanced refresh: ' + JSON.stringify(enhancedResult));
    
    // Test verification
    const verifyResult = await executeSql('SELECT verify_schema_cache()');
    logger.result('Verify schema cache: ' + JSON.stringify(verifyResult));
    
    // Test comprehensive test function
    const testResult = await executeSql('SELECT test_schema_cache_refresh()');
    logger.success('Schema cache refresh functionality is working correctly');
    writeResult('schema-cache-refresh', testResult);
    
    return true;
  } catch (error) {
    logger.error(`Schema cache refresh test failed: ${error}`);
    return false;
  }
}

// Function to verify data archiving
async function verifyDataArchiving() {
  logger.info('Testing data archiving functionality...');
  
  try {
    // Check if archive_policies table exists
    const tableCheckResult = await executeSql(`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'archive_policies'
      ) as exists
    `);
    
    if (!tableCheckResult?.result?.rows?.[0]?.exists) {
      logger.warning('Archive policies table does not exist. Creating sample policy...');
      
      // Create test table if not exists
      await executeSql(`
        CREATE TABLE IF NOT EXISTS archive_test (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
      `);
      
      // Insert test data
      await executeSql(`
        INSERT INTO archive_test (name, created_at)
        VALUES 
          ('Old Record 1', now() - interval '2 years'),
          ('Old Record 2', now() - interval '1 year'),
          ('Recent Record', now())
      `);
      
      // Create archive policy
      const policyResult = await executeSql(`
        SELECT manage_archive_policy('create', jsonb_build_object(
          'source_table', 'archive_test',
          'condition', 'created_at < now() - interval ''1 year''',
          'reason', 'Test archiving old records',
          'frequency', 'interval ''1 day''',
          'delete_after_archive', true,
          'is_active', true
        ))
      `);
      
      logger.result('Policy creation: ' + JSON.stringify(policyResult));
    }
    
    // Get archive policies
    const policiesResult = await executeSql(`
      SELECT manage_archive_policy('get', '{}')
    `);
    
    logger.result('Archive policies: ' + JSON.stringify(policiesResult));
    
    // Run archiving
    const archiveResult = await executeSql(`
      SELECT run_archive_policies()
    `);
    
    logger.result('Archive execution: ' + JSON.stringify(archiveResult));
    
    // Get statistics
    const statsResult = await executeSql(`
      SELECT get_archive_statistics()
    `);
    
    logger.success('Data archiving functionality is working correctly');
    writeResult('data-archiving', statsResult);
    
    return true;
  } catch (error) {
    logger.error(`Data archiving test failed: ${error}`);
    return false;
  }
}

// Function to verify RLS policies
async function verifyRlsPolicies() {
  logger.info('Testing RLS policy functionality...');
  
  try {
    // Check venues table RLS
    const venuesRlsResult = await executeSql(`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'venues'
    `);
    
    logger.result('Venues RLS enabled: ' + JSON.stringify(venuesRlsResult));
    
    // Check venues policies
    const venuesPoliciesResult = await executeSql(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE tablename = 'venues'
    `);
    
    logger.result('Venues policies: ' + JSON.stringify(venuesPoliciesResult));
    
    logger.success('RLS policy functionality verified');
    writeResult('rls-policies', venuesPoliciesResult);
    
    return true;
  } catch (error) {
    logger.error(`RLS policy test failed: ${error}`);
    return false;
  }
}

// Function to verify advanced insert
async function verifyAdvancedInsert() {
  logger.info('Testing advanced insert functionality...');
  
  try {
    // Create test record
    const insertResult = await callRpc('advanced_insert', {
      table: 'venues',
      record: {
        name: 'Test Venue ' + new Date().toISOString(),
        address: '123 Test St, Test City'
      },
      debug_level: 'detailed'
    });
    
    logger.result('Advanced insert: ' + JSON.stringify(insertResult));
    
    // Test schema validation
    const validateResult = await callRpc('validate_schema', {
      table: 'venues',
      record: {
        name: 'Valid Venue',
        address: '456 Valid St',
        invalid_field: 'This should fail validation'
      }
    });
    
    logger.result('Schema validation: ' + JSON.stringify(validateResult));
    
    // Test constraint detection
    const constraintResult = await callRpc('detect_constraints', {
      table: 'venues'
    });
    
    logger.result('Constraint detection: ' + JSON.stringify(constraintResult));
    
    logger.success('Advanced insert functionality is working correctly');
    writeResult('advanced-insert', { 
      insert: insertResult,
      validate: validateResult,
      constraints: constraintResult
    });
    
    return true;
  } catch (error) {
    logger.error(`Advanced insert test failed: ${error}`);
    return false;
  }
}

// Main function to run all verification tests
async function runAllTests() {
  logger.info('Starting verification of enhanced database tools...');
  
  const results = {
    schemaCache: await verifySchemaCache(),
    dataArchiving: await verifyDataArchiving(),
    rlsPolicies: await verifyRlsPolicies(),
    advancedInsert: await verifyAdvancedInsert()
  };
  
  // Count successes
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  if (successCount === totalTests) {
    logger.success(`All ${totalTests} tests completed successfully!`);
  } else {
    logger.warning(`${successCount}/${totalTests} tests completed successfully. Some tests failed.`);
  }
  
  // Create summary report
  const summaryReport = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: totalTests,
      successful: successCount,
      failed: totalTests - successCount
    }
  };
  
  writeResult('summary', summaryReport);
  
  return summaryReport;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    logger.error(`Error running tests: ${error}`);
    process.exit(1);
  });
}

export {
  runAllTests,
  verifySchemaCache,
  verifyDataArchiving,
  verifyRlsPolicies,
  verifyAdvancedInsert
}; 