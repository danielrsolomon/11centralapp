import { z } from 'zod';
import { MCPServer } from 'mcp-framework';
import { supabase, queryTable, isError, formatErrorMessage } from '../services/supabase';

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
  server.tool(
    'queryTable',
    'Query data from a Supabase table with filters and sorting',
    queryTableSchema,
    async (params) => {
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
  );
  
  // List Tables Tool
  server.tool(
    'listTables',
    'List all tables in the Supabase database',
    z.object({}),
    async () => {
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
  );
  
  // List Departments Tool
  server.tool(
    'listDepartments',
    'List all departments',
    z.object({}),
    async () => {
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
  );
  
  // List Roles Tool
  server.tool(
    'listRoles',
    'List all roles in the system',
    z.object({}),
    async () => {
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
  );
  
  // Insert Record Tool
  server.tool(
    'insertRecord',
    'Insert a new record into a table',
    insertRecordSchema,
    async (params) => {
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
  );
  
  // Update Record Tool
  server.tool(
    'updateRecord',
    'Update existing records in a table',
    updateRecordSchema,
    async (params) => {
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
  );
  
  // Delete Record Tool
  server.tool(
    'deleteRecord',
    'Delete records from a table',
    deleteRecordSchema,
    async (params) => {
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
  );
} 