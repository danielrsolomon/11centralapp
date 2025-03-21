#!/usr/bin/env node

// Load required modules
import https from 'https';
import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging functions
function logInfo(message) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logError(message) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

logInfo('E11EVEN Central App - API Verification Tool');
logInfo('==========================================');
console.log('');

/**
 * Make a request to check if an endpoint is available
 */
function checkEndpoint(url) {
  return new Promise((resolve, reject) => {
    logInfo(`Checking ${url}...`);
    
    const httpModule = url.startsWith('https') ? https : http;
    const req = httpModule.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonResponse = JSON.parse(data);
            logSuccess(`✅ Successfully connected to ${url}`);
            logSuccess(`Response: ${JSON.stringify(jsonResponse, null, 2)}`);
            resolve({ success: true, data: jsonResponse, statusCode: res.statusCode });
          } catch (error) {
            logSuccess(`✅ Connected to ${url} but response is not JSON: ${data.substring(0, 100)}...`);
            resolve({ success: true, data: data, statusCode: res.statusCode });
          }
        } else {
          logError(`❌ Request to ${url} failed with status code: ${res.statusCode}`);
          logError(`Response: ${data}`);
          resolve({ success: false, error: `Status code: ${res.statusCode}`, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      logError(`❌ Request to ${url} failed: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      logError(`❌ Request to ${url} timed out after 5 seconds`);
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

/**
 * Check API-based Supabase endpoints
 */
async function checkApiSupabaseEndpoints(apiUrl) {
  logInfo('Checking API-based Supabase endpoints...');
  
  // Check basic auth endpoint
  const sessionEndpoint = `${apiUrl}/api/auth/session`;
  logInfo(`Testing endpoint: ${sessionEndpoint}`);
  
  const sessionResult = await checkEndpoint(sessionEndpoint);
  if (!sessionResult.success) {
    logError('❌ Auth session endpoint is not responding correctly');
    logInfo('This endpoint should handle authentication via API instead of direct Supabase access');
  } else {
    // Even if we get a 401 response, the endpoint is working
    if (sessionResult.statusCode === 401) {
      logSuccess('✅ Auth session endpoint is working (returned 401 as expected without auth token)');
    } else {
      logSuccess('✅ Auth session endpoint is responding');
    }
  }
  
  // Check chat rooms endpoint
  const chatEndpoint = `${apiUrl}/api/chat/rooms`;
  logInfo(`Testing endpoint: ${chatEndpoint}`);
  
  const chatResult = await checkEndpoint(chatEndpoint);
  if (!chatResult.success && chatResult.statusCode !== 401) {
    logError('❌ Chat rooms endpoint is not responding correctly');
    logInfo('This endpoint should handle Supabase database access via API');
  } else if (chatResult.statusCode === 401) {
    logSuccess('✅ Chat rooms endpoint is working (returned 401 as expected without auth token)');
  } else {
    logSuccess('✅ Chat rooms endpoint is responding');
  }
  
  logInfo('API-based Supabase integration check complete');
  
  // Add advice based on the results
  if (!sessionResult.success || !chatResult.success) {
    logInfo('Some API-based Supabase endpoints are not working properly.');
    logInfo('Ensure that you have migrated Supabase operations to API routes as per the new integration pattern.');
    logInfo('Documentation: See documentation/supabase/SUPABASE_INTEGRATION.md for details on the API-first approach.');
  }
}

/**
 * Check if the API is running
 */
async function checkApi() {
  try {
    // Load environment variables from .env.local
    let apiUrl = 'http://localhost:3001';
    let supabaseUrl = null;
    let supabaseKey = null;
    
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        const apiUrlMatch = envFile.match(/VITE_API_URL=(.+)/);
        if (apiUrlMatch) {
          apiUrl = apiUrlMatch[1].trim();
        }
        
        const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL=(.+)/);
        if (supabaseUrlMatch) {
          supabaseUrl = supabaseUrlMatch[1].trim();
        }
        
        const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
        if (supabaseKeyMatch) {
          supabaseKey = supabaseKeyMatch[1].trim();
        }
      }
    } catch (error) {
      logError(`Could not load environment variables: ${error.message}`);
    }
    
    // Check if the API is running by making a request to the health endpoint
    logInfo(`Checking API at ${apiUrl}/api/health...`);
    const apiResult = await checkEndpoint(`${apiUrl}/api/health`);
    
    if (!apiResult.success) {
      logError('API is not responding. Additional diagnostics:');
      
      // Check if any process is listening on API port
      const portMatch = apiUrl.match(/:(\d+)/);
      if (portMatch) {
        const port = portMatch[1];
        logInfo(`Checking if any process is listening on port ${port}...`);
        
        exec(`lsof -i:${port} -P -n | grep LISTEN`, (error, stdout, stderr) => {
          if (stdout) {
            logInfo(`Processes listening on port ${port}:`);
            console.log(stdout);
          } else {
            logError(`No process is listening on port ${port}. The API server is not running.`);
            logInfo(`Try starting the API server with: npm run api:start`);
          }
        });
      }
    } else {
      logSuccess('✅ API is running and responding to health checks');
    }
    
    // Check Supabase connectivity if URL and key are available
    if (supabaseUrl && supabaseKey) {
      logInfo(`Checking Supabase connectivity at ${supabaseUrl}...`);
      
      // Try to make a basic request to Supabase to verify connectivity
      const supabaseHealthUrl = `${supabaseUrl}/auth/v1/health`;
      const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      };
      
      const supabaseResult = await new Promise((resolve, reject) => {
        const req = https.get(supabaseHealthUrl, { headers }, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const jsonResponse = JSON.parse(data);
                logSuccess(`✅ Successfully connected to Supabase`);
                resolve({ success: true, data: jsonResponse });
              } catch (error) {
                logSuccess(`✅ Connected to Supabase but response is not JSON`);
                resolve({ success: true, data: data });
              }
            } else {
              logError(`❌ Request to Supabase failed with status code: ${res.statusCode}`);
              resolve({ success: false, error: `Status code: ${res.statusCode}`, data: data });
            }
          });
        });
        
        req.on('error', (error) => {
          logError(`❌ Request to Supabase failed: ${error.message}`);
          resolve({ success: false, error: error.message });
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          logError(`❌ Request to Supabase timed out after 5 seconds`);
          resolve({ success: false, error: 'Timeout' });
        });
      });
      
      if (!supabaseResult.success) {
        logError('Supabase connection failed. Check your Supabase URL and anon key.');
        logInfo('Verify that your environment variables are correct in .env.local:');
        logInfo('VITE_SUPABASE_URL=https://your-project.supabase.co');
        logInfo('VITE_SUPABASE_ANON_KEY=your-anon-key');
      }
    } else {
      logError('Supabase URL or anon key not found in environment variables.');
      logInfo('Make sure your .env.local file contains the following variables:');
      logInfo('VITE_SUPABASE_URL=https://your-project.supabase.co');
      logInfo('VITE_SUPABASE_ANON_KEY=your-anon-key');
    }
    
    // Check API-based Supabase integration
    if (apiResult.success) {
      await checkApiSupabaseEndpoints(apiUrl);
    } else {
      logError('Skipping API-based Supabase endpoints check because API is not responding');
    }
    
    console.log('');
    logInfo('==========================================');
    logInfo('Next steps:');
    
    if (!apiResult.success) {
      logInfo('1. Start the API server with: npm run api:start');
    }
    
    logInfo(apiResult.success 
      ? '1. API is running correctly. Try to access it from the frontend.'
      : '2. After starting the API, verify it works with: curl http://localhost:3001/api/health');
    
    logInfo(apiResult.success 
      ? '2. Start the frontend with: npm run dev'
      : '3. Start the frontend with: npm run dev');
    
    logInfo(apiResult.success 
      ? '3. Test login with a test user account'
      : '4. Test login with a test user account');
    
    logInfo('==========================================');
  } catch (error) {
    logError(`An error occurred: ${error.message}`);
  }
}

// Run the checks
checkApi(); 