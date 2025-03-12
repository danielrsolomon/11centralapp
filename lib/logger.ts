/**
 * Logger Utility
 * 
 * This module provides a centralized logging utility for the application
 * with environment-based log levels and structured logging.
 */

// Log levels enum
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Extended log options with support for error handling properties
export interface LogOptions {
  component?: string;
  // Allow for any custom properties needed by error handling
  [key: string]: any;
}

// Current log level based on environment
const getCurrentLogLevel = (): LogLevel => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  } else {
    // Client-side
    return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }
};

const LOG_LEVEL = getCurrentLogLevel();

// Check if we should log based on the current level
const shouldLog = (level: LogLevel): boolean => {
  return level >= LOG_LEVEL;
};

/**
 * Format log message with timestamp and additional options
 */
const formatLogMessage = (message: string, options?: LogOptions): string => {
  const timestamp = new Date().toISOString();
  const component = options?.component ? `[${options.component}]` : '';
  return `[${timestamp}]${component} ${message}`;
};

/**
 * Format options for console output
 */
const formatOptions = (options?: LogOptions): any => {
  if (!options) return undefined;
  
  // Clone options to avoid modifying the original
  const formattedOptions = { ...options };
  
  // Clean up component as it's already in the message
  delete formattedOptions.component;
  
  return Object.keys(formattedOptions).length > 0 ? formattedOptions : undefined;
};

/**
 * Generic log function
 */
const log = (
  level: LogLevel,
  message: string,
  error?: Error,
  options?: LogOptions
): void => {
  if (!shouldLog(level)) return;

  const formattedMessage = formatLogMessage(message, options);
  const formattedOptions = formatOptions(options);

  switch (level) {
    case LogLevel.DEBUG:
      if (formattedOptions) {
        console.debug(formattedMessage, formattedOptions);
      } else {
        console.debug(formattedMessage);
      }
      break;
    case LogLevel.INFO:
      if (formattedOptions) {
        console.info(formattedMessage, formattedOptions);
      } else {
        console.info(formattedMessage);
      }
      break;
    case LogLevel.WARN:
      if (error) {
        console.warn(formattedMessage, error, formattedOptions);
      } else if (formattedOptions) {
        console.warn(formattedMessage, formattedOptions);
      } else {
        console.warn(formattedMessage);
      }
      break;
    case LogLevel.ERROR:
      if (error) {
        console.error(formattedMessage, error, formattedOptions);
      } else if (formattedOptions) {
        console.error(formattedMessage, formattedOptions);
      } else {
        console.error(formattedMessage);
      }
      break;
  }
};

// Public API
const logger = {
  /**
   * Log debug message
   */
  debug: (message: string, options?: LogOptions): void => {
    log(LogLevel.DEBUG, message, undefined, options);
  },

  /**
   * Log info message
   */
  info: (message: string, options?: LogOptions): void => {
    log(LogLevel.INFO, message, undefined, options);
  },

  /**
   * Log warning message
   */
  warn: (message: string, options?: LogOptions): void => {
    log(LogLevel.WARN, message, undefined, options);
  },

  /**
   * Log error message with optional Error object
   */
  error: (message: string, error?: Error, options?: LogOptions): void => {
    log(LogLevel.ERROR, message, error, options);
  },

  /**
   * Log database operation
   */
  db: (operation: string, table: string, details?: any): void => {
    log(
      LogLevel.DEBUG,
      `DB: ${operation} ${table}`,
      undefined,
      { component: 'db', details }
    );
  },

  /**
   * Log performance metric
   */
  perf: (label: string, durationMs: number): void => {
    const level = durationMs > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    log(
      level,
      `PERF: ${label} took ${durationMs.toFixed(2)}ms`,
      undefined,
      { component: 'performance', duration: durationMs }
    );
  }
};

export default logger; 