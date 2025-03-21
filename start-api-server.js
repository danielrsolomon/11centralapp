#!/usr/bin/env node

/**
 * E11EVEN Central API Server Startup Script
 * 
 * This script provides a simplified way to start the API server in both development and production modes.
 * It automatically loads environment variables from .env.local, .env.development, or .env as fallbacks.
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine mode from args
const args = process.argv.slice(2);
const mode = args.includes('--production') ? 'production' : 'development';
const debugMode = args.includes('--debug');

// Environment variables setup
const envLocalPath = resolve(__dirname, '.env.local');
const envDevPath = resolve(__dirname, '.env.development');
const envPath = resolve(__dirname, '.env');

let envFile = null;
let customPort = null;
let supabaseUrl = null;
let supabaseKey = null;

// Function to extract values from env file
const extractValueFromEnvFile = (filePath, key) => {
  try {
    const content = readFileSync(filePath, 'utf8');
    const regex = new RegExp(`${key}=(.+)`, 'm');
    const match = content.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (err) {
    console.error(`Error reading ${key} from ${filePath}:`, err);
  }
  return null;
};

// Load PORT from environment file
const loadPortFromEnvFile = (filePath) => {
  return extractValueFromEnvFile(filePath, 'PORT');
};

if (existsSync(envLocalPath)) {
  envFile = envLocalPath;
  customPort = loadPortFromEnvFile(envLocalPath);
  
  // Explicitly extract Supabase credentials from .env.local
  supabaseUrl = extractValueFromEnvFile(envLocalPath, 'VITE_SUPABASE_URL') || 
                extractValueFromEnvFile(envLocalPath, 'SUPABASE_URL');
  
  supabaseKey = extractValueFromEnvFile(envLocalPath, 'SUPABASE_SERVICE_ROLE_KEY') || 
               extractValueFromEnvFile(envLocalPath, 'SUPABASE_KEY');

  console.log(`Using environment from .env.local${customPort ? ` (PORT=${customPort})` : ''}`);
  
  if (supabaseUrl) {
    console.log(`Found Supabase URL in .env.local`);
  }
  
  if (supabaseKey) {
    console.log(`Found Supabase Key in .env.local`);
  }
} else if (existsSync(envDevPath)) {
  envFile = envDevPath;
  customPort = loadPortFromEnvFile(envDevPath);
  
  // Try from .env.development if .env.local doesn't exist
  supabaseUrl = extractValueFromEnvFile(envDevPath, 'VITE_SUPABASE_URL') || 
                extractValueFromEnvFile(envDevPath, 'SUPABASE_URL');
  
  supabaseKey = extractValueFromEnvFile(envDevPath, 'SUPABASE_SERVICE_ROLE_KEY') || 
               extractValueFromEnvFile(envDevPath, 'SUPABASE_KEY');
  
  console.log(`Using environment from .env.development${customPort ? ` (PORT=${customPort})` : ''}`);
} else if (existsSync(envPath)) {
  envFile = envPath;
  customPort = loadPortFromEnvFile(envPath);
  
  // Try from .env as last resort
  supabaseUrl = extractValueFromEnvFile(envPath, 'VITE_SUPABASE_URL') || 
                extractValueFromEnvFile(envPath, 'SUPABASE_URL');
  
  supabaseKey = extractValueFromEnvFile(envPath, 'SUPABASE_SERVICE_ROLE_KEY') || 
               extractValueFromEnvFile(envPath, 'SUPABASE_KEY');
  
  console.log(`Using environment from .env${customPort ? ` (PORT=${customPort})` : ''}`);
} else {
  console.warn('No environment file found, using default values');
}

// If we're missing credentials, show an error
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials in environment files');
  console.error('Please ensure .env.local contains valid VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Or explicit SUPABASE_URL and SUPABASE_KEY values');
  process.exit(1);
}

// Base environment variables
const env = {
  ...process.env,
  NODE_ENV: mode,
  PORT: customPort || process.env.PORT || '3001',
  // Explicitly set Supabase variables to ensure they're available to the API server
  VITE_SUPABASE_URL: supabaseUrl,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  SUPABASE_KEY: supabaseKey
};

if (customPort) {
  console.log(`Using custom port: ${customPort}`);
}

// API server execution
const getCommand = () => {
  if (mode === 'production') {
    // In production mode, run the compiled JavaScript
    return ['node', ['dist/api/server.js']];
  } else {
    // In development mode, use tsx which properly handles TypeScript in ESM mode
    if (envFile) {
      return ['npx', ['tsx', '-r', 'dotenv/config', 'src/api/server.ts']];
    } else {
      return ['npx', ['tsx', 'src/api/server.ts']];
    }
  }
};

// Start the server
const [cmd, cmdArgs] = getCommand();
console.log(`Starting API server in ${mode} mode...`);
console.log(`Command: ${cmd} ${cmdArgs.join(' ')}`);

const serverProcess = spawn(cmd, cmdArgs, {
  env,
  stdio: 'inherit',
  shell: true,
});

// Handle process events
serverProcess.on('error', (err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`API server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Stopping API server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Stopping API server...');
  serverProcess.kill('SIGTERM');
}); 