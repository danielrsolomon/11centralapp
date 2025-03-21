import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { MCPTool } from './server';
import { validate as uuidValidate } from 'uuid';
import { v4 as uuidv4 } from 'uuid';

/**
 * Advanced insert data tool with detailed debugging and error reporting
 * This tool provides comprehensive validation and error messages for database inserts
 */
export function createAdvancedInsertTool(supabase: SupabaseClient): MCPTool {
  return {
    name: 'advanced_insert',
    description: 'Insert data with comprehensive schema validation and detailed error reporting',
    schema: z.object({
      table_name: z.string().describe('Name of the table to insert data into'),
      record: z.record(z.any()).describe('Record to insert (JSON object)'),
      generate_id: z.boolean().optional().default(true).describe('Whether to generate a UUID if not provided'),
      debug_level: z.enum(['basic', 'detailed', 'verbose']).optional().default('detailed').describe('Level of debug information')
    }),
    handler: async (params: { 
      table_name: string; 
      record: Record<string, any>; 
      generate_id?: boolean;
      debug_level?: 'basic' | 'detailed' | 'verbose' 
    }) => {
      try {
        const { 
          table_name, 
          record, 
          generate_id = true,
          debug_level = 'detailed' 
        } = params;
        
        // Debug context to track the insertion process
        const debugContext: any = {
          table: table_name,
          record: record,
          timestamp: new Date().toISOString(),
          steps: [],
          errors: [],
          warnings: [],
          success: false
        };
        
        // Helper to log steps in the process
        const logStep = (stepName: string, message: string, data?: any) => {
          debugContext.steps.push({
            step: stepName,
            message,
            ...(data ? { data } : {})
          });
          
          if (debug_level === 'verbose') {
            console.log(`[${stepName}] ${message}`, data || '');
          }
        };
        
        // Helper to log errors
        const logError = (errorType: string, message: string, details?: any) => {
          const error = {
            type: errorType,
            message,
            ...(details ? { details } : {})
          };
          
          debugContext.errors.push(error);
          console.error(`[ERROR:${errorType}] ${message}`, details || '');
          return error;
        };
        
        // Helper to log warnings
        const logWarning = (warningType: string, message: string, details?: any) => {
          const warning = {
            type: warningType,
            message,
            ...(details ? { details } : {})
          };
          
          debugContext.warnings.push(warning);
          if (debug_level !== 'basic') {
            console.warn(`[WARNING:${warningType}] ${message}`, details || '');
          }
          return warning;
        };
        
        logStep('initialize', `Starting insert operation into '${table_name}'`);
        
        // Step 1: Validate ID field and generate one if needed
        let recordToInsert = { ...record };
        
        if (!recordToInsert.id && generate_id) {
          const newId = uuidv4();
          recordToInsert.id = newId;
          logStep('id_generation', `Generated UUID: ${newId}`);
        } else if (recordToInsert.id) {
          if (typeof recordToInsert.id === 'string' && !uuidValidate(recordToInsert.id)) {
            logWarning('invalid_uuid', `The 'id' field is not a valid UUID: ${recordToInsert.id}`, { 
              provided: recordToInsert.id, 
              expected: 'UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)' 
            });
          } else {
            logStep('id_validation', `Using provided ID: ${recordToInsert.id}`);
          }
        }
        
        // Step 2: Get table schema from database
        logStep('schema_fetch', `Fetching schema for table '${table_name}'`);
        let tableColumns: string[] = [];
        
        try {
          // Try to get columns using the debug function we created
          const { data: columnData, error: columnError } = await supabase.rpc('get_table_columns', { 
            p_table_name: table_name 
          });
          
          if (columnError) {
            logWarning('schema_fetch_error', `Error fetching columns with RPC: ${columnError.message}`);
            
            // Fallback: try to get columns from information_schema directly
            const { data: infoSchemaData, error: infoSchemaError } = await supabase
              .from('information_schema.columns')
              .select('column_name')
              .eq('table_schema', 'public')
              .eq('table_name', table_name);
              
            if (infoSchemaError || !infoSchemaData) {
              throw new Error(`Failed to fetch schema: ${infoSchemaError?.message || 'Unknown error'}`);
            }
            
            tableColumns = infoSchemaData.map(col => col.column_name);
          } else if (columnData) {
            tableColumns = columnData.map((col: any) => col.column_name);
          }
          
          logStep('schema_fetch_success', `Found ${tableColumns.length} columns`, tableColumns);
        } catch (error) {
          logError('schema_fetch_failed', `Failed to fetch schema for table '${table_name}': ${error instanceof Error ? error.message : String(error)}`);
          
          // Try to proceed with the insert despite not having schema validation
          logWarning('schema_validation_skipped', 'Proceeding without schema validation');
        }
        
        // Step 3: Validate record against schema
        if (tableColumns.length > 0) {
          logStep('schema_validation', 'Validating record against schema');
          
          const recordColumns = Object.keys(recordToInsert);
          const invalidColumns = recordColumns.filter(col => !tableColumns.includes(col));
          
          if (invalidColumns.length > 0) {
            logWarning('schema_mismatch', `Found ${invalidColumns.length} columns not present in schema`, {
              invalidColumns,
              availableColumns: tableColumns
            });
            
            // Filter out invalid columns to prevent errors
            const validRecord: Record<string, any> = {};
            recordColumns
              .filter(col => tableColumns.includes(col))
              .forEach(col => {
                validRecord[col] = recordToInsert[col];
              });
              
            recordToInsert = validRecord;
            logStep('record_sanitized', 'Sanitized record to include only valid columns', recordToInsert);
          } else {
            logStep('schema_validation_passed', 'Record matches schema');
          }
        }
        
        // Step 4: Perform the insert
        logStep('insert_attempt', `Attempting to insert record into '${table_name}'`);
        
        const { data: insertData, error: insertError } = await supabase
          .from(table_name)
          .insert(recordToInsert)
          .select();
          
        if (insertError) {
          // Analyze the error to provide more helpful information
          logError('insert_failed', `Insert operation failed: ${insertError.message}`, insertError);
          
          let suggestion = '';
          const errorCode = insertError.code;
          const errorMsg = insertError.message;
          
          // Add error classification and suggestions
          if (errorCode === '23505') {
            suggestion = 'Unique constraint violation - a record with the same unique key already exists.';
            
            // Try to identify which constraint was violated
            const constraintMatch = errorMsg.match(/unique constraint "(.+?)"/i);
            if (constraintMatch && constraintMatch[1]) {
              suggestion += ` Constraint violated: "${constraintMatch[1]}".`;
            }
          } else if (errorCode === '23503') {
            suggestion = 'Foreign key constraint violation - referenced record does not exist.';
            
            // Try to identify which foreign key was violated
            const fkMatch = errorMsg.match(/foreign key constraint "(.+?)"/i);
            if (fkMatch && fkMatch[1]) {
              suggestion += ` Constraint violated: "${fkMatch[1]}".`;
            }
          } else if (errorCode === '23502') {
            suggestion = 'NOT NULL constraint violation - a required field is missing.';
            
            // Try to identify which column is null
            const nullMatch = errorMsg.match(/column "(.+?)"/i);
            if (nullMatch && nullMatch[1]) {
              suggestion += ` Column "${nullMatch[1]}" cannot be null.`;
            }
          } else if (errorCode === '42P01') {
            suggestion = `The table "${table_name}" does not exist. Check the table name for typos.`;
          } else if (errorCode === '42703') {
            const colMatch = errorMsg.match(/column "(.+?)"/i);
            if (colMatch && colMatch[1]) {
              suggestion = `Column "${colMatch[1]}" does not exist in table "${table_name}".`;
            } else {
              suggestion = 'Column does not exist. Check column names for typos.';
            }
          } else if (errorMsg.includes('RLS')) {
            suggestion = 'Row-level security (RLS) policy is preventing the operation. Check permissions or use the service role key.';
          } else {
            suggestion = 'Unknown error occurred. Check Supabase logs for more details.';
          }
          
          debugContext.suggestion = suggestion;
          logStep('error_analysis', `Error analysis complete`, { suggestion });
          
          // Try to get more information using the safe_insert function if available
          try {
            logStep('safe_insert_attempt', 'Attempting safe_insert as fallback');
            const { data: safeData, error: safeError } = await supabase.rpc('safe_insert', {
              p_table_name: table_name,
              p_data: recordToInsert,
              p_bypass_validation: false
            });
            
            if (safeError) {
              logWarning('safe_insert_failed', `Safe insert also failed: ${safeError.message}`);
            } else if (safeData) {
              logStep('safe_insert_result', 'Got safe_insert diagnostic information', safeData);
              debugContext.safeInsertResult = safeData;
            }
          } catch (error) {
            logWarning('safe_insert_error', `Error calling safe_insert: ${error instanceof Error ? error.message : String(error)}`);
          }
          
          // Prepare the final error response
          debugContext.success = false;
          
          let responseText = `Error inserting into ${table_name}: ${insertError.message}`;
          
          if (suggestion) {
            responseText += `\n\nSuggestion: ${suggestion}`;
          }
          
          if (debug_level === 'basic') {
            responseText += `\n\nFor more details, set debug_level to "detailed" or "verbose".`;
          } else {
            responseText += `\n\nDebug Information:\n${JSON.stringify(debugContext, null, 2)}`;
          }
          
          return {
            content: [{ type: 'text', text: responseText }],
            isError: true
          };
        }
        
        // Success case
        logStep('insert_success', 'Record inserted successfully', insertData);
        debugContext.success = true;
        debugContext.result = insertData;
        
        // Prepare success response based on debug level
        if (debug_level === 'basic') {
          return {
            content: [{ 
              type: 'text', 
              text: `Successfully inserted record into '${table_name}'.` 
            }]
          };
        } else {
          return {
            content: [{ 
              type: 'text', 
              text: debug_level === 'verbose' 
                ? `Successfully inserted record into '${table_name}'.\n\nInserted record:\n${JSON.stringify(insertData, null, 2)}\n\nDebug Information:\n${JSON.stringify(debugContext, null, 2)}`
                : `Successfully inserted record into '${table_name}'.\n\nInserted record:\n${JSON.stringify(insertData, null, 2)}`
            }]
          };
        }
      } catch (error) {
        console.error('Unexpected error in advanced_insert:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Unexpected error in advanced_insert: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Tool to validate a record against a table schema without inserting
 */
export function createSchemaValidationTool(supabase: SupabaseClient): MCPTool {
  return {
    name: 'validate_schema',
    description: 'Validate a record against a table schema without inserting data',
    schema: z.object({
      table_name: z.string().describe('Name of the table to validate against'),
      record: z.record(z.any()).describe('Record to validate (JSON object)')
    }),
    handler: async (params: { table_name: string; record: Record<string, any> }) => {
      try {
        const { table_name, record } = params;
        
        // Get table schema
        const { data: columns, error: columnError } = await supabase.rpc('get_table_columns', { 
          p_table_name: table_name 
        });
        
        if (columnError) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error getting table schema: ${columnError.message}` 
            }],
            isError: true
          };
        }
        
        if (!columns || columns.length === 0) {
          return {
            content: [{ 
              type: 'text', 
              text: `Table '${table_name}' not found or has no columns.` 
            }],
            isError: true
          };
        }
        
        // Create a report
        const columnNames = columns.map((col: any) => col.column_name);
        const recordColumns = Object.keys(record);
        
        const invalidColumns = recordColumns.filter(col => !columnNames.includes(col));
        const missingColumns = columnNames
          .filter((col: string) => 
            // Only include required columns (non-nullable without defaults)
            columns.find((c: any) => 
              c.column_name === col && 
              !c.is_nullable && 
              c.column_default === null
            )
          )
          .filter((col: string) => !(col in record) && col !== 'id' && !col.endsWith('_at'));
        
        const validationResult = {
          table: table_name,
          valid: invalidColumns.length === 0 && missingColumns.length === 0,
          schema: {
            tableColumns: columnNames,
            providedColumns: recordColumns,
            invalidColumns,
            missingRequiredColumns: missingColumns
          },
          record: record
        };
        
        // Generate a user-friendly report
        let resultText = `Schema Validation for '${table_name}':\n\n`;
        
        if (validationResult.valid) {
          resultText += '✅ Record is valid and matches the table schema.\n\n';
        } else {
          resultText += '❌ Record has validation issues:\n\n';
          
          if (invalidColumns.length > 0) {
            resultText += `- Invalid columns: ${invalidColumns.join(', ')}\n`;
            resultText += `  These columns do not exist in the '${table_name}' table.\n\n`;
          }
          
          if (missingColumns.length > 0) {
            resultText += `- Missing required columns: ${missingColumns.join(', ')}\n`;
            resultText += `  These columns are required (NOT NULL without defaults).\n\n`;
          }
        }
        
        resultText += `Available columns in '${table_name}':\n${columnNames.join(', ')}\n\n`;
        resultText += `Full validation result:\n${JSON.stringify(validationResult, null, 2)}`;
        
        return {
          content: [{ type: 'text', text: resultText }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error validating schema: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Creates a constraint detection tool
 */
export function createConstraintDetectionTool(supabase: SupabaseClient): MCPTool {
  return {
    name: 'detect_constraints',
    description: 'Get all constraints for a table to help debug insertion errors',
    schema: z.object({
      table_name: z.string().describe('Name of the table to check constraints')
    }),
    handler: async (params: { table_name: string }) => {
      try {
        const { table_name } = params;
        
        // Get constraints from information_schema
        const { data: constraints, error: constraintError } = await supabase
          .from('information_schema.table_constraints')
          .select(`
            constraint_name,
            constraint_type,
            table_name
          `)
          .eq('table_schema', 'public')
          .eq('table_name', table_name);
          
        if (constraintError) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error fetching constraints: ${constraintError.message}` 
            }],
            isError: true
          };
        }
        
        // Get column constraints (which columns are involved in constraints)
        const { data: columnConstraints, error: columnError } = await supabase
          .from('information_schema.constraint_column_usage')
          .select(`
            constraint_name,
            column_name,
            table_name
          `)
          .eq('table_schema', 'public')
          .eq('table_name', table_name);
          
        if (columnError) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error fetching column constraints: ${columnError.message}` 
            }],
            isError: true
          };
        }
        
        // Get foreign key information
        const { data: foreignKeys, error: fkError } = await supabase
          .from('information_schema.key_column_usage')
          .select(`
            constraint_name,
            column_name,
            table_name,
            referenced_table_name,
            referenced_column_name
          `)
          .eq('table_schema', 'public')
          .eq('table_name', table_name);
          
        // Combine the data into a comprehensive report
        const constraintReport = {
          table: table_name,
          constraints: constraints || [],
          columnConstraints: columnConstraints || [],
          foreignKeys: foreignKeys || []
        };
        
        // Generate a user-friendly summary
        let resultText = `Constraints for table '${table_name}':\n\n`;
        
        if (constraints && constraints.length > 0) {
          resultText += 'Table Constraints:\n';
          
          constraints.forEach((constraint: any) => {
            resultText += `- ${constraint.constraint_name} (${constraint.constraint_type})\n`;
            
            // Find columns for this constraint
            const columns = columnConstraints
              ?.filter((cc: any) => cc.constraint_name === constraint.constraint_name)
              ?.map((cc: any) => cc.column_name) || [];
              
            if (columns.length > 0) {
              resultText += `  Columns: ${columns.join(', ')}\n`;
            }
            
            // Add foreign key details if applicable
            if (constraint.constraint_type === 'FOREIGN KEY') {
              const fk = foreignKeys?.find((fk: any) => fk.constraint_name === constraint.constraint_name);
              if (fk) {
                resultText += `  References: ${fk.referenced_table_name}(${fk.referenced_column_name})\n`;
              }
            }
            
            resultText += '\n';
          });
        } else {
          resultText += 'No constraints found for this table.\n\n';
        }
        
        resultText += 'Insertion Requirements:\n';
        
        // Primary key requirements
        const pkConstraint = constraints?.find((c: any) => c.constraint_type === 'PRIMARY KEY');
        if (pkConstraint) {
          const pkColumns = columnConstraints
            ?.filter((cc: any) => cc.constraint_name === pkConstraint.constraint_name)
            ?.map((cc: any) => cc.column_name) || [];
            
          if (pkColumns.length > 0) {
            resultText += `- Primary Key: Must provide a unique value for ${pkColumns.join(', ')}\n`;
          }
        }
        
        // Foreign key requirements
        const fkConstraints = constraints?.filter((c: any) => c.constraint_type === 'FOREIGN KEY') || [];
        if (fkConstraints.length > 0) {
          resultText += '- Foreign Keys:\n';
          
          fkConstraints.forEach((fk: any) => {
            const fkDetail = foreignKeys?.find((f: any) => f.constraint_name === fk.constraint_name);
            if (fkDetail) {
              resultText += `  • ${fkDetail.column_name} must reference an existing ${fkDetail.referenced_table_name}.${fkDetail.referenced_column_name}\n`;
            }
          });
        }
        
        // Unique constraints
        const uniqueConstraints = constraints?.filter((c: any) => c.constraint_type === 'UNIQUE') || [];
        if (uniqueConstraints.length > 0) {
          resultText += '- Unique Constraints:\n';
          
          uniqueConstraints.forEach((uc: any) => {
            const uniqueColumns = columnConstraints
              ?.filter((cc: any) => cc.constraint_name === uc.constraint_name)
              ?.map((cc: any) => cc.column_name) || [];
              
            if (uniqueColumns.length > 0) {
              resultText += `  • Must provide a unique combination of values for ${uniqueColumns.join(', ')}\n`;
            }
          });
        }
        
        // Add full constraints data
        resultText += '\nFull constraint data:\n';
        resultText += JSON.stringify(constraintReport, null, 2);
        
        return {
          content: [{ type: 'text', text: resultText }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error detecting constraints: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Register all enhanced data tools
 */
export function registerEnhancedDataTools(supabase: SupabaseClient, server: any) {
  console.log('Registering enhanced data tools');
  
  const advancedInsertTool = createAdvancedInsertTool(supabase);
  const schemaValidationTool = createSchemaValidationTool(supabase);
  const constraintDetectionTool = createConstraintDetectionTool(supabase);
  
  server.registerTool(advancedInsertTool);
  server.registerTool(schemaValidationTool);
  server.registerTool(constraintDetectionTool);
  
  console.log('Enhanced data tools registered');
  
  return [advancedInsertTool, schemaValidationTool, constraintDetectionTool];
} 