import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { MCPTool } from './server';
import { validate as uuidValidate } from 'uuid';

/**
 * Validates if a string is a valid UUID
 * @param id String to validate
 * @returns Boolean indicating if the string is a valid UUID
 */
function isValidUUID(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Creates an enhanced insert tool with detailed error reporting
 * for debugging database operations
 */
export function createEnhancedInsertTool(supabase: SupabaseClient): MCPTool {
  return {
    name: 'enhanced_insert',
    description: 'Insert data into a table with enhanced error reporting',
    schema: z.object({
      table_name: z.string().describe('Name of the table to insert data into'),
      record: z.record(z.any()).describe('Record to insert (JSON object)'),
      debug_level: z.enum(['basic', 'detailed']).optional().describe('Level of debug information to return (basic or detailed)')
    }),
    handler: async (params: { table_name: string; record: Record<string, any>; debug_level?: 'basic' | 'detailed' }) => {
      try {
        const { table_name, record, debug_level = 'detailed' } = params;
        
        console.log(`Attempting to insert into table '${table_name}':`, record);
        
        // Debug steps collection
        const debugSteps: string[] = [];
        debugSteps.push(`🔍 Attempting insert into table: ${table_name}`);
        debugSteps.push(`📋 Record to insert: ${JSON.stringify(record, null, 2)}`);
        
        // Step 1: Validate UUID if it exists
        if (record.id !== undefined) {
          if (typeof record.id === 'string' && !isValidUUID(record.id)) {
            debugSteps.push('❌ UUID validation failed: The provided ID is not a valid UUID');
            return {
              content: [{ 
                type: 'text', 
                text: `Error inserting record: The 'id' field must be a valid UUID.\nDebug info:\n${debugSteps.join('\n')}` 
              }],
              isError: true
            };
          }
          debugSteps.push('✅ UUID validation passed');
        } else {
          debugSteps.push('ℹ️ No ID field provided, Supabase will generate one automatically');
        }
        
        // Step 2: Check if the table exists and get column info
        const { data: tableInfo, error: tableError } = await supabase.rpc('get_table_columns', { p_table_name: table_name });
        
        if (tableError) {
          debugSteps.push(`❌ Table check failed: ${tableError.message}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error inserting record: Could not verify table '${table_name}'.\nError: ${tableError.message}\nDebug info:\n${debugSteps.join('\n')}` 
            }],
            isError: true
          };
        }
        
        if (!tableInfo || tableInfo.length === 0) {
          debugSteps.push(`❌ Table '${table_name}' does not exist or has no columns`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error inserting record: Table '${table_name}' does not exist or has no columns.\nDebug info:\n${debugSteps.join('\n')}` 
            }],
            isError: true
          };
        }
        
        debugSteps.push(`✅ Table '${table_name}' exists with ${tableInfo.length} columns`);
        
        // Step 3: Validate record against table schema
        const tableColumns = tableInfo.map((col: any) => col.column_name);
        const missingColumns: string[] = [];
        const recordColumns = Object.keys(record);
        
        recordColumns.forEach(col => {
          if (!tableColumns.includes(col)) {
            missingColumns.push(col);
          }
        });
        
        if (missingColumns.length > 0) {
          debugSteps.push(`❌ Schema validation failed: Columns not found in table: ${missingColumns.join(', ')}`);
          debugSteps.push(`ℹ️ Available columns in '${table_name}': ${tableColumns.join(', ')}`);
          
          return {
            content: [{ 
              type: 'text', 
              text: `Error inserting record: Schema mismatch. The following columns do not exist in table '${table_name}': ${missingColumns.join(', ')}.\nAvailable columns: ${tableColumns.join(', ')}\nDebug info:\n${debugSteps.join('\n')}` 
            }],
            isError: true
          };
        }
        
        debugSteps.push('✅ Schema validation passed');
        
        // Step 4: Attempt to insert the record
        const { data, error } = await supabase
          .from(table_name)
          .insert(record)
          .select()
          .single();
        
        if (error) {
          debugSteps.push(`❌ Insert operation failed: ${error.message}`);
          debugSteps.push(`🔍 Error details: ${JSON.stringify(error, null, 2)}`);
          
          // Generate helpful suggestions based on error
          let suggestion = '';
          
          if (error.code === '23505') {
            suggestion = 'This appears to be a unique constraint violation. A record with the same unique key already exists.';
          } else if (error.code === '23503') {
            suggestion = 'This appears to be a foreign key constraint violation. Check that referenced keys exist in parent tables.';
          } else if (error.code === '23502') {
            suggestion = 'This appears to be a NOT NULL constraint violation. Ensure all required fields have values.';
          } else if (error.code === '42P01') {
            suggestion = 'The table does not exist. Check the table name for typos.';
          } else if (error.code === '42703') {
            suggestion = 'Column does not exist. Check column names for typos.';
          } else if (error.message.includes('RLS')) {
            suggestion = 'Row-level security (RLS) policy is preventing the operation. Check permissions or use bypass_rls function.';
          }
          
          if (suggestion) {
            debugSteps.push(`💡 Suggestion: ${suggestion}`);
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: `Error inserting record: ${error.message}\n${suggestion ? 'Suggestion: ' + suggestion + '\n' : ''}Debug info:\n${debugSteps.join('\n')}` 
            }],
            isError: true
          };
        }
        
        debugSteps.push('✅ Insert operation successful');
        debugSteps.push(`📄 Inserted record: ${JSON.stringify(data, null, 2)}`);
        
        // Return success response with appropriate debug level
        if (debug_level === 'basic') {
          return {
            content: [{ 
              type: 'text', 
              text: `Successfully inserted record into '${table_name}'.\nInserted record: ${JSON.stringify(data, null, 2)}` 
            }]
          };
        } else {
          return {
            content: [{ 
              type: 'text', 
              text: `Successfully inserted record into '${table_name}'.\nInserted record: ${JSON.stringify(data, null, 2)}\nDebug info:\n${debugSteps.join('\n')}` 
            }]
          };
        }
      } catch (err) {
        console.error('Unexpected error in enhanced_insert:', err);
        return {
          content: [{ 
            type: 'text', 
            text: `Unexpected error in enhanced_insert: ${err instanceof Error ? err.message : String(err)}` 
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Creates a tool for inspecting table schemas
 */
export function createTableInspectorTool(supabase: SupabaseClient): MCPTool {
  return {
    name: 'inspect_table',
    description: 'Get detailed information about a table schema',
    schema: z.object({
      table_name: z.string().describe('Name of the table to inspect')
    }),
    handler: async (params: { table_name: string }) => {
      try {
        const { table_name } = params;
        
        // Get detailed table info using our custom SQL function
        const { data, error } = await supabase.rpc('get_detailed_table_info', {
          p_table_name: table_name
        });
        
        if (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error inspecting table '${table_name}': ${error.message}` 
            }],
            isError: true
          };
        }
        
        if (!data || data.length === 0) {
          return {
            content: [{ 
              type: 'text', 
              text: `Table '${table_name}' does not exist or has no columns.` 
            }],
            isError: true
          };
        }
        
        // Format the response
        let result = `📋 Table: ${table_name}\n\n`;
        result += `🔑 Columns:\n`;
        
        data.forEach((col: any) => {
          const nullableStr = col.is_nullable ? 'NULL' : 'NOT NULL';
          const defaultStr = col.column_default ? `DEFAULT ${col.column_default}` : '';
          result += `- ${col.column_name} (${col.data_type}) ${nullableStr} ${defaultStr}\n`;
        });
        
        // Get constraints
        const { data: constraints, error: constraintError } = await supabase
          .from('information_schema.table_constraints')
          .select('constraint_type, constraint_name')
          .eq('table_name', table_name);
        
        if (!constraintError && constraints && constraints.length > 0) {
          result += `\n🔒 Constraints:\n`;
          constraints.forEach((constraint: any) => {
            result += `- ${constraint.constraint_name} (${constraint.constraint_type})\n`;
          });
        }
        
        // Check if RLS is enabled
        const { data: rls, error: rlsError } = await supabase
          .from('pg_tables')
          .select('rowsecurity')
          .eq('tablename', table_name)
          .single();
        
        if (!rlsError && rls) {
          result += `\n🛡️ Row Level Security: ${rls.rowsecurity ? 'ENABLED' : 'DISABLED'}\n`;
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: result 
          }]
        };
      } catch (err) {
        console.error('Error in inspect_table:', err);
        return {
          content: [{ 
            type: 'text', 
            text: `Error inspecting table: ${err instanceof Error ? err.message : String(err)}` 
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Adds a SQL function to Supabase to retrieve column information
 * This should be added to the supabase-setup.sql file
 */
export const columnInfoSqlFunction = `
-- Function to get column information for a table
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT 
    columns.column_name::TEXT,
    columns.data_type::TEXT,
    (columns.is_nullable = 'YES')::BOOLEAN
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = p_table_name
  ORDER BY ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION get_table_columns TO service_role;
`;

/**
 * Creates a direct SQL execution tool for bypassing PostgREST
 */
export function createSqlExecutionTool(supabase: SupabaseClient): MCPTool {
  return {
    name: 'execute_sql',
    description: 'Execute raw SQL with proper error handling (SERVICE ROLE ONLY)',
    schema: z.object({
      sql: z.string().describe('SQL statement to execute'),
      params: z.array(z.any()).optional().describe('Parameters for prepared statement')
    }),
    handler: async (sqlParams: { sql: string; params?: any[] }) => {
      try {
        const { sql, params = [] } = sqlParams;
        
        // Execute SQL using RPC
        const { data, error } = await supabase.rpc('execute_sql', {
          query: sql,
          params: params
        });
        
        if (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `SQL Error: ${error.message}\nDetails: ${error.details || 'None'}\nHint: ${error.hint || 'None'}\nCode: ${error.code}` 
            }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: `SQL executed successfully:\n${JSON.stringify(data, null, 2)}` 
          }]
        };
      } catch (error) {
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
}

/**
 * Creates a function to get all debugging tools
 */
export function createDebugTools(supabase: SupabaseClient): MCPTool[] {
  return [
    createEnhancedInsertTool(supabase),
    createTableInspectorTool(supabase),
    createSqlExecutionTool(supabase)
  ];
} 