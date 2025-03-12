/**
 * E11EVEN Central Platform - Monitoring System
 * 
 * This module provides functionality to track performance metrics,
 * log errors, and monitor application health during the service
 * architecture migration.
 */

import { isFeatureEnabled } from './feature-flags';

// Service name type definition for consistent naming
export type ServiceName = 
  | 'lms'              // Learning Management Service
  | 'user-management'  // User Management Service
  | 'communication'    // Communication Service
  | 'scheduling'       // Scheduling Service
  | 'admin';           // Administration Service

// Operation type categorization
export type OperationType = 
  | 'query'       // Database query operations
  | 'mutation'    // Database write operations
  | 'render'      // UI rendering operations
  | 'calculation' // CPU-intensive calculations
  | 'api'         // External API calls
  | 'auth';       // Authentication operations

// Configuration options for the monitoring system
interface MonitoringConfig {
  // Whether to log metrics to console
  logToConsole: boolean;
  // Whether to send metrics to external monitoring service
  sendToAnalytics: boolean;
  // Sampling rate for performance metrics (0-1)
  samplingRate: number;
  // Log level threshold
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Default configuration based on environment
const defaultConfig: MonitoringConfig = {
  logToConsole: process.env.NODE_ENV === 'development',
  sendToAnalytics: process.env.NODE_ENV === 'production',
  samplingRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // Sample 10% in production
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
};

// Current configuration (can be updated at runtime)
let config: MonitoringConfig = { ...defaultConfig };

/**
 * Update monitoring configuration
 */
export function configureMonitoring(newConfig: Partial<MonitoringConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Record a performance metric
 * 
 * @param service The service generating the metric
 * @param operation The operation being measured
 * @param type The type of operation
 * @param durationMs The duration in milliseconds
 * @param metadata Additional contextual data
 * @param implementation 'legacy' or 'new' to track which implementation was used
 */
export function recordMetric(
  service: ServiceName,
  operation: string,
  type: OperationType,
  durationMs: number,
  metadata: Record<string, any> = {},
  implementation: 'legacy' | 'new' = 'new'
): void {
  // Check if monitoring is enabled via feature flag
  if (!isFeatureEnabled('use-service-monitoring')) {
    return;
  }

  // Apply sampling rate
  if (Math.random() > config.samplingRate) {
    return;
  }

  const metric = {
    timestamp: new Date().toISOString(),
    service,
    operation,
    type,
    durationMs,
    implementation,
    ...metadata
  };

  // Log to console if enabled
  if (config.logToConsole) {
    console.log(
      `[METRIC] ${service}.${operation} (${type}): ${durationMs}ms`, 
      implementation === 'legacy' ? '[legacy]' : '[new]',
      metadata
    );
  }

  // Send to analytics service if enabled
  if (config.sendToAnalytics) {
    sendToAnalyticsService(metric);
  }
}

/**
 * Create a timer to measure operation duration
 * 
 * @param service The service generating the metric
 * @param operation The operation being measured
 * @param type The type of operation
 * @param metadata Additional contextual data
 * @param implementation 'legacy' or 'new' to track which implementation was used
 * @returns Timer object with stop method
 * 
 * @example
 * const timer = createTimer('lms', 'listPrograms', 'query');
 * // ... perform operation
 * timer.stop(); // Automatically records the metric
 */
export function createTimer(
  service: ServiceName,
  operation: string,
  type: OperationType,
  metadata: Record<string, any> = {},
  implementation: 'legacy' | 'new' = 'new'
) {
  const startTime = performance.now();
  
  return {
    stop: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      recordMetric(service, operation, type, duration, metadata, implementation);
      return duration;
    }
  };
}

/**
 * Log an application error
 * 
 * @param service The service generating the error
 * @param operation The operation that failed
 * @param error The error object
 * @param metadata Additional contextual data
 * @param level The severity level
 */
export function logError(
  service: ServiceName,
  operation: string,
  error: Error | unknown,
  metadata: Record<string, any> = {},
  level: 'warn' | 'error' = 'error'
): void {
  // Skip logging based on configured log level
  if (
    (level === 'warn' && config.logLevel === 'error') || 
    (config.logLevel === 'info' && (level === 'warn' || level === 'error')) ||
    (config.logLevel === 'debug')
  ) {
    return;
  }

  const errorData = {
    timestamp: new Date().toISOString(),
    service,
    operation,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata
  };

  // Log to console
  if (config.logToConsole) {
    if (level === 'error') {
      console.error(`[ERROR] ${service}.${operation}:`, error, metadata);
    } else {
      console.warn(`[WARN] ${service}.${operation}:`, error, metadata);
    }
  }

  // Send to error tracking service (e.g., Sentry) in production
  if (config.sendToAnalytics) {
    sendToErrorService(errorData, level);
  }
}

/**
 * Log application events for auditing and debugging
 * 
 * @param service The service generating the event
 * @param eventName The name of the event
 * @param data Event data
 * @param level The severity/importance level
 */
export function logEvent(
  service: ServiceName,
  eventName: string,
  data: Record<string, any> = {},
  level: 'debug' | 'info' | 'warn' | 'error' = 'info'
): void {
  // Skip logging based on configured log level
  const levelPriority: Record<string, number> = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3
  };

