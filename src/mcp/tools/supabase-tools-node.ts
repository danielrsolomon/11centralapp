import { supabase } from '../supabase-node';
import { MCPTool, MCPToolResult } from '../types';

// Helper function to handle errors
const handleError = (error: any): MCPToolResult => ({
  content: [{ type: 'text', text: `Error: ${error.message || 'Unknown error'}` }],
  isError: true
});

// Convert any data to a string representation
const formatData = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    return `[Unserializable data: ${error.message}]`;
  }
};

// Read operations
export const queryTable: MCPTool = {
  name: 'queryTable',
  description: 'Query data from a Supabase table with filters and sorting',
  inputSchema: {
    type: 'object',
    properties: {
      table: { type: 'string' },
      select: { type: 'string' },
      filters: { type: 'object' },
      limit: { type: 'number' },
      orderBy: { 
        type: 'object',
        properties: {
          column: { type: 'string' },
          ascending: { type: 'boolean' }
        }
      },
      page: { type: 'number' },
      pageSize: { type: 'number' }
    },
    required: ['table']
  },
  handler: async (args) => {
    try {
      const { table, select = '*', filters = {}, limit, orderBy, page, pageSize } = args;
      
      let query = supabase.from(table).select(select);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const operator = Object.keys(value)[0];
          const operand = (value as Record<string, any>)[operator];
          
          switch (operator) {
            case 'eq': query = query.eq(key, operand); break;
            case 'neq': query = query.neq(key, operand); break;
            case 'gt': query = query.gt(key, operand); break;
            case 'gte': query = query.gte(key, operand); break;
            case 'lt': query = query.lt(key, operand); break;
            case 'lte': query = query.lte(key, operand); break;
            case 'like': query = query.like(key, operand); break;
            case 'ilike': query = query.ilike(key, operand); break;
            case 'in': query = query.in(key, operand); break;
            case 'is': query = query.is(key, operand); break;
          }
        } else {
          query = query.eq(key, value);
        }
      });
      
      // Apply ordering
      if (orderBy && orderBy.column) {
        query = query.order(orderBy.column, { 
          ascending: orderBy.ascending === undefined ? true : orderBy.ascending 
        });
      }
      
      // Apply pagination
      if (page !== undefined && pageSize !== undefined) {
        const from = (page - 1) * pageSize;
        const to = page * pageSize - 1;
        query = query.range(from, to);
      } else if (limit !== undefined) {
        query = query.limit(limit);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: formatData({ 
            data,
            count,
            page: page !== undefined ? page : undefined,
            pageSize: pageSize !== undefined ? pageSize : undefined,
            totalPages: count && pageSize ? Math.ceil(count / pageSize) : undefined
          }) 
        }]
      };
    } catch (error) {
      return handleError(error);
    }
  }
};

export const getTableSchema: MCPTool = {
  name: 'getTableSchema',
  description: 'Get the schema of a specific table',
  inputSchema: {
    type: 'object',
    properties: {
      table: { type: 'string' }
    },
    required: ['table']
  },
  handler: async (args) => {
    try {
      const { table } = args;
      
      // This is a simplified version - in a real app, you'd implement a more robust
      // way to fetch schema information, possibly by querying PostgreSQL system tables
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', table);
      
      if (error) throw error;
      
      return {
        content: [{ type: 'text', text: formatData(data) }]
      };
    } catch (error) {
      return handleError(error);
    }
  }
};

export const listTables: MCPTool = {
  name: 'listTables',
  description: 'List all tables in the database',
  handler: async () => {
    try {
      // This is a simplified version
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (error) throw error;
      
      return {
        content: [{ type: 'text', text: formatData(data) }]
      };
    } catch (error) {
      return handleError(error);
    }
  }
};

// Write operations
export const insertRecord: MCPTool = {
  name: 'insertRecord',
  description: 'Insert a new record into a table',
  inputSchema: {
    type: 'object',
    properties: {
      table: { type: 'string' },
      data: { type: 'object' }
    },
    required: ['table', 'data']
  },
  handler: async (args) => {
    try {
      const { table, data } = args;
      
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully inserted record into ${table}:\n${formatData(result)}` 
        }]
      };
    } catch (error) {
      return handleError(error);
    }
  }
};

export const updateRecord: MCPTool = {
  name: 'updateRecord',
  description: 'Update existing records in a table',
  inputSchema: {
    type: 'object',
    properties: {
      table: { type: 'string' },
      data: { type: 'object' },
      filters: { type: 'object' }
    },
    required: ['table', 'data', 'filters']
  },
  handler: async (args) => {
    try {
      const { table, data, filters } = args;
      
      let query = supabase.from(table).update(data);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const operator = Object.keys(value)[0];
          const operand = (value as Record<string, any>)[operator];
          
          switch (operator) {
            case 'eq': query = query.eq(key, operand); break;
            case 'neq': query = query.neq(key, operand); break;
            case 'in': query = query.in(key, operand); break;
            // Add other operators as needed
          }
        } else {
          query = query.eq(key, value);
        }
      });
      
      const { data: result, error, count } = await query.select();
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully updated ${count} records in ${table}:\n${formatData(result)}` 
        }]
      };
    } catch (error) {
      return handleError(error);
    }
  }
};

export const deleteRecord: MCPTool = {
  name: 'deleteRecord',
  description: 'Delete records from a table',
  inputSchema: {
    type: 'object',
    properties: {
      table: { type: 'string' },
      filters: { type: 'object' }
    },
    required: ['table', 'filters']
  },
  handler: async (args) => {
    try {
      const { table, filters } = args;
      
      let query = supabase.from(table).delete();
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const operator = Object.keys(value)[0];
          const operand = (value as Record<string, any>)[operator];
          
          switch (operator) {
            case 'eq': query = query.eq(key, operand); break;
            case 'neq': query = query.neq(key, operand); break;
            case 'in': query = query.in(key, operand); break;
            // Add other operators as needed
          }
        } else {
          query = query.eq(key, value);
        }
      });
      
      const { data: result, error, count } = await query.select();
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully deleted ${count} records from ${table}` 
        }]
      };
    } catch (error) {
      return handleError(error);
    }
  }
};

// Export all tools
export const supabaseTools = [
  queryTable,
  getTableSchema,
  listTables,
  insertRecord,
  updateRecord,
  deleteRecord
]; 