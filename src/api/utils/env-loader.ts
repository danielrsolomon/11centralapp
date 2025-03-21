/**
 * Environment Variables Loader
 * 
 * This module provides a unified approach to loading environment variables with proper priority:
 * 1. .env.local (highest priority) - Used for local development overrides
 * 2. .env.development - Used for development environments
 * 3. .env (lowest priority) - Used as a fallback
 */

import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface EnvironmentLoadResult {
  loaded: boolean;
  source: string;
  variables: Record<string, string | undefined>;
}

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  available: Record<string, string>;
}

/**
 * Load environment variables with proper priority
 */
export function loadEnvironmentVariables(): EnvironmentLoadResult {
  // Get the current directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const cwd = process.cwd();

  // Define environment file paths with priority
  const envLocalPath = path.resolve(cwd, '.env.local');
  const envDevPath = path.resolve(cwd, '.env.development');
  const envPath = path.resolve(cwd, '.env');

  let loadedFile = null;

  // Debug info
  console.log('=== ENV LOADER DEBUGGING ===');
  console.log('Current working directory:', cwd);
  console.log('Checking environment files:');
  console.log('- .env.local exists:', fs.existsSync(envLocalPath));
  console.log('- .env.development exists:', fs.existsSync(envDevPath));
  console.log('- .env exists:', fs.existsSync(envPath));

  // Load environment variables with priority: .env.local > .env.development > .env
  if (fs.existsSync(envLocalPath)) {
    console.log('Loading environment from .env.local');
    // Load with dotenv first
    const env = dotenv.config({ path: envLocalPath });
    if (env.error) {
      console.error('Error loading .env.local:', env.error);
    } else {
      // Then expand variables
      const expanded = dotenvExpand.expand(env);
      if (expanded.error) {
        console.error('Error expanding variables in .env.local:', expanded.error);
      } else {
        console.log('.env.local loaded and expanded successfully');
      }
    }
    loadedFile = '.env.local';
  } else if (fs.existsSync(envDevPath)) {
    console.log('Loading environment from .env.development');
    const env = dotenv.config({ path: envDevPath });
    if (env.error) {
      console.error('Error loading .env.development:', env.error);
    } else {
      const expanded = dotenvExpand.expand(env);
      if (expanded.error) {
        console.error('Error expanding variables in .env.development:', expanded.error);
      } else {
        console.log('.env.development loaded and expanded successfully');
      }
    }
    loadedFile = '.env.development';
  } else if (fs.existsSync(envPath)) {
    console.log('Loading environment from .env');
    const env = dotenv.config({ path: envPath });
    if (env.error) {
      console.error('Error loading .env:', env.error);
    } else {
      const expanded = dotenvExpand.expand(env);
      if (expanded.error) {
        console.error('Error expanding variables in .env:', expanded.error);
      } else {
        console.log('.env loaded and expanded successfully');
      }
    }
    loadedFile = '.env';
  } else {
    console.warn('No environment file found. Using system environment variables only.');
    return {
      loaded: false,
      source: 'system',
      variables: {}
    };
  }

  // Show a sample of loaded environment variables to confirm they're available
  // Check if variable substitution worked by comparing values
  const viteSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const variableSubstitutionWorked = supabaseUrl.includes('$') ? false : 
                                    (supabaseUrl && viteSupabaseUrl && supabaseUrl === viteSupabaseUrl);
  
  console.log('VITE_SUPABASE_URL loaded:', !!process.env.VITE_SUPABASE_URL);
  console.log('SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);
  console.log('Any Supabase URL available:', !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL));
  console.log('Variable substitution worked:', variableSubstitutionWorked ? 'Yes' : 'No');
  
  if (!variableSubstitutionWorked && supabaseUrl.includes('${')) {
    console.warn('⚠️ Variable substitution may not be working correctly. Check your .env file format.');
    console.warn('⚠️ Consider using explicit values instead of ${...} syntax in your .env files.');
  }
  
  console.log('=== END ENV LOADER DEBUGGING ===');

  // Log loaded environment variables (non-sensitive ones only)
  const safeEnvVars = Object.keys(process.env)
    .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD'))
    .reduce<Record<string, string | undefined>>((obj, key) => {
      obj[key] = process.env[key];
      return obj;
    }, {});

  return {
    loaded: true,
    source: loadedFile,
    variables: safeEnvVars
  };
}

/**
 * Get an environment variable with a fallback value
 */
export function getEnvironmentVariable(name: string, fallback = ''): string {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
}

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required environment variable names
 * @returns {ValidationResult} - Object with validation results
 */
export function validateEnvironment(requiredVars: string[]): ValidationResult {
  const missing: string[] = [];
  const available: Record<string, string> = {};

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      // For sensitive variables, just note they exist without showing value
      if (varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PASSWORD')) {
        available[varName] = '[SECURED]';
      } else {
        available[varName] = process.env[varName] || '';
      }
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    available
  };
} 