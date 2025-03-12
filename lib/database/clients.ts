/**
 * E11EVEN Central Platform - Database Client Factory
 * 
 * This module provides database client instances optimized for different
 * services with integrated monitoring and performance tracking.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '../feature-flags';
import { createTimer, logError, ServiceName } from '../monitoring';

// Request context type for passing metadata to database operations
export interface RequestContext {
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  departmentIds?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isTest?: boolean;
  requestId?: string;
  clientIp?: string;
  permissions?: {
    createContent?: boolean;
    editContent?: boolean;
    deleteContent?: boolean;
    viewContent?: boolean;
    manageUsers?: boolean;
    [key: string]: boolean | undefined;
  };
}

/**
 * Enhanced Supabase client with monitoring and additional features
 */
export interface EnhancedClient extends SupabaseClient {
  // Context information
  context: RequestContext;
  
  // Execute raw SQL query with parameters
  executeRawQuery: <T = any>(
    query: string, 
    params: any[], 
    options?: { monitoringOperation?: string }
  ) => Promise<{ data: T[] | null; error: any }>;
  
  // Execute database function
  executeFunction: <T = any>(
    functionName: string, 
    params: Record<string, any>,
    options?: { monitoringOperation?: string }
  ) => Promise<{ data: T | null; error: any }>;
}

/**
 * Create a base database client with monitoring
 * 
 * @param context Request context for tracking and authorization
 * @param serviceName Service name for monitoring
 * @returns Enhanced Supabase client
 */
