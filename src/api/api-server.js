#!/usr/bin/env node

/**
 * API Server Entry Point with Global Polyfills
 * 
 * This script loads necessary polyfills before starting the API server,
 * ensuring that browser APIs like localStorage are available in Node.js.
 */

// Apply global localStorage polyfill before loading any other modules
require('./fixGlobalStorage');

// Also disable auto-refresh in Supabase clients
require('./fixSupabaseAutoRefresh');

console.log('Starting API server with polyfills applied...');

// Load the actual server (which is transpiled from TypeScript)
require('../dist/api/server.js'); 