  if (levelPriority[level] < levelPriority[config.logLevel]) {
    return;
  }

  const eventData = {
    timestamp: new Date().toISOString(),
    service,
    event: eventName,
    level,
    data
  };

  // Log to console
  if (config.logToConsole) {
    const logFn = {
      'debug': console.debug,
      'info': console.info,
      'warn': console.warn,
      'error': console.error
    }[level] || console.log;
    
    logFn(`[${level.toUpperCase()}] ${service}.${eventName}:`, data);
  }

  // Send to analytics service
  if (config.sendToAnalytics) {
    sendToEventService(eventData);
  }
}

// Performance comparison between legacy and new implementations
export function compareImplementations(
  service: ServiceName,
  operation: string,
  type: OperationType,
  legacyPromiseFn: () => Promise<any>,
  newPromiseFn: () => Promise<any>,
  metadata: Record<string, any> = {}
): Promise<{ result: any, comparison: { legacy: number, new: number, diff: number, percentChange: number } }> {
  // Start legacy timer
  const legacyStartTime = performance.now();
  
  // Run legacy implementation
  return legacyPromiseFn()
    .then(legacyResult => {
      const legacyDuration = performance.now() - legacyStartTime;
      recordMetric(service, operation, type, legacyDuration, metadata, 'legacy');
      
      // Start new implementation timer
      const newStartTime = performance.now();
      
      // Run new implementation
      return newPromiseFn()
        .then(newResult => {
          const newDuration = performance.now() - newStartTime;
          recordMetric(service, operation, type, newDuration, metadata, 'new');
          
          // Calculate difference
          const diff = newDuration - legacyDuration;
          const percentChange = (diff / legacyDuration) * 100;
          
          // Log comparison
          logEvent(service, `${operation}.comparison`, {
            legacy: legacyDuration,
            new: newDuration,
            diff,
            percentChange: `${percentChange.toFixed(2)}%`
          }, 'info');
          
          return {
            result: newResult, // Return the new implementation result
            comparison: {
              legacy: legacyDuration,
              new: newDuration,
              diff,
              percentChange
            }
          };
        });
    });
}

// Initialize monitoring client (placeholder for real implementation)
let analyticsInitialized = false;

/**
 * Placeholder for sending metrics to an analytics service
 * Replace with actual implementation (Vercel Analytics, Datadog, etc.)
 */
function sendToAnalyticsService(metric: any): void {
  initializeAnalyticsIfNeeded();
  
  // Placeholder - replace with actual implementation
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('PerformanceMetric', metric);
  }
}

/**
 * Placeholder for sending errors to an error tracking service
 * Replace with actual implementation (Sentry, Datadog, etc.)
 */
function sendToErrorService(errorData: any, level: 'warn' | 'error'): void {
  initializeAnalyticsIfNeeded();
  
  // Placeholder - replace with actual implementation
  if (typeof window !== 'undefined') {
    if ((window as any).Sentry) {
      const severity = level === 'error' ? 'error' : 'warning';
      (window as any).Sentry.captureEvent({
        level: severity,
        extra: errorData
      });
    }
  }
}

/**
 * Placeholder for sending events to an analytics service
 * Replace with actual implementation
 */
function sendToEventService(eventData: any): void {
  initializeAnalyticsIfNeeded();
  
  // Placeholder - replace with actual implementation
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(eventData.event, eventData);
  }
}

/**
 * Initialize analytics services if needed
 */
function initializeAnalyticsIfNeeded(): void {
  // Skip if already initialized or not in browser
  if (analyticsInitialized || typeof window === 'undefined') {
    return;
  }
  
  // Placeholder for analytics initialization
  // Replace with actual initialization code for your analytics providers
  
  analyticsInitialized = true;
}

// Export a monitoring instance for easier imports
export const Monitoring = {
  recordMetric,
  createTimer,
  logError,
  logEvent,
  compareImplementations,
  configureMonitoring
}; 