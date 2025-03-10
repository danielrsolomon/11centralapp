/**
 * Debug utilities for identifying performance issues and errors
 */
import logger from './logger';

// Used to store timing marks
const timings: Record<string, number> = {};

/**
 * Start timing an operation
 * 
 * @example
 * // At the start of an operation
 * startTiming('load-dashboard');
 * 
 * // Later, when operation completes
 * const duration = endTiming('load-dashboard');
 * console.log(`Dashboard loaded in ${duration}ms`);
 */
export function startTiming(key: string): void {
  timings[key] = performance.now();
}

/**
 * End timing an operation and return the duration in ms
 */
export function endTiming(key: string): number {
  if (!timings[key]) {
    logger.warn(`No timing started for key: ${key}`);
    return 0;
  }
  
  const duration = performance.now() - timings[key];
  delete timings[key];
  
  // Log slow operations
  if (duration > 1000) {
    logger.warn(`SLOW OPERATION: ${key} took ${duration.toFixed(1)}ms`);
  } else {
    logger.debug(`Operation ${key} took ${duration.toFixed(1)}ms`);
  }
  
  return duration;
}

/**
 * Wrapper to time any function execution
 * 
 * @example
 * const result = await timeFunction('fetch-users', () => fetchUsers());
 */
export async function timeFunction<T>(
  description: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    if (duration > 1000) {
      logger.warn(`SLOW OPERATION: ${description} took ${duration.toFixed(1)}ms`);
    } else {
      logger.debug(`Operation ${description} took ${duration.toFixed(1)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`Error in operation ${description} after ${duration.toFixed(1)}ms`, error as Error);
    throw error;
  }
}

/**
 * Create a memory usage report
 */
export function getMemoryUsage(): Record<string, any> {
  if (typeof window !== 'undefined') {
    return { 
      jsHeapSizeLimit: 'N/A (Browser)', 
      totalJSHeapSize: 'N/A (Browser)',
      usedJSHeapSize: 'N/A (Browser)' 
    };
  }
  
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memoryUsage = process.memoryUsage();
    return {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    };
  }
  
  return { memoryUsage: 'Not available' };
}

/**
 * Debug helper to log component render counts
 * Use this in the useEffect of a component to track how often it re-renders
 * 
 * @example
 * // In a React component
 * useEffect(() => {
 *   trackRender('DashboardComponent');
 *   return () => untrackRender('DashboardComponent');
 * });
 */
const renderCounts: Record<string, number> = {};

export function trackRender(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
  
  if (renderCounts[componentName] > 5) {
    logger.warn(`Component ${componentName} has rendered ${renderCounts[componentName]} times`);
  } else {
    logger.debug(`Component ${componentName} render #${renderCounts[componentName]}`);
  }
}

export function untrackRender(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  delete renderCounts[componentName];
}

/**
 * Create a performance debugging object to include in React components
 * @example
 * const debugPerf = createPerformanceDebugger('MyComponent');
 * useEffect(() => {
 *   debugPerf.trackRender();
 *   debugPerf.startTiming('data-fetch');
 *   fetchData().then(() => {
 *     debugPerf.endTiming('data-fetch');
 *   });
 *   return () => debugPerf.cleanup();
 * }, []);
 */
export function createPerformanceDebugger(componentName: string) {
  // Only active in development
  const isDev = process.env.NODE_ENV === 'development';
  const timingKeys: Record<string, number> = {};
  let renderCount = 0;
  
  return {
    trackRender: () => {
      if (!isDev) return;
      renderCount++;
      if (renderCount > 5) {
        logger.warn(`[${componentName}] Rendered ${renderCount} times`);
      }
    },
    
    startTiming: (key: string) => {
      if (!isDev) return;
      const fullKey = `${componentName}.${key}`;
      timingKeys[key] = performance.now();
      logger.debug(`[${componentName}] Started timing: ${key}`);
    },
    
    endTiming: (key: string) => {
      if (!isDev) return 0;
      if (!timingKeys[key]) {
        logger.warn(`[${componentName}] No timing started for: ${key}`);
        return 0;
      }
      
      const duration = performance.now() - timingKeys[key];
      delete timingKeys[key];
      
      if (duration > 1000) {
        logger.warn(`[${componentName}] SLOW: ${key} took ${duration.toFixed(1)}ms`);
      } else {
        logger.debug(`[${componentName}] ${key} took ${duration.toFixed(1)}ms`);
      }
      
      return duration;
    },
    
    cleanup: () => {
      if (!isDev) return;
      renderCount = 0;
      Object.keys(timingKeys).forEach(key => {
        logger.warn(`[${componentName}] Timing '${key}' was never ended`);
        delete timingKeys[key];
      });
    }
  };
}

/**
 * Measure network performance of requests for debugging
 */
export function measureRequestPerformance() {
  if (typeof window === 'undefined' || !window.performance || !window.performance.getEntriesByType) {
    return { message: 'Performance API not available' };
  }
  
  const resources = window.performance.getEntriesByType('resource');
  
  // Group by resource type
  const byType: Record<string, any[]> = {};
  resources.forEach(resource => {
    const r = resource as PerformanceResourceTiming;
    const type = r.initiatorType;
    
    if (!byType[type]) {
      byType[type] = [];
    }
    
    byType[type].push({
      name: r.name,
      duration: r.duration.toFixed(1) + 'ms',
      size: r.transferSize ? (r.transferSize / 1024).toFixed(1) + 'KB' : 'unknown',
      startTime: r.startTime.toFixed(1) + 'ms'
    });
  });
  
  // Find slow resources (taking more than 500ms)
  const slowResources = resources
    .filter(r => r.duration > 500)
    .map(r => ({
      name: r.name,
      type: (r as PerformanceResourceTiming).initiatorType,
      duration: r.duration.toFixed(1) + 'ms'
    }));
  
  return {
    resourcesByType: byType,
    slowResources,
    totalResources: resources.length
  };
}

/**
 * Export all debug utilities
 */
export default {
  startTiming,
  endTiming,
  timeFunction,
  getMemoryUsage,
  trackRender,
  untrackRender,
  createPerformanceDebugger,
  measureRequestPerformance
}; 