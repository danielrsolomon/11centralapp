// Polyfill localStorage before anything else loads
if (typeof global !== 'undefined' && !global.localStorage) {
  // Create a basic in-memory implementation
  const memoryStore = new Map();
  global.localStorage = {
    getItem: (key) => memoryStore.get(key) || null,
    setItem: (key, value) => memoryStore.set(key, value),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
    get length() { return memoryStore.size; },
    key: (n) => Array.from(memoryStore.keys())[n] || null
  };
  console.log('[API] Added localStorage polyfill to global scope');
}

// Apply Supabase fixups
try {
  // Node.js 'require' for CommonJS modules in TypeScript
  // @ts-ignore
  require('./fixSupabaseAutoRefresh.js');
  console.log('[API] Successfully loaded Supabase fixes');
} catch (error) {
  console.warn('[API] Could not load Supabase fixes:', error);
}

import express from 'express';
import cors from 'cors';
import { loadEnvironmentVariables } from './utils/env-loader.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import apiRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';

/**
 * Initialize the API server
 */
export const startApiServer = (port: number) => {
  // Create Express app
  const app = express();
  
  // Load environment variables
  loadEnvironmentVariables();
  
  // Setup middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        message: 'API server is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
  });
  
  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);
  
  // Handle 404s
  app.use(notFoundHandler);
  
  // Handle errors
  app.use(errorHandler);
  
  // Start server
  const server = app.listen(port, () => {
    console.log(`API server running at http://localhost:${port}`);
  });
  
  return server;
};

// Re-export all admin API functions for backwards compatibility
export * from './supabaseAdmin.js';

// Export the Supabase admin client
export { supabaseAdmin } from './supabaseAdmin.js'; 