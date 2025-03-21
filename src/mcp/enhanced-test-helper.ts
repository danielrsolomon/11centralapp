import * as http from 'http';

const port = 3100;

/**
 * Make a JSON-RPC request to the MCP server
 * @param functionName The name of the function to call
 * @param params The parameters to pass to the function
 * @returns Promise resolving to the response
 */
async function callMCPFunction(functionName: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      method: 'rpc.methodCall',
      params: {
        function_name: functionName,
        parameters: params
      },
      id: Date.now()
    });

    const options = {
      hostname: 'localhost',
      port,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Extract and format content from MCP response
 * @param response The MCP response
 * @returns The extracted content
 */
function extractContent(response: any): any {
  if (response.result && response.result.content && response.result.content.length > 0) {
    try {
      return JSON.parse(response.result.content[0].text);
    } catch (error) {
      return response.result.content[0].text;
    }
  }
  if (response.error) {
    return { error: response.error.message };
  }
  return response;
}

/**
 * Inspect the structure of a table
 * @param tableName The name of the table to inspect
 */
async function inspectTable(tableName: string): Promise<void> {
  console.log(`Inspecting table '${tableName}'...`);
  const response = await callMCPFunction('inspect_table', { table_name: tableName });
  const result = extractContent(response);
  console.log(result);
}

/**
 * Test inserting data into a table with enhanced debugging
 * @param tableName The name of the table to insert into
 * @param record The record to insert
 * @param debugLevel The level of debugging information to return
 */
async function testEnhancedInsert(
  tableName: string, 
  record: Record<string, any>, 
  debugLevel: 'basic' | 'detailed' = 'detailed'
): Promise<void> {
  console.log(`Testing enhanced insert into '${tableName}'...`);
  const response = await callMCPFunction('enhanced_insert', { 
    table_name: tableName, 
    record, 
    debug_level: debugLevel
  });
  const result = extractContent(response);
  console.log(result);
}

/**
 * Execute a SQL query
 * @param sql The SQL query to execute
 * @param params The parameters for the SQL query
 */
async function executeSql(sql: string, params: any[] = []): Promise<void> {
  console.log(`Executing SQL: ${sql}`);
  const response = await callMCPFunction('execute_sql', { sql, params });
  const result = extractContent(response);
  console.log(result);
}

// Run the main test sequence
async function main() {
  try {
    // 1. Inspect the venues table
    await inspectTable('venues');
    
    console.log('\n' + '-'.repeat(80) + '\n');
    
    // 2. Try to insert data with detailed debugging
    await testEnhancedInsert('venues', {
      name: 'E11EVEN Miami',
      address: '29 NE 11th St, Miami, FL 33132'
    });
    
    console.log('\n' + '-'.repeat(80) + '\n');
    
    // 3. Execute a SQL query to list tables
    await executeSql('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = $1', ['public']);
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the main function
main(); 