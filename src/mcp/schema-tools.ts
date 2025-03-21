import { PostgrestError, SupabaseClient, createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { MCPTool } from './server';
import { expectedTables } from './supabase-structure';

// Debug levels
export enum DebugLevel {
  NONE = 0,
  BASIC = 1,
  DETAILED = 2,
  VERBOSE = 3,
}

// Schema validation result
export interface SchemaValidationResult {
  isValid: boolean;
  invalidColumns?: string[];
  missingColumns?: string[];
  availableColumns?: string[];
  record?: any;
}

// Advanced insert result with detailed debug info
export interface AdvancedInsertResult {
  success: boolean;
  record?: any;
  error?: any;
  errorCode?: string;
  errorMessage?: string;
  constraintName?: string;
  debugInfo?: any;
  suggestedFix?: string;
}

// Constraint info structure
export interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  table_name: string;
  referenced_table?: string;
  column_name?: string;
  referenced_column?: string;
}

// Column info structure
export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
}

// Table structure for schema operations
export interface TableStructure {
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  primaryKey?: string;
}

/**
 * Creates a set of database management tools for the MCP server
 * These tools require the service role key to work properly
 */
export function createSchemaTools(supabase: SupabaseClient): MCPTool[] {
  const tools: MCPTool[] = [];

  // Tool to create a table if it doesn't exist
  const createTableTool: MCPTool = {
    name: 'create_table',
    description: 'Create a new table in the database if it doesn\'t exist',
    schema: z.object({
      table_name: z.string().describe('Name of the table to create')
    }),
    handler: async (params: { table_name: string }) => {
      try {
        const { data, error } = await supabase.rpc('create_table_if_not_exists', { 
          table_name: params.table_name 
        });

        if (error) throw error;

        return {
          content: [{ 
            type: 'text', 
            text: `Successfully created table: ${params.table_name}` 
          }]
        };
      } catch (error) {
        console.error('Error creating table:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating table: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
  tools.push(createTableTool);

  // Tool to add a column to a table
  const addColumnTool: MCPTool = {
    name: 'add_column',
    description: 'Add a column to an existing table if it doesn\'t exist',
    schema: z.object({
      table_name: z.string().describe('Name of the table to modify'),
      column_name: z.string().describe('Name of the column to add'),
      column_type: z.string().describe('PostgreSQL data type for the column')
    }),
    handler: async (params: { table_name: string, column_name: string, column_type: string }) => {
      try {
        const { data, error } = await supabase.rpc('add_column_if_not_exists', { 
          table_name: params.table_name,
          column_name: params.column_name,
          column_type: params.column_type
        });

        if (error) throw error;

        return {
          content: [{ 
            type: 'text', 
            text: `Successfully added column ${params.column_name} to table ${params.table_name}` 
          }]
        };
      } catch (error) {
        console.error('Error adding column:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error adding column: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
  tools.push(addColumnTool);

  // Tool to list all tables in the database
  const listTablesTool: MCPTool = {
    name: 'list_tables',
    description: 'List all tables in the database',
    schema: z.object({}),
    handler: async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_tables');

        if (error) throw error;

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(data, null, 2)
          }]
        };
      } catch (error) {
        console.error('Error listing tables:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error listing tables: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
  tools.push(listTablesTool);

  // Tool to create all missing tables from the expected schema
  const createAllMissingTablesTool: MCPTool = {
    name: 'create_all_missing_tables',
    description: 'Create all missing tables from the expected schema',
    schema: z.object({}),
    handler: async () => {
      try {
        const results: Record<string, string> = {};
        
        // First get existing tables
        const { data: existingTables, error: listError } = await supabase.rpc('get_all_tables');
        
        if (listError) throw listError;
        
        const existingTableNames = existingTables.map((t: any) => t.tablename);
        
        // Create each missing table
        for (const table of expectedTables) {
          if (!existingTableNames.includes(table.name)) {
            try {
              await supabase.rpc('create_table_if_not_exists', { table_name: table.name });
              results[table.name] = 'Created';
              
              // Add columns based on the expected schema
              for (const column of table.columns) {
                if (column.name !== 'id' && column.name !== 'created_at' && column.name !== 'updated_at') {
                  let pgType = 'TEXT';
                  
                  // Map our type names to PostgreSQL types
                  switch (column.type) {
                    case 'uuid': pgType = 'UUID'; break;
                    case 'text': pgType = 'TEXT'; break;
                    case 'integer': pgType = 'INTEGER'; break;
                    case 'boolean': pgType = 'BOOLEAN'; break;
                    case 'timestamp': pgType = 'TIMESTAMPTZ'; break;
                    case 'numeric': pgType = 'NUMERIC'; break;
                    case 'date': pgType = 'DATE'; break;
                    default: pgType = 'TEXT';
                  }
                  
                  await supabase.rpc('add_column_if_not_exists', {
                    table_name: table.name,
                    column_name: column.name,
                    column_type: pgType
                  });
                }
              }
            } catch (error) {
              results[table.name] = `Error: ${error instanceof Error ? error.message : String(error)}`;
            }
          } else {
            results[table.name] = 'Already exists';
          }
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        console.error('Error creating missing tables:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating missing tables: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
  tools.push(createAllMissingTablesTool);

  // Tool to insert a record into a table with proper UUID formatting
  const insertRecordTool: MCPTool = {
    name: 'insert_record',
    description: 'Insert a record into a table with proper UUID generation',
    schema: z.object({
      table_name: z.string().describe('Name of the table to insert into'),
      record: z.record(z.any()).describe('Record data to insert (id will be generated if not provided)')
    }),
    handler: async (params: { table_name: string, record: Record<string, any> }) => {
      try {
        // Ensure we're not sending an invalid UUID
        const record = { ...params.record };
        if (record.id && typeof record.id === 'string' && !record.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
          delete record.id; // Let Postgres generate the UUID
        }
        
        const { data, error } = await supabase
          .from(params.table_name)
          .insert(record)
          .select();

        if (error) throw error;

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(data, null, 2)
          }]
        };
      } catch (error) {
        console.error('Error inserting record:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error inserting record: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
  tools.push(insertRecordTool);

  return tools;
}

/**
 * Initialize Supabase client with the provided URL and key
 * @param supabaseUrl Supabase URL
 * @param supabaseKey Supabase API key
 * @returns Supabase client
 */
export function initSupabase(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Get schema for a table
 * @param supabase Supabase client
 * @param table Table name
 * @returns Table columns
 */
export async function getTableSchema(supabase: SupabaseClient, table: string): Promise<string[]> {
  try {
    // Use RPC function to get table columns
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: table });
    
    if (error) {
      console.error(`Error fetching schema for ${table}:`, error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error(`Exception fetching schema for ${table}:`, err);
    return [];
  }
}

/**
 * Get detailed schema information for a table
 * @param supabase Supabase client
 * @param table Table name
 * @returns Table structure with columns and constraints
 */
export async function getDetailedTableSchema(supabase: SupabaseClient, table: string): Promise<TableStructure> {
  try {
    // Use custom SQL function to get detailed table info
    const { data, error } = await supabase.rpc('get_detailed_table_info', { table_name: table });
    
    if (error) {
      console.error(`Error fetching detailed schema for ${table}:`, error);
      return { columns: [], constraints: [] };
    }
    
    // Transform the data into our TableStructure format
    const result: TableStructure = {
      columns: (data?.columns || []).map((col: any) => ({
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable === 'YES',
        column_default: col.column_default
      })),
      constraints: (data?.constraints || []).map((con: any) => ({
        constraint_name: con.constraint_name,
        constraint_type: con.constraint_type,
        table_name: con.table_name,
        referenced_table: con.referenced_table,
        column_name: con.column_name,
        referenced_column: con.referenced_column
      })),
      primaryKey: data?.primary_key
    };
    
    return result;
  } catch (err) {
    console.error(`Exception fetching detailed schema for ${table}:`, err);
    return { columns: [], constraints: [] };
  }
}

/**
 * Detect table constraints
 * @param supabase Supabase client
 * @param table Table name
 * @returns List of constraints
 */
export async function detectTableConstraints(supabase: SupabaseClient, table: string): Promise<ConstraintInfo[]> {
  try {
    // Use our custom function to get constraints
    const { data, error } = await supabase.rpc('get_table_constraints', { table_name: table });
    
    if (error) {
      console.error(`Error detecting constraints for ${table}:`, error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error(`Exception detecting constraints for ${table}:`, err);
    return [];
  }
}

/**
 * Validate a record against a table schema
 * @param supabase Supabase client
 * @param table Table name
 * @param record Record to validate
 * @returns Validation result
 */
export async function validateSchema(
  supabase: SupabaseClient, 
  table: string, 
  record: any
): Promise<SchemaValidationResult> {
  try {
    // Fetch table schema
    const columns = await getTableSchema(supabase, table);
    
    if (!columns || columns.length === 0) {
      return {
        isValid: false,
        invalidColumns: [],
        missingColumns: [],
        availableColumns: [],
        record
      };
    }
    
    // Check for invalid columns
    const recordKeys = Object.keys(record);
    const invalidColumns = recordKeys.filter(key => !columns.includes(key));
    
    // Check for missing required columns
    // For simplicity, we're not checking for NOT NULL constraints here
    // A more complex implementation would check required columns
    
    const result: SchemaValidationResult = {
      isValid: invalidColumns.length === 0,
      availableColumns: columns,
      record
    };
    
    if (invalidColumns.length > 0) {
      result.invalidColumns = invalidColumns;
    }
    
    return result;
  } catch (err) {
    console.error(`Exception validating schema for ${table}:`, err);
    return {
      isValid: false,
      invalidColumns: [],
      missingColumns: [],
      availableColumns: [],
      record
    };
  }
}

/**
 * Parse error and extract constraint information with enhanced error suggestions
 * @param error PostgreSQL error
 * @returns Parsed error information
 */
export function parseConstraintError(error: PostgrestError): {
  constraintName?: string;
  errorCode?: string;
  suggestedFix?: string;
} {
  if (!error) return {};
  
  const errorCode = error.code;
  let constraintName: string | undefined;
  let suggestedFix: string | undefined;
  
  // Extract constraint name if present
  const constraintMatch = error.message.match(/constraint\s+"([^"]+)"/i);
  if (constraintMatch && constraintMatch[1]) {
    constraintName = constraintMatch[1];
  }
  
  // Extract column name if present
  const columnMatch = error.message.match(/column\s+"([^"]+)"/i);
  const columnName = columnMatch ? columnMatch[1] : 'unknown column';
  
  // Extract table name if present
  const tableMatch = error.message.match(/in table\s+"([^"]+)"/i) || error.message.match(/on table\s+"([^"]+)"/i);
  const tableName = tableMatch ? tableMatch[1] : 'the table';
  
  // Extract key value if present (for unique violations)
  const keyMatch = error.message.match(/Key\s+\(([^)]+)\)=\(([^)]+)\)/i);
  const keyName = keyMatch ? keyMatch[1] : undefined;
  const keyValue = keyMatch ? keyMatch[2] : undefined;
  
  // Extract foreign key details if present
  const fkMatch = error.message.match(/Key\s+\(([^)]+)\)=\(([^)]+)\)\s+is not present in table\s+"([^"]+)"/i);
  const fkColumn = fkMatch ? fkMatch[1] : undefined;
  const fkValue = fkMatch ? fkMatch[2] : undefined;
  const fkTable = fkMatch ? fkMatch[3] : undefined;
  
  // Generate helpful suggestions based on error code
  switch (errorCode) {
    case '23505': // unique_violation
      if (keyName && keyValue) {
        suggestedFix = `The value '${keyValue}' for column '${keyName}' already exists in ${tableName}. Try using a different unique value or check if the record already exists.`;
      } else {
        suggestedFix = `This record contains a duplicate value that violates a unique constraint. Check for existing records with the same unique values.`;
      }
      break;
    case '23503': // foreign_key_violation
      if (fkColumn && fkValue && fkTable) {
        suggestedFix = `The value '${fkValue}' for column '${fkColumn}' does not exist in the referenced table '${fkTable}'. Ensure that the referenced record exists before creating this one.`;
      } else {
        suggestedFix = `This record references a value in another table that does not exist. Check that the referenced record exists before inserting this one.`;
      }
      break;
    case '23502': // not_null_violation
      suggestedFix = `The column '${columnName}' cannot be null. Please provide a value for this required field.`;
      break;
    case '23514': // check_violation
      suggestedFix = `This record violates a check constraint on column '${columnName}'. Ensure the values meet the required conditions for this column.`;
      break;
    case '22P02': // invalid_text_representation
      suggestedFix = `Invalid input syntax for the data type. Check that the value format matches the expected type (e.g., valid UUID format, proper date format, etc.).`;
      break;
    case '22003': // numeric_value_out_of_range
      suggestedFix = `Numeric value out of range. Check that the number is within the allowed range for this field.`;
      break;
    case '22007': // invalid_datetime_format
      suggestedFix = `Invalid date/time format. Ensure you're using a valid date format (e.g., 'YYYY-MM-DD').`;
      break;
    case '42703': // undefined_column
      suggestedFix = `The column '${columnName}' does not exist in ${tableName}. Check for typos or ensure the column is created before using it.`;
      break;
    case '42P01': // undefined_table
      suggestedFix = `The table '${tableName}' does not exist. Check for typos or ensure the table is created before using it.`;
      break;
    default:
      // Generic suggestion for unknown errors
      suggestedFix = `Error code ${errorCode}: ${error.message}. Check your data and try again.`;
      break;
  }
  
  return {
    constraintName,
    errorCode,
    suggestedFix
  };
}

/**
 * Advanced insert function with debugging
 * @param supabase Supabase client
 * @param table Table name
 * @param record Record to insert
 * @param options Options for the insert operation
 * @returns Insert result with debug info
 */
export async function advancedInsert(
  supabase: SupabaseClient,
  table: string,
  record: any,
  options: {
    debug?: DebugLevel;
    generateId?: boolean;
    idField?: string;
  } = {}
): Promise<AdvancedInsertResult> {
  const debug = options.debug || DebugLevel.NONE;
  const generateId = options.generateId !== false; // Default to true
  const idField = options.idField || 'id';
  
  // Initialize debug info
  const debugInfo: any = {
    table,
    operation: 'insert',
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  // Add debug step
  const addDebugStep = (step: string, data?: any) => {
    if (debug >= DebugLevel.BASIC) {
      debugInfo.steps.push({
        step,
        timestamp: new Date().toISOString(),
        ...(data && debug >= DebugLevel.DETAILED ? { data } : {})
      });
    }
  };
  
  try {
    // Step 1: Initialize
    addDebugStep('initialize', { record, options });
    
    // Step 2: Generate ID if needed
    let finalRecord = { ...record };
    if (generateId && !finalRecord[idField]) {
      const newId = uuidv4();
      finalRecord[idField] = newId;
      addDebugStep('generate_id', { field: idField, value: newId });
    }
    
    // Step 3: Fetch schema
    addDebugStep('fetch_schema');
    const columns = await getTableSchema(supabase, table);
    addDebugStep('schema_fetched', { columns });
    
    if (!columns || columns.length === 0) {
      throw new Error(`Schema not found for table ${table}`);
    }
    
    // Step 4: Validate against schema
    addDebugStep('validate_schema');
    const validationResult = await validateSchema(supabase, table, finalRecord);
    addDebugStep('schema_validated', validationResult);
    
    if (!validationResult.isValid) {
      return {
        success: false,
        error: {
          message: `Schema validation failed`,
          details: validationResult
        },
        errorCode: 'schema_validation_error',
        errorMessage: `Record has invalid columns: ${validationResult.invalidColumns?.join(', ')}`,
        debugInfo: debug > DebugLevel.NONE ? debugInfo : undefined,
        suggestedFix: `Remove invalid columns: ${validationResult.invalidColumns?.join(', ')}. Available columns: ${validationResult.availableColumns?.join(', ')}`
      };
    }
    
    // Step 5: Filter record to only include valid columns
    const filteredRecord = Object.keys(finalRecord)
      .filter(key => columns.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = finalRecord[key];
        return obj;
      }, {});
      
    addDebugStep('filter_record', { filteredRecord });
    
    // Step 6: Attempt insert
    addDebugStep('attempt_insert');
    const { data, error } = await supabase
      .from(table)
      .insert(filteredRecord)
      .select();
    
    // Step 7: Process result
    if (error) {
      addDebugStep('insert_failed', { error });
      
      // Parse constraint error
      const { constraintName, errorCode, suggestedFix } = parseConstraintError(error);
      
      return {
        success: false,
        error,
        errorCode,
        errorMessage: error.message,
        constraintName,
        debugInfo: debug > DebugLevel.NONE ? debugInfo : undefined,
        suggestedFix
      };
    }
    
    addDebugStep('insert_succeeded', { data });
    
    return {
      success: true,
      record: data?.[0] || filteredRecord,
      debugInfo: debug > DebugLevel.NONE ? debugInfo : undefined
    };
  } catch (err: any) {
    addDebugStep('exception', { error: err });
    
    return {
      success: false,
      error: err,
      errorCode: 'exception',
      errorMessage: err.message,
      debugInfo: debug > DebugLevel.NONE ? debugInfo : undefined
    };
  }
}

/**
 * Safe insert helper
 * @param supabase Supabase client
 * @param table Table name
 * @param record Record to insert
 * @returns Insert result
 */
export async function safeInsert(
  supabase: SupabaseClient,
  table: string,
  record: any
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Generate ID if missing
    let finalRecord = { ...record };
    if (!finalRecord.id) {
      finalRecord.id = uuidv4();
    }
    
    // Attempt insert
    const { data, error } = await supabase
      .from(table)
      .insert(finalRecord)
      .select();
    
    if (error) {
      return { success: false, error };
    }
    
    return { success: true, data: data?.[0] || finalRecord };
  } catch (err) {
    return { success: false, error: err };
  }
} 