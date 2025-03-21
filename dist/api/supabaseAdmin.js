"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdminError = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Admin credentials');
}
// This client has admin privileges and should only be used in secure contexts
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Helper to handle errors
const handleAdminError = (error) => {
    console.error('Supabase Admin API error:', error);
    return {
        error: {
            message: error.message || 'An unexpected error occurred',
            status: error.status || 500
        }
    };
};
exports.handleAdminError = handleAdminError;
//# sourceMappingURL=supabaseAdmin.js.map