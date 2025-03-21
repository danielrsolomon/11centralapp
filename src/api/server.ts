// API Server Entry Point
import { startApiServer } from './index.js';
import { loadEnvironmentVariables, getEnvironmentVariable, validateEnvironment } from './utils/env-loader.ts';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabaseAdmin } from './supabaseAdmin';
// Either don't import this (will be removed) or adjust the import path if the file exists
// import { disableSupabaseAutoRefresh } from './utils/disableSupabaseRefresh';
import routes from './routes/index';
import errorHandler from './middleware/error-handler';
import compression from 'compression';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { apiLogger } from './middleware/logger';

// Initialize environment variables
const envResult = loadEnvironmentVariables();

// Validate critical environment variables
const requiredVars = [
  'PORT',
  'VITE_SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

// Only require one of each pair
const validation = validateEnvironment(requiredVars);

// Prepare detailed diagnostic information
let missingPairs = [];
if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
  missingPairs.push('VITE_SUPABASE_URL or SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_KEY) {
  missingPairs.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY');
}

// If we're missing critical environment variable pairs, exit with error
if (missingPairs.length > 0) {
  console.error('\n🚨 ERROR: Missing critical environment variables:');
  missingPairs.forEach(pair => {
    console.error(`  - ${pair}`);
  });
  
  console.error('\n📋 Environment configuration diagnostic:');
  console.error(`  - Environment loaded from: ${envResult.source || 'system environment'}`);
  
  if (envResult.source) {
    console.error(`  - Check your ${envResult.source} file for proper configuration`);
    console.error('  - Ensure variable substitution is working correctly or use explicit values');
  } else {
    console.error('  - No .env file was found. Create one based on .env.example');
  }
  
  console.error('\n💡 Troubleshooting suggestions:');
  console.error('  1. Verify that your .env.local file exists and contains the required variables');
  console.error('  2. Use explicit values instead of variable substitution (${...})');
  console.error('  3. Check for syntax errors in your .env files');
  console.error('  4. Make sure VITE_SUPABASE_URL matches your Supabase project URL');
  console.error('  5. Make sure SUPABASE_SERVICE_ROLE_KEY is your service role key from Supabase\n');
  
  process.exit(1);
}

// Set port from environment, with a default fallback
const PORT = parseInt(process.env.PORT || '3001', 10);

// Disable auto-refresh on the admin client to prevent localStorage errors
// Manual implementation since we might not have the utility imported
try {
  // @ts-ignore - accessing internal property to fix issues
  if (supabaseAdmin.auth._autoRefreshInterval) {
    // @ts-ignore - accessing internal property to fix issues
    clearInterval(supabaseAdmin.auth._autoRefreshInterval);
    // @ts-ignore - accessing internal property to fix issues
    supabaseAdmin.auth._autoRefreshInterval = null;
    console.log('[API Server] Disabled Supabase auto-refresh interval');
  }

  // @ts-ignore - accessing internal property to fix issues
  if (typeof supabaseAdmin.auth._autoRefreshTokenTick === 'function') {
    // @ts-ignore - replace with no-op function
    supabaseAdmin.auth._autoRefreshTokenTick = () => Promise.resolve();
    console.log('[API Server] Replaced Supabase autoRefreshTokenTick with no-op function');
  }
} catch (error) {
  console.error('[API Server] Failed to disable Supabase auto-refresh:', error);
}

// Create Express app
const app = express();

// Start the API server
console.log(`Starting E11EVEN Central API server on port ${PORT}...`);
startApiServer(PORT); 