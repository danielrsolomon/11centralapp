/**
 * Utility for standardized logging across the application
 * Provides different log levels and contextual information
 */
import performanceConfig from './performance.config'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  // Additional context information
  context?: Record<string, any>
  // Component or module name
  component?: string
  // Add timestamp to log
  timestamp?: boolean
}

// Default options
const defaultOptions: LogOptions = {
  timestamp: true
}

// Determine if we should log based on environment
const shouldLog = (level: LogLevel): boolean => {
  // Always log errors
  if (level === 'error') return true
  
  // In development, log everything
  if (process.env.NODE_ENV === 'development') return true
  
  // In production, don't log debug
  if (process.env.NODE_ENV === 'production' && level === 'debug') return false
  
  return true
}

// Format the log message with additional context
const formatLogMessage = (
  message: string,
  level: LogLevel,
  options: LogOptions = {}
): string => {
  const opts = { ...defaultOptions, ...options }
  const timestamp = opts.timestamp ? `[${new Date().toISOString()}]` : ''
  const component = opts.component ? `[${opts.component}]` : ''
  
  return `${timestamp} ${level.toUpperCase()} ${component} ${message}`
}

// Format context object for logging
const formatContext = (context?: Record<string, any>): string => {
  if (!context) return ''
  
  try {
    // Handle circular references and simplify output
    return JSON.stringify(context, (key, value) => {
      if (key === 'password' || key === 'token') return '[REDACTED]'
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]'
        seen.add(value)
      }
      return value
    }, 2)
  } catch (err) {
    return `[Context serialization error: ${err}]`
  }
}

// Set to track circular references
const seen = new Set()

// The logger object
const logger = {
  debug: (message: string, options?: LogOptions) => {
    if (!shouldLog('debug')) return
    const formattedMessage = formatLogMessage(message, 'debug', options)
    console.debug(formattedMessage)
    if (options?.context) console.debug(formatContext(options.context))
  },
  
  info: (message: string, options?: LogOptions) => {
    if (!shouldLog('info')) return
    const formattedMessage = formatLogMessage(message, 'info', options)
    console.info(formattedMessage)
    if (options?.context) console.info(formatContext(options.context))
  },
  
  warn: (message: string, options?: LogOptions) => {
    if (!shouldLog('warn')) return
    const formattedMessage = formatLogMessage(message, 'warn', options)
    console.warn(formattedMessage)
    if (options?.context) console.warn(formatContext(options.context))
  },
  
  error: (message: string, error?: Error, options?: LogOptions) => {
    if (!shouldLog('error')) return
    
    const formattedMessage = formatLogMessage(message, 'error', options)
    console.error(formattedMessage)
    
    if (error) {
      console.error(error)
    }
    
    if (options?.context) {
      console.error(formatContext(options.context))
    }
    
    // In the future, you could integrate with error reporting services here
    // if (process.env.NODE_ENV === 'production') {
    //   // Send to error reporting service
    // }
  },
  
  // Log database operations
  db: (operation: string, table: string, details?: any) => {
    // Only log DB operations based on config
    if (!performanceConfig.features.enableDbLogging) return
        
    console.log(`DB ${operation.toUpperCase()} on ${table}`, details || '')
  },
  
  // Log performance metrics
  perf: (action: string, durationMs: number) => {
    if (!performanceConfig.features.enablePerformanceMonitoring) return
    
    if (durationMs > performanceConfig.thresholds.verySlowOperation) {
      // Log very slow operations as errors
      logger.error(`CRITICAL PERFORMANCE: ${action} took ${durationMs.toFixed(1)}ms`)
    } else if (durationMs > performanceConfig.thresholds.slowOperation) {
      // Log slow operations as warnings
      logger.warn(`SLOW OPERATION: ${action} took ${durationMs.toFixed(1)}ms`)
    } else {
      logger.debug(`PERF: ${action} took ${durationMs.toFixed(1)}ms`)
    }
  }
}

export default logger 