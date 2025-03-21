import { MCPServer, MCPTool } from './server';
import { z } from 'zod';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  testTableAccess, 
  testAllTablesAccess, 
  analyzeTableStructure, 
  analyzeRoles 
} from './enhanced-test-tools';
import { expectedTables } from './supabase-structure';
import { createSchemaTools } from './schema-tools';
import { createDebugTools } from './enhanced-insert-tool';
import { registerEnhancedDataTools } from './enhanced-data-tools';
import { 
  DebugLevel, 
  advancedInsert, 
  validateSchema, 
  detectTableConstraints,
  getDetailedTableSchema
} from './schema-tools';
import * as fs from 'fs';
import * as path from 'path';

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

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Validate Supabase URL
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL. Please check your .env file.');
  console.error('Current value:', supabaseUrl);
  console.error('Expected format: https://your-project-id.supabase.co');
  process.exit(1);
}

// Decode JWT token to check role
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Check if using service role key
const decodedToken = decodeJWT(supabaseKey);
const isServiceRole = decodedToken && decodedToken.role === 'service_role';

if (!isServiceRole) {
  console.warn('WARNING: Not using a service role key. Some functionality will be limited.');
  console.warn('Current role:', decodedToken?.role || 'unknown');
  console.warn('For full functionality, use the service role key from Supabase dashboard > Settings > API.');
} else {
  console.log('✅ Using service role key - full database access enabled');
}

let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  process.exit(1);
}

