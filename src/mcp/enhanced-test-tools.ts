import { SupabaseClient } from '@supabase/supabase-js';
import { expectedTables, expectedRoles } from './supabase-structure';

export interface AccessTestResult {
  tableName: string;
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  errors: {
    select?: string;
    insert?: string;
    update?: string;
    delete?: string;
  };
  data?: any[];
  matchesExpectedRLS: boolean;
}

/**
 * Tests access to a specific table in Supabase
 */
export async function testTableAccess(
  supabase: SupabaseClient,
  tableName: string
): Promise<AccessTestResult> {
  const result: AccessTestResult = {
    tableName,
    canSelect: false,
    canInsert: false,
    canUpdate: false,
    canDelete: false,
    errors: {},
    matchesExpectedRLS: false
  };

  // Find the expected table definition
  const expectedTable = expectedTables.find(t => t.name === tableName);
  
  // Select test
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    if (error) {
      result.errors.select = error.message;
    } else {
      result.canSelect = true;
      result.data = data;
    }
  } catch (error) {
    result.errors.select = error instanceof Error ? error.message : String(error);
  }

  // Insert test
  try {
    // Create a test record based on the expected columns
    const testData: Record<string, any> = {
      created_at: new Date().toISOString()
    };
    
    // Add test values for common columns
    if (expectedTable) {
      for (const column of expectedTable.columns) {
        if (column.name !== 'id' && column.name !== 'created_at' && column.name !== 'updated_at') {
          switch (column.type) {
            case 'text':
              testData[column.name] = `Test ${column.name}`;
              break;
            case 'uuid':
              testData[column.name] = '00000000-0000-0000-0000-000000000000';
              break;
            case 'numeric':
              testData[column.name] = 0;
              break;
            case 'integer':
              testData[column.name] = 0;
              break;
            case 'boolean':
              testData[column.name] = false;
              break;
            case 'date':
              testData[column.name] = new Date().toISOString().split('T')[0];
              break;
            case 'timestamp':
              testData[column.name] = new Date().toISOString();
              break;
            default:
              testData[column.name] = null;
          }
        }
      }
    } else {
      // Default test values if no expected columns
      testData.name = `Test ${tableName}`;
      testData.description = `Test description for ${tableName}`;
    }
    
    const { data, error } = await supabase
      .from(tableName)
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      result.errors.insert = error.message;
    } else {
      result.canInsert = true;
      
      // If insert was successful, test update and delete
      if (data && data.id) {
        // Update test
        try {
          const updateData = { updated_at: new Date().toISOString() };
          const { error: updateError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', data.id)
            .select()
            .single();
          
          if (updateError) {
            result.errors.update = updateError.message;
          } else {
            result.canUpdate = true;
          }
        } catch (error) {
          result.errors.update = error instanceof Error ? error.message : String(error);
        }
        
        // Delete test
        try {
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('id', data.id);
          
          if (deleteError) {
            result.errors.delete = deleteError.message;
          } else {
            result.canDelete = true;
          }
        } catch (error) {
          result.errors.delete = error instanceof Error ? error.message : String(error);
        }
      }
    }
  } catch (error) {
    result.errors.insert = error instanceof Error ? error.message : String(error);
  }

  // Check if access matches expected RLS
  if (expectedTable) {
    const hasRLS = expectedTable.expectedRLS;
    // If RLS is expected, we should NOT be able to insert/update/delete
    // If RLS is not expected, we should be able to insert/update/delete
    result.matchesExpectedRLS = hasRLS ? 
      !(result.canInsert || result.canUpdate || result.canDelete) : 
      (result.canInsert && result.canUpdate && result.canDelete);
  }

  return result;
}

/**
 * Tests access to all expected tables in Supabase
 */
export async function testAllTablesAccess(
  supabase: SupabaseClient
): Promise<AccessTestResult[]> {
  const results: AccessTestResult[] = [];
  
  for (const table of expectedTables) {
    const result = await testTableAccess(supabase, table.name);
    results.push(result);
  }
  
  return results;
}

/**
 * Compares actual tables with expected tables
 */
export async function analyzeTableStructure(
  supabase: SupabaseClient
): Promise<any> {
  try {
    // Get actual tables
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      return {
        error: tablesError.message,
        expected: expectedTables.map(t => t.name),
        actual: []
      };
    }
    
    const actualTables = tablesData?.map(t => t.table_name) || [];
    
    // Compare with expected tables
    const expectedTableNames = expectedTables.map(t => t.name);
    const missingTables = expectedTableNames.filter(t => !actualTables.includes(t));
    const unexpectedTables = actualTables.filter(t => !expectedTableNames.includes(t));
    
    // Get columns for each actual table
    const tableStructures: Record<string, any> = {};
    for (const tableName of actualTables) {
      const { data: columnsData, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);
      
      if (columnsError) {
        tableStructures[tableName] = { error: columnsError.message };
      } else {
        tableStructures[tableName] = {
          columns: columnsData || [],
          expectedTable: expectedTables.find(t => t.name === tableName)
        };
      }
    }
    
    return {
      expected: expectedTableNames,
      actual: actualTables,
      missing: missingTables,
      unexpected: unexpectedTables,
      details: tableStructures
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Checks if roles match expected roles
 */
export async function analyzeRoles(
  supabase: SupabaseClient
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*');
    
    if (error) {
      return {
        error: error.message,
        expected: expectedRoles
      };
    }
    
    const actualRoles = data || [];
    const expectedRoleNames = expectedRoles.map(r => r.name);
    const actualRoleNames = actualRoles.map((r: any) => r.name);
    
    const missingRoles = expectedRoleNames.filter(r => !actualRoleNames.includes(r));
    const unexpectedRoles = actualRoleNames.filter(r => !expectedRoleNames.includes(r));
    
    return {
      expected: expectedRoles,
      actual: actualRoles,
      missing: missingRoles,
      unexpected: unexpectedRoles
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      expected: expectedRoles
    };
  }
} 