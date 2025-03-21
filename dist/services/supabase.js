"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorMessage = exports.isError = exports.isQuerySuccessful = exports.handleSupabaseError = exports.supabase = void 0;
exports.queryTable = queryTable;
const supabase_js_1 = require("@supabase/supabase-js");
// For Vite environments, import.meta.env is available directly
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    console.error('VITE_SUPABASE_URL:', supabaseUrl);
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[REDACTED]' : 'undefined');
}
// Create Supabase client
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
// Helper to handle Supabase errors consistently
const handleSupabaseError = (error) => {
    console.error('Supabase error:', error);
    // Create a standardized error that matches PostgrestError structure
    const postgrestError = {
        message: error.message || 'An unexpected error occurred',
        details: error.details || '',
        hint: error.hint || '',
        code: error.code || 'UNKNOWN_ERROR',
        name: 'PostgrestError'
    };
    return {
        data: null,
        error: postgrestError
    };
};
exports.handleSupabaseError = handleSupabaseError;
// Utility function to check if a query was successful
const isQuerySuccessful = (result) => {
    return !result.error && result.data !== null;
};
exports.isQuerySuccessful = isQuerySuccessful;
// Check if something is an error
const isError = (error) => {
    return error !== null && error !== undefined;
};
exports.isError = isError;
// Format error message for display
const formatErrorMessage = (error) => {
    if (!error)
        return 'No error';
    if (typeof error === 'string')
        return error;
    return error.message || error.details || JSON.stringify(error);
};
exports.formatErrorMessage = formatErrorMessage;
// Common query function with error handling
async function queryTable(tableName, options = {}) {
    try {
        const { select = '*', filters = {}, limit, orderBy } = options;
        let query = exports.supabase.from(tableName).select(select);
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                const operator = Object.keys(value)[0];
                const operand = value[operator];
                switch (operator) {
                    case 'eq':
                        query = query.eq(key, operand);
                        break;
                    case 'neq':
                        query = query.neq(key, operand);
                        break;
                    case 'in':
                        query = query.in(key, operand);
                        break;
                    case 'gt':
                        query = query.gt(key, operand);
                        break;
                    case 'gte':
                        query = query.gte(key, operand);
                        break;
                    case 'lt':
                        query = query.lt(key, operand);
                        break;
                    case 'lte':
                        query = query.lte(key, operand);
                        break;
                    default: query = query.eq(key, operand);
                }
            }
            else {
                query = query.eq(key, value);
            }
        });
        // Apply limit
        if (limit) {
            query = query.limit(limit);
        }
        // Apply ordering
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
        return await query;
    }
    catch (error) {
        return (0, exports.handleSupabaseError)(error);
    }
}
//# sourceMappingURL=supabase.js.map