export function createDatabaseClient(
  context: RequestContext = {}, 
  serviceName: ServiceName = 'lms'
): EnhancedClient {
  // Create the Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as EnhancedClient;
  
  // Add context to client
  supabase.context = context;
  
  // Add executeRawQuery method for direct SQL execution
  supabase.executeRawQuery = async <T = any>(
    query: string, 
    params: any[],
    options: { monitoringOperation?: string } = {}
  ): Promise<{ data: T[] | null; error: any }> => {
    const operation = options.monitoringOperation || 'executeRawQuery';
    const timer = createTimer(serviceName, operation, 'query', { query, paramCount: params.length });
    
    try {
      // For simple queries with no parameters, we can just execute the query directly
      if (params.length === 0) {
        const { data, error } = await supabase.rpc('execute_raw_query', {
          query_text: query,
          query_params: '[]'
        });
        
        if (error) {
          throw error;
        }
        
        timer.stop();
        return { data: data as T[], error: null };
      }
      
      // For queries with parameters, we need to modify the query to embed the parameter values
      // This is a workaround until proper parameter binding is implemented
      let modifiedQuery = query;
      
      // Replace each parameter placeholder with its value
      for (let i = 0; i < params.length; i++) {
        const placeholder = `$${i + 1}`;
        const value = params[i];
        
        // Format the value according to its type
        let formattedValue: string;
        if (value === null) {
          formattedValue = 'NULL';
        } else if (typeof value === 'string') {
          // Escape single quotes for SQL
          const escapedValue = value.replace(/'/g, "''");
          formattedValue = `'${escapedValue}'`;
        } else if (typeof value === 'number') {
          formattedValue = value.toString();
        } else if (typeof value === 'boolean') {
          formattedValue = value ? 'TRUE' : 'FALSE';
        } else if (value instanceof Date) {
          formattedValue = `'${value.toISOString()}'`;
        } else if (Array.isArray(value)) {
          // Handle array values
          const escapedValues = value.map(v => {
            if (typeof v === 'string') {
              return `'${v.replace(/'/g, "''")}'`;
            }
            return v;
          });
          formattedValue = `ARRAY[${escapedValues.join(', ')}]`;
        } else {
          // For complex objects, stringify and treat as a JSON value
          formattedValue = `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
        }
        
        // Replace the placeholder with the formatted value
        modifiedQuery = modifiedQuery.replace(placeholder, formattedValue);
      }
      
      console.log('Modified query with embedded parameters:', modifiedQuery);
      
      // Execute the modified query
      const { data, error } = await supabase.rpc('execute_raw_query', {
        query_text: modifiedQuery,
        query_params: '[]'
      });
      
      if (error) {
        throw error;
      }
      
      // Handle different response types
      if (data && typeof data === 'object') {
        // Check if it's an error response from our function
        if (data.status === 'error') {
          timer.stop();
          return { 
            data: null, 
            error: new Error(data.error || 'Database error in execute_raw_query') 
          };
        }
        
        // If it's a non-SELECT query that returns affected rows
        if (data.status === 'success' && data.affected_rows !== undefined) {
          timer.stop();
          return { 
            data: [{ affected_rows: data.affected_rows }] as unknown as T[], 
            error: null 
          };
        }
        
        // Otherwise it's a SELECT query result
        timer.stop();
        return { data: data as T[], error: null };
      }
      
      // Handle null or unexpected response
      timer.stop();
      return { data: [], error: null };
    } catch (error) {
      timer.stop();
      logError(serviceName, operation, error, { query });
      return { data: null, error };
    }
  };
  
  // Add executeFunction method
  supabase.executeFunction = async <T = any>(
    functionName: string, 
    params: Record<string, any>,
    options: { monitoringOperation?: string } = {}
  ): Promise<{ data: T | null; error: any }> => {
    const operation = options.monitoringOperation || `function.${functionName}`;
    const timer = createTimer(serviceName, operation, 'query', { functionName, params });
    
    try {
      const { data, error } = await supabase.rpc(functionName, params);
      
      timer.stop();
      return { data: data as T, error };
    } catch (error) {
      timer.stop();
      logError(serviceName, operation, error, { functionName, params });
      return { data: null, error };
    }
  };
  
  // Enhance 'from' method to add monitoring
  if (isFeatureEnabled('use-new-database-clients')) {
    const originalFrom = supabase.from.bind(supabase);
    
    supabase.from = function(table) {
      const result = originalFrom(table);
      
      // Wrap the select method to add monitoring
      const originalSelect = result.select.bind(result);
      result.select = function(columns) {
        const timer = createTimer(
          serviceName, 
          `${table}.select`, 
          'query', 
          { columns, userId: context.userId }
        );
        
        const queryPromise = originalSelect(columns);
        
        // Wrap the promise to add monitoring
        const originalThen = queryPromise.then.bind(queryPromise);
        
        queryPromise.then = function(onfulfilled, onrejected) {
          return originalThen(
            (result) => {
              timer.stop();
              if (result.error) {
                logError(serviceName, `${table}.select`, result.error, { columns });
              }
              return onfulfilled ? onfulfilled(result) : result;
            },
            (error) => {
              timer.stop();
              logError(serviceName, `${table}.select`, error, { columns });
              return onrejected ? onrejected(error) : Promise.reject(error);
            }
          );
        };
        
        return queryPromise;
      };
      
      // Wrap the insert method to add monitoring
      const originalInsert = result.insert.bind(result);
      result.insert = function(values, options) {
        const timer = createTimer(
          serviceName, 
          `${table}.insert`, 
          'mutation', 
          { recordCount: Array.isArray(values) ? values.length : 1 }
        );
        
        const queryPromise = originalInsert(values, options);
        
        // Wrap the promise to add monitoring
        const originalThen = queryPromise.then.bind(queryPromise);
        
        queryPromise.then = function(onfulfilled, onrejected) {
          return originalThen(
            (result) => {
              timer.stop();
              if (result.error) {
                logError(serviceName, `${table}.insert`, result.error, { options });
              }
              return onfulfilled ? onfulfilled(result) : result;
            },
            (error) => {
              timer.stop();
              logError(serviceName, `${table}.insert`, error, { options });
              return onrejected ? onrejected(error) : Promise.reject(error);
            }
          );
        };
        
        return queryPromise;
      };
      
      // Wrap the update method to add monitoring
      const originalUpdate = result.update.bind(result);
      result.update = function(values, options) {
        const timer = createTimer(
          serviceName, 
          `${table}.update`, 
          'mutation', 
          { userId: context.userId }
        );
        
        const queryPromise = originalUpdate(values, options);
        
        // Wrap the promise to add monitoring
        const originalThen = queryPromise.then.bind(queryPromise);
        
        queryPromise.then = function(onfulfilled, onrejected) {
          return originalThen(
            (result) => {
              timer.stop();
              if (result.error) {
                logError(serviceName, `${table}.update`, result.error, { options });
              }
              return onfulfilled ? onfulfilled(result) : result;
            },
            (error) => {
              timer.stop();
              logError(serviceName, `${table}.update`, error, { options });
              return onrejected ? onrejected(error) : Promise.reject(error);
            }
          );
        };
        
        return queryPromise;
      };
      
      // Wrap the delete method to add monitoring
      const originalDelete = result.delete.bind(result);
      result.delete = function(options) {
        const timer = createTimer(
          serviceName, 
          `${table}.delete`, 
          'mutation', 
          { userId: context.userId }
        );
        
        const queryPromise = originalDelete(options);
        
        // Wrap the promise to add monitoring
        const originalThen = queryPromise.then.bind(queryPromise);
        
        queryPromise.then = function(onfulfilled, onrejected) {
          return originalThen(
            (result) => {
              timer.stop();
              if (result.error) {
                logError(serviceName, `${table}.delete`, result.error, { options });
              }
              return onfulfilled ? onfulfilled(result) : result;
            },
            (error) => {
              timer.stop();
              logError(serviceName, `${table}.delete`, error, { options });
              return onrejected ? onrejected(error) : Promise.reject(error);
            }
          );
        };
        
        return queryPromise;
      };
      
      return result;
    };
  }
  
  return supabase;
}

/**
 * Create a client specifically optimized for the Learning Management Service
 * 
 * @param context Request context for tracking and authorization
 * @returns Enhanced Supabase client with LMS-specific functionality
 */
export function createLearningDatabaseClient(context: RequestContext = {}): EnhancedClient {
  const client = createDatabaseClient(context, 'lms');
  
  // Add LMS-specific utility methods as needed
  
  return client;
}

/**
 * Create a client specifically optimized for the User Management Service
 * 
 * @param context Request context for tracking and authorization
 * @returns Enhanced Supabase client with user management functionality
 */
export function createUserManagementDatabaseClient(context: RequestContext = {}): EnhancedClient {
  const client = createDatabaseClient(context, 'user-management');
  
  // Add user management specific utility methods
  
  return client;
}

/**
 * Create a client specifically optimized for the Communication Service
 * 
 * @param context Request context for tracking and authorization
 * @returns Enhanced Supabase client with communication functionality
 */
export function createCommunicationDatabaseClient(context: RequestContext = {}): EnhancedClient {
  const client = createDatabaseClient(context, 'communication');
  
  // Add communication specific utility methods
  
  return client;
}

/**
 * Create a client specifically optimized for the Scheduling Service
 * 
 * @param context Request context for tracking and authorization
 * @returns Enhanced Supabase client with scheduling functionality
 */
export function createSchedulingDatabaseClient(context: RequestContext = {}): EnhancedClient {
  const client = createDatabaseClient(context, 'scheduling');
  
  // Add scheduling specific utility methods
  
  return client;
}

/**
 * Create a client specifically optimized for the Admin Service
 * 
 * @param context Request context for tracking and authorization
 * @returns Enhanced Supabase client with admin functionality
 */
export function createAdminDatabaseClient(context: RequestContext = {}): EnhancedClient {
  const client = createDatabaseClient(context, 'admin');
  
  // Add admin specific utility methods
  
  return client;
}

/**
 * Helper function to execute a database transaction across multiple operations
 * 
 * @param client Database client
 * @param operations Array of SQL operations to execute in transaction
 * @param serviceName Service name for monitoring
 * @returns Transaction result
 */
export async function executeTransaction<T = any>(
  client: EnhancedClient,
  operations: { sql: string; params: any[] }[],
  serviceName: ServiceName
): Promise<{ data: T | null; error: any }> {
  const timer = createTimer(serviceName, 'transaction', 'mutation', { operationCount: operations.length });
  
  try {
    // Build transaction SQL
    let transactionSql = 'BEGIN;\n';
    const allParams: any[] = [];
    let paramIndex = 1;
    
    operations.forEach(op => {
      // Replace placeholders with $n parameters
      let sql = op.sql;
      let currentParamIndex = paramIndex;
      
      for (let i = 0; i < op.params.length; i++) {
        sql = sql.replace(`$${i + 1}`, `$${currentParamIndex}`);
        allParams.push(op.params[i]);
        currentParamIndex++;
      }
      
      transactionSql += sql + ';\n';
      paramIndex = currentParamIndex;
    });
    
    transactionSql += 'COMMIT;';
    
    // Execute the transaction
    const { data, error } = await client.executeRawQuery(transactionSql, allParams, {
      monitoringOperation: 'executeTransaction'
    });
    
    timer.stop();
    return { data: data as T, error };
  } catch (error) {
    timer.stop();
    logError(serviceName, 'executeTransaction', error, { operationCount: operations.length });
    return { data: null, error };
  }
} 