async function startServer() {
  // Get the port from environment variable, argument, or default to 8000
  const forcedPort = process.env.MCP_FORCE_PORT ? parseInt(process.env.MCP_FORCE_PORT, 10) : null;
  const argPort = process.argv.length > 2 ? parseInt(process.argv[2], 10) : null;
  const port = forcedPort || argPort || 8000;
  
  // Create and configure the MCP server
  const server = new MCPServer({
    port: port,
    cors: true,
    name: 'E11even MCP Server',
    description: 'MCP Server for E11even Central App',
    models: ['claude-3-opus-20240229'],
    defaultContextLength: 100000,
    logging: true
  });

  // Register a simple echo tool for testing
  const echoTool: MCPTool = {
    name: 'echo',
    description: 'Echo back the input message',
    schema: z.object({
      message: z.string().describe('The message to echo back')
    }),
    handler: async (params: { message: string }) => {
      return {
        content: [{ 
          type: 'text', 
          text: `Echo: ${params.message}` 
        }]
      };
    }
  };

  server.registerTool(echoTool);

  // Register enhanced Supabase testing tools
  const testSpecificTableTool: MCPTool = {
    name: 'test_table_access',
    description: 'Test access to a specific table in Supabase',
    schema: z.object({
      table_name: z.string().describe('Name of the table to test')
    }),
    handler: async (params: { table_name: string }) => {
      try {
        const result = await testTableAccess(supabase, params.table_name);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2) 
          }]
        };
      } catch (error) {
        console.error('Error testing table access:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error testing table access: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };

  server.registerTool(testSpecificTableTool);

  const analyzeTableStructureTool: MCPTool = {
    name: 'analyze_table_structure',
    description: 'Analyze the structure of tables in Supabase',
    schema: z.object({}),
    handler: async () => {
      try {
        const result = await analyzeTableStructure(supabase);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2) 
          }]
        };
      } catch (error) {
        console.error('Error analyzing table structure:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error analyzing table structure: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };

  server.registerTool(analyzeTableStructureTool);

  const analyzeRolesTool: MCPTool = {
    name: 'analyze_roles',
    description: 'Analyze the roles in Supabase',
    schema: z.object({}),
    handler: async () => {
      try {
        const result = await analyzeRoles(supabase);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2) 
          }]
        };
      } catch (error) {
        console.error('Error analyzing roles:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error analyzing roles: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };

  server.registerTool(analyzeRolesTool);

  const getExpectedSchemaTable: MCPTool = {
    name: 'get_expected_schema',
    description: 'Get the expected schema for a specific table or all tables',
    schema: z.object({
      table_name: z.string().optional().describe('Name of the table to get schema for (optional, if not provided returns all tables)')
    }),
    handler: async (params: { table_name?: string }) => {
      try {
        if (params.table_name) {
          const table = expectedTables.find(t => t.name === params.table_name);
          if (!table) {
            return {
              content: [{ 
                type: 'text', 
                text: `Table ${params.table_name} not found in expected schema` 
              }],
              isError: true
            };
          }
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify(table, null, 2) 
            }]
          };
        } else {
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify(expectedTables, null, 2) 
            }]
          };
        }
      } catch (error) {
        console.error('Error getting expected schema:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting expected schema: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };

  server.registerTool(getExpectedSchemaTable);

  // Register schema management tools if using service role key
  if (isServiceRole) {
    console.log('Registering schema management tools (enabled by service role key)');
    const schemaTools = createSchemaTools(supabase);
    schemaTools.forEach(tool => server.registerTool(tool));

    console.log('Registering enhanced debugging tools (enabled by service role key)');
    const debugTools = createDebugTools(supabase);
    debugTools.forEach(tool => server.registerTool(tool));
    
    // Register our new advanced data debugging tools
    console.log('Registering advanced data debugging tools');
    registerEnhancedDataTools(supabase, server);

    // Register additional enhanced tools using the proper format
    const advancedInsertTool: MCPTool = {
      name: 'advanced_insert',
      description: 'Insert a record with advanced validation and debugging',
      schema: z.object({
        table: z.string().describe('Table name to insert into'),
        record: z.any().describe('Record to insert'),
        debug_level: z.union([
          z.literal('none').transform(() => DebugLevel.NONE),
          z.literal('basic').transform(() => DebugLevel.BASIC),
          z.literal('detailed').transform(() => DebugLevel.DETAILED),
          z.literal('verbose').transform(() => DebugLevel.VERBOSE),
          z.number()
        ]).optional().describe('Debug level (none, basic, detailed, verbose)'),
        generate_id: z.boolean().optional().describe('Whether to generate ID if missing'),
        id_field: z.string().optional().describe('Field to use as ID')
      }),
      handler: async (payload: any) => {
        const { table, record, debug_level = DebugLevel.BASIC, generate_id = true, id_field = 'id' } = payload;
        
        if (!table || !record) {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ error: 'Table and record are required' }) }],
            isError: true
          };
        }
        
        const result = await advancedInsert(
          supabase,
          table,
          record,
          {
            debug: debug_level as DebugLevel,
            generateId: generate_id,
            idField: id_field
          }
        );
        
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    };
    server.registerTool(advancedInsertTool);

    const validateSchemaTool: MCPTool = {
      name: 'validate_schema',
      description: 'Validate a record against a table schema',
      schema: z.object({
        table: z.string().describe('Table name'),
        record: z.any().describe('Record to validate')
      }),
      handler: async (payload: any) => {
        const { table, record } = payload;
        
        if (!table || !record) {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ error: 'Table and record are required' }) }],
            isError: true
          };
        }
        
        const result = await validateSchema(supabase, table, record);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    };
    server.registerTool(validateSchemaTool);

    const detectConstraintsTool: MCPTool = {
      name: 'detect_constraints',
      description: 'Detect constraints for a table',
      schema: z.object({
        table_name: z.string().describe('Table name')
      }),
      handler: async (payload: any) => {
        const { table_name } = payload;
        
        if (!table_name) {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ error: 'Table name is required' }) }],
            isError: true
          };
        }
        
        try {
          // Use the enhanced get_table_constraints function
          const { data: constraints, error: constraintsError } = await supabase.rpc(
            'get_table_constraints', 
            { table_name }
          );
          
          if (constraintsError) {
            return { 
              content: [{ type: 'text', text: `Error getting constraints: ${constraintsError.message}` }],
              isError: true
            };
          }
          
          // Get references to this table (tables that reference this one)
          const { data: references, error: referencesError } = await supabase.rpc(
            'get_references_to_table', 
            { table_name }
          );
          
          if (referencesError) {
            console.warn(`Warning getting references: ${referencesError.message}`);
          }
          
          // Get column details
          const { data: columns, error: columnsError } = await supabase.rpc(
            'get_table_columns_detailed', 
            { table_name }
          );
          
          if (columnsError) {
            console.warn(`Warning getting columns: ${columnsError.message}`);
          }
          
          // Build a comprehensive result
          const result = {
            table_name,
            constraints: constraints || [],
            references: references || [],
            columns: columns || [],
            summary: {
              primary_keys: 0,
              foreign_keys: 0,
              unique_constraints: 0,
              not_null_columns: 0,
              referenced_by: references ? references.length : 0
            }
          };
          
          // Count constraint types
          if (constraints && Array.isArray(constraints)) {
            constraints.forEach((constraint: any) => {
              if (constraint.constraint_type === 'PRIMARY KEY') {
                result.summary.primary_keys++;
              } else if (constraint.constraint_type === 'FOREIGN KEY') {
                result.summary.foreign_keys++;
              } else if (constraint.constraint_type === 'UNIQUE') {
                result.summary.unique_constraints++;
              }
            });
          }
          
          // Count NOT NULL columns
          if (columns && Array.isArray(columns)) {
            columns.forEach((column: any) => {
              if (column.is_nullable === 'NO') {
                result.summary.not_null_columns++;
              }
            });
          }
          
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (err: any) {
          return { 
            content: [{ type: 'text', text: `Error detecting constraints: ${err.message}` }],
            isError: true
          };
        }
      }
    };
    server.registerTool(detectConstraintsTool);

    const getDetailedSchemaTool: MCPTool = {
      name: 'get_detailed_schema',
      description: 'Get detailed schema information for a table',
      schema: z.object({
        table: z.string().describe('Table name')
      }),
      handler: async (payload: any) => {
        const { table } = payload;
        
        if (!table) {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ error: 'Table name is required' }) }],
            isError: true
          };
        }
        
        const result = await getDetailedTableSchema(supabase, table);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    };
    server.registerTool(getDetailedSchemaTool);

    // Enhanced test helper to check all tables
    const testAllTablesTool: MCPTool = {
      name: 'test_all_tables',
      description: 'Test access to all tables',
      schema: z.object({}),
      handler: async () => {
        try {
          // Get list of all tables
          const { data: tables, error: tablesError } = await supabase.rpc('list_all_tables');
          
          if (tablesError) {
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify({
                  success: false,
                  error: tablesError.message,
                  expected_tables: expectedTables
                }, null, 2) 
              }],
              isError: true
            };
          }
          
          // Test each table for read/write access
          const tableResults = [];
          
          for (const table of tables || []) {
            try {
              // Check if we can read
              const { data: readData, error: readError } = await supabase
                .from(table)
                .select('*')
                .limit(1);
                
              // Check if we can insert (with a rollback)
              let insertResult = { success: false, error: null as string | null };
              
              await supabase.rpc('begin_transaction');
              try {
                const testRecord = { id: '00000000-0000-0000-0000-000000000000' };
                const { error: insertError } = await supabase
                  .from(table)
                  .insert(testRecord);
                  
                if (!insertError) {
                  insertResult.success = true;
                } else {
                  insertResult.error = insertError.message;
                }
              } finally {
                await supabase.rpc('rollback_transaction');
              }
              
              tableResults.push({
                table,
                can_read: !readError,
                can_write: insertResult.success,
                read_error: readError?.message,
                write_error: insertResult.error
              });
            } catch (err: any) {
              tableResults.push({
                table,
                can_read: false,
                can_write: false,
                error: err.message
              });
            }
          }
          
          const result = {
            success: true,
            found_tables: tables?.length || 0,
            expected_tables: expectedTables.length,
            missing_tables: expectedTables.filter(t => !tables?.includes(t)),
            table_results: tableResults
          };
          
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (err: any) {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message }, null, 2) }],
            isError: true
          };
        }
      }
    };
    server.registerTool(testAllTablesTool);
  }

  // Only register Supabase user tools if we can connect to Supabase
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    
    console.log('Successfully connected to Supabase');
    
    // Register Supabase tools
    const getUserTool: MCPTool = {
      name: 'get_user',
      description: 'Get user information by ID',
      schema: z.object({
        user_id: z.string().describe('The ID of the user to retrieve')
      }),
      handler: async (params: { user_id: string }) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', params.user_id)
            .single();
            
          if (error) throw error;
          
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify(data) 
            }]
          };
        } catch (error) {
          console.error('Error fetching user:', error);
          return {
            content: [{ 
              type: 'text', 
              text: `Error fetching user: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    };

    server.registerTool(getUserTool);
  } catch (error) {
    console.warn('Failed to connect to Supabase user table. Some Supabase tools will not be available.');
    console.warn('Error:', error);
  }

  // Enhanced execute SQL tool with support for complex queries
  const executeSqlTool: MCPTool = {
    name: 'execute_sql',
    description: 'Execute a SQL statement with enhanced support for complex queries',
    schema: z.object({
      sql: z.string().describe('SQL statement to execute'),
      multi_statement: z.boolean().optional().describe('Whether to allow multiple statements in one query (default: false)'),
      return_data: z.boolean().optional().describe('Whether to return data from the query (default: true)'),
      transaction: z.boolean().optional().describe('Whether to run the query in a transaction (default: true)')
    }),
    handler: async (params: { 
      sql: string, 
      multi_statement?: boolean, 
      return_data?: boolean,
      transaction?: boolean 
    }) => {
      if (!isServiceRole) {
        return {
          content: [{ 
            type: 'text', 
            text: 'The execute_sql tool requires service role permissions for security reasons.' 
          }],
          isError: true
        };
      }
      
      try {
        const { sql, multi_statement = false, return_data = true, transaction = true } = params;
        
        if (!sql.trim()) {
          return {
            content: [{ 
              type: 'text', 
              text: 'SQL statement cannot be empty.' 
            }],
            isError: true
          };
        }
        
        // Check if this is a schema-altering query (CREATE, ALTER, DROP, etc.)
        const isSchemaAltering = /\b(CREATE|ALTER|DROP|GRANT|REVOKE|TRUNCATE)\b/i.test(sql);
        
        // For multi-statement queries, we need special handling
        if (multi_statement) {
          // Split SQL by semicolons but keep them in the statements
          const statements = sql.split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0)
            .map(stmt => stmt + ';');
            
          const results = [];
          let hasError = false;
          
          // Start transaction if needed
          if (transaction && statements.length > 1) {
            await supabase.rpc('begin_transaction');
          }
          
          try {
            // Execute each statement
            for (const statement of statements) {
              try {
                const { data, error, count } = await supabase.rpc('execute_custom_sql', { 
                  sql_string: statement 
                });
                
                if (error) {
                  results.push({ 
                    statement, 
                    success: false, 
                    error: error.message,
                    code: error.code,
                    details: error.details || null
                  });
                  hasError = true;
                  
                  // Break on first error if in transaction
                  if (transaction) {
                    break;
                  }
                } else {
                  results.push({ 
                    statement, 
                    success: true, 
                    count: count,
                    data: return_data ? data : null
                  });
                }
              } catch (err: any) {
                results.push({ 
                  statement, 
                  success: false, 
                  error: err.message 
                });
                hasError = true;
                
                // Break on first error if in transaction
                if (transaction) {
                  break;
                }
              }
            }
            
            // Commit or rollback transaction
            if (transaction && statements.length > 1) {
              if (hasError) {
                await supabase.rpc('rollback_transaction');
              } else {
                await supabase.rpc('commit_transaction');
              }
            }
            
            // Auto-refresh schema cache if schema was altered
            if (isSchemaAltering && !hasError) {
              try {
                await supabase.rpc('execute_custom_sql', { 
                  sql_string: "NOTIFY pgrst, 'reload schema';" 
                });
                results.push({ 
                  statement: "NOTIFY pgrst, 'reload schema';", 
                  success: true, 
                  message: 'Schema cache refreshed'
                });
              } catch (err: any) {
                results.push({ 
                  statement: "NOTIFY pgrst, 'reload schema';", 
                  success: false, 
                  error: err.message,
                  message: 'Failed to refresh schema cache'
                });
              }
            }
            
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify({
                  success: !hasError,
                  results: results
                }, null, 2) 
              }]
            };
          } catch (err: any) {
            // Ensure transaction is rolled back on any error
            if (transaction && statements.length > 1) {
              await supabase.rpc('rollback_transaction');
            }
            
            throw err;
          }
        } else {
          // Single statement execution
          const { data, error, count } = await supabase.rpc('execute_custom_sql', { 
            sql_string: sql 
          });
          
          if (error) {
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify({
                  success: false,
                  error: error.message,
                  code: error.code,
                  details: error.details || null
                }, null, 2)
              }],
              isError: true
            };
          }
          
          // Auto-refresh schema cache if schema was altered
          if (isSchemaAltering) {
            try {
              await supabase.rpc('execute_custom_sql', { 
                sql_string: "NOTIFY pgrst, 'reload schema';" 
              });
            } catch (err: any) {
              console.warn('Failed to refresh schema cache:', err);
            }
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({
                success: true,
                count: count,
                data: return_data ? data : null,
                schema_refreshed: isSchemaAltering
              }, null, 2) 
            }]
          };
        }
      } catch (error) {
        console.error('Error executing SQL:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error executing SQL: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
  
  server.registerTool(executeSqlTool);
  
  // Create an RPC function to execute custom SQL with proper permissions
  const createExecuteSqlFunction = async () => {
    try {
      const functionSql = `
        CREATE OR REPLACE FUNCTION execute_custom_sql(sql_string TEXT)
        RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
        DECLARE
          result JSONB;
          affected_count INTEGER;
        BEGIN
          EXECUTE sql_string INTO result;
          GET DIAGNOSTICS affected_count = ROW_COUNT;
          RETURN jsonb_build_object(
            'data', COALESCE(result, '[]'::jsonb),
            'count', affected_count
          );
        EXCEPTION
          WHEN OTHERS THEN
            RETURN jsonb_build_object(
              'error', SQLERRM,
              'code', SQLSTATE
            );
        END;
        $$;
      `;
      
      await supabase.rpc('execute_custom_sql', { sql_string: functionSql });
      console.log('✅ Created/updated execute_custom_sql function');
    } catch (error) {
      console.warn('Failed to create execute_custom_sql function:', error);
      console.warn('Advanced SQL execution features may be limited');
    }
  };
  
  // Create and set up transaction management functions
  const createTransactionFunctions = async () => {
    try {
      // Function to begin a transaction
      const beginTransactionSql = `
        CREATE OR REPLACE FUNCTION begin_transaction()
        RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          BEGIN;
        END;
        $$;
      `;
      
      // Function to commit a transaction
      const commitTransactionSql = `
        CREATE OR REPLACE FUNCTION commit_transaction()
        RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          COMMIT;
        END;
        $$;
      `;
      
      // Function to rollback a transaction
      const rollbackTransactionSql = `
        CREATE OR REPLACE FUNCTION rollback_transaction()
        RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          ROLLBACK;
        END;
        $$;
      `;
      
      await supabase.rpc('execute_custom_sql', { sql_string: beginTransactionSql });
      await supabase.rpc('execute_custom_sql', { sql_string: commitTransactionSql });
      await supabase.rpc('execute_custom_sql', { sql_string: rollbackTransactionSql });
      console.log('✅ Created/updated transaction management functions');
    } catch (error) {
      console.warn('Failed to create transaction management functions:', error);
      console.warn('Transaction support may be limited');
    }
  };
  
  // Create a function to refresh the schema cache
  const createRefreshSchemaCacheFunction = async () => {
    try {
      const refreshSchemaCacheSql = `
        CREATE OR REPLACE FUNCTION refresh_schema_cache()
        RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          NOTIFY pgrst, 'reload schema';
        END;
        $$;
      `;
      
      await supabase.rpc('execute_custom_sql', { sql_string: refreshSchemaCacheSql });
      console.log('✅ Created/updated refresh_schema_cache function');
    } catch (error) {
      console.warn('Failed to create refresh_schema_cache function:', error);
      console.warn('Schema cache refresh may need to be done manually');
    }
  };
  
  // Set up required SQL functions if using service role
  if (isServiceRole) {
    // Use Promise.all to set up all functions in parallel
    Promise.all([
      createExecuteSqlFunction(),
      createTransactionFunctions(),
      createRefreshSchemaCacheFunction()
    ]).catch(error => {
      console.error('Error setting up SQL functions:', error);
    });
  }

  // Start the server
  await server.start();
  const serverConfig = server.getConfig();
  console.log(`MCP Server started on port ${serverConfig.port}`);
  console.log(`MCP Server running at http://localhost:${serverConfig.port}`);
  console.log('Available tools:');
  server.getTools().forEach((tool) => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
}); 