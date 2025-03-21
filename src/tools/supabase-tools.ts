import { z } from 'zod';
import { MCPServer, MCPTool } from 'mcp-framework';
import { supabase, queryTable, isError, formatErrorMessage } from '../services/supabase.js';

// Schema definitions for tool parameters
const queryTableSchema = z.object({
  table: z.string(),
  select: z.string().optional().default('*'),
  limit: z.number().optional(),
  filters: z.record(z.any()).optional(),
  orderBy: z.object({
    column: z.string(),
    ascending: z.boolean().optional().default(true)
  }).optional()
});

const insertRecordSchema = z.object({
  table: z.string(),
  data: z.record(z.any())
});

const updateRecordSchema = z.object({
  table: z.string(),
  data: z.record(z.any()),
  filters: z.record(z.any())
});

const deleteRecordSchema = z.object({
  table: z.string(),
  filters: z.record(z.any())
});

// Register Supabase tools on the MCP server
export function registerSupabaseTools(server: MCPServer) {
  // Query Table Tool
  server.registerTool({
    name: 'queryTable',
    description: 'Query data from a Supabase table with filters and sorting',
    schema: queryTableSchema,
    handler: async (params) => {
      try {
        const { table, select, limit, filters, orderBy } = params;
        
        const { data, error } = await queryTable(table, {
          select,
          filters,
          limit,
          orderBy
        });
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error querying table ${table}: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              data,
              count: data?.length || 0 
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
  
  // List Tables Tool
  server.registerTool({
    name: 'listTables',
    description: 'List all tables in the Supabase database',
    schema: z.object({}),
    handler: async () => {
      try {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error listing tables: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ tables: data?.map(row => row.table_name) || [] }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
  
  // List Departments Tool
  server.registerTool({
    name: 'listDepartments',
    description: 'List all departments',
    schema: z.object({}),
    handler: async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*');
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error listing departments: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              data,
              count: data?.length || 0 
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
  
  // List Roles Tool
  server.registerTool({
    name: 'listRoles',
    description: 'List all roles in the system',
    schema: z.object({}),
    handler: async () => {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('*');
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error listing roles: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              data,
              count: data?.length || 0 
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
  
  // Insert Record Tool
  server.registerTool({
    name: 'insertRecord',
    description: 'Insert a new record into a table',
    schema: insertRecordSchema,
    handler: async (params) => {
      try {
        const { table, data } = params;
        
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select();
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error inserting record: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              message: `Successfully inserted record into ${table}`,
              data: result 
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
  
  // Update Record Tool
  server.registerTool({
    name: 'updateRecord',
    description: 'Update existing records in a table',
    schema: updateRecordSchema,
    handler: async (params) => {
      try {
        const { table, data, filters } = params;
        
        let query = supabase.from(table).update(data);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const operator = Object.keys(value)[0];
            const operand = value[operator];
            
            switch (operator) {
              case 'eq': query = query.eq(key, operand); break;
              case 'neq': query = query.neq(key, operand); break;
              case 'in': query = query.in(key, operand); break;
              default: query = query.eq(key, operand);
            }
          } else {
            query = query.eq(key, value);
          }
        });
        
        const { data: result, error } = await query.select();
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error updating record: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              message: `Successfully updated records in ${table}`,
              data: result,
              count: result?.length || 0
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
  
  // Delete Record Tool
  server.registerTool({
    name: 'deleteRecord',
    description: 'Delete records from a table',
    schema: deleteRecordSchema,
    handler: async (params) => {
      try {
        const { table, filters } = params;
        
        let query = supabase.from(table).delete();
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const operator = Object.keys(value)[0];
            const operand = value[operator];
            
            switch (operator) {
              case 'eq': query = query.eq(key, operand); break;
              case 'neq': query = query.neq(key, operand); break;
              case 'in': query = query.in(key, operand); break;
              default: query = query.eq(key, operand);
            }
          } else {
            query = query.eq(key, value);
          }
        });
        
        const { data: result, error } = await query.select();
        
        if (isError(error)) {
          return {
            content: [{ type: 'text', text: `Error deleting record: ${formatErrorMessage(error)}` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              message: `Successfully deleted records from ${table}`,
              count: result?.length || 0
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Unexpected error: ${formatErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  });
} 