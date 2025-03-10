/**
 * Performance configuration settings
 * This file centralizes all performance-related settings
 */

const config = {
  // Cache timeouts in milliseconds
  cache: {
    defaultTimeout: 5 * 60 * 1000, // 5 minutes
    longTimeout: 30 * 60 * 1000,   // 30 minutes
    shortTimeout: 60 * 1000,       // 1 minute
  },
  
  // Performance thresholds in milliseconds
  thresholds: {
    slowQuery: 500,        // Database queries taking longer than this will be logged as warnings
    slowOperation: 1000,   // General operations taking longer than this will be logged as warnings
    verySlowOperation: 3000, // Operations taking longer than this will be logged as errors
  },
  
  // Feature flags
  features: {
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development' || true,
    enableDbLogging: process.env.NODE_ENV === 'development' || true,
    enableDetailedErrors: process.env.NODE_ENV === 'development' || true,
  },
  
  // Database query settings
  database: {
    maxBatchSize: 100,     // Maximum number of items to include in a batch insert/update
    maxQueryItems: 50,     // Maximum number of items to return in a query before pagination
  }
};

export default config; 