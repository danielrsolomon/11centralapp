import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local in the parent directory
const envPath = path.resolve(__dirname, '../../../.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Environment file not found: ${envPath}`);
  dotenv.config(); // Try loading from default .env file
}

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

// Log loaded credentials (masked for security)
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'undefined');
console.log('Supabase Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'undefined');
console.log('Supabase Service Key:', supabaseServiceKey ? 'Found (masked)' : 'Not available');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase credentials. Make sure they are defined in .env.local');
  process.exit(1);
}

// Create and export the Supabase client
// Use service key if available, otherwise use anon key
const authKey = supabaseServiceKey || supabaseAnonKey;
export const supabase = createClient(supabaseUrl, authKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export helper functions
export const isError = (error: any): boolean => !!error;

export const formatErrorMessage = (error: any): string => {
  if (!error) return '';
  return error.message || error.toString();
};

// Simple wrapper for table operations
export async function queryTable(tableName: string, options: {
  select?: string;
  filters?: Record<string, any>;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
} = {}) {
  try {
    const { select = '*', filters = {}, limit, orderBy } = options;
    let query = supabase.from(tableName).select(select);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const operator = Object.keys(value)[0];
        const operand = value[operator];
        
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
          default: query = query.eq(key, operand);
        }
      } else {
        query = query.eq(key, value);
      }
    });

    // Apply order
    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending !== false
      });
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  } catch (error) {
    console.error(`Error querying table ${tableName}:`, error);
    return { data: null, error };
  }
} 