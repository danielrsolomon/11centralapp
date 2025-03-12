/**
 * Error Handling Utilities for Supabase API Calls
 * 
 * This module provides standardized error handling for Supabase operations
 * across the E11EVEN Central Platform application.
 */

import logger from './logger';
import { toast } from 'react-hot-toast';

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  CONNECTION = 'CONNECTION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  INFO = 'INFO',         // User can continue without action
  WARNING = 'WARNING',   // User should take action soon
  ERROR = 'ERROR',       // User needs to take action now
  CRITICAL = 'CRITICAL'  // User cannot continue
}

// Error structure that includes user-friendly information
export interface FormattedError {
  message: string;        // User-friendly message
  technicalDetails?: any; // Original error for logging
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;          // Optional error code
  actionable: boolean;    // Whether the user can do something about it
  actions?: {             // Potential actions user can take
    label: string;
    action: () => void;
  }[];
}

/**
 * Map technical Supabase error codes to user-friendly error categories
 */
function categorizeError(error: any): ErrorCategory {
  // No error
  if (!error) return ErrorCategory.UNKNOWN;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  // Authentication errors
  if (
    errorMessage.includes('jwt') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('auth') ||
    errorMessage.includes('token') ||
    errorMessage.includes('login') ||
    errorMessage.includes('password') ||
    errorMessage.includes('sign in') ||
    errorCode === '401' ||
    errorCode === 'PGRST301'
  ) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  // Authorization errors
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('not allowed') ||
    errorMessage.includes('access denied') ||
    errorMessage.includes('not authorized') ||
    errorMessage.includes('forbidden') ||
    errorCode === '403' ||
    errorCode === 'PGRST302'
  ) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  // Connection errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('offline')
  ) {
    return ErrorCategory.CONNECTION;
  }
  
  // Validation errors
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('constraint') ||
    errorMessage.includes('violates') ||
    errorMessage.includes('unique') ||
    errorMessage.includes('duplicate') ||
    errorCode === '422' ||
    errorCode === '400'
  ) {
    return ErrorCategory.VALIDATION;
  }
  
  // Not found errors
  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('no rows') ||
    errorCode === '404'
  ) {
    return ErrorCategory.NOT_FOUND;
  }
  
  // Server errors
  if (
    errorMessage.includes('server') ||
    errorMessage.includes('internal') ||
    errorCode.startsWith('5') ||
    errorCode === '500'
  ) {
    return ErrorCategory.SERVER;
  }
  
  // Default to unknown
  return ErrorCategory.UNKNOWN;
}

/**
 * Determine the severity of an error based on its category
 */
function determineSeverity(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      return ErrorSeverity.ERROR;
    
    case ErrorCategory.CONNECTION:
      return ErrorSeverity.WARNING;
    
    case ErrorCategory.VALIDATION:
      return ErrorSeverity.WARNING;
    
    case ErrorCategory.NOT_FOUND:
      return ErrorSeverity.INFO;
    
    case ErrorCategory.SERVER:
      return ErrorSeverity.ERROR;
    
    case ErrorCategory.UNKNOWN:
    default:
      return ErrorSeverity.ERROR;
  }
}

/**
 * Generate a user-friendly error message based on the error category
 */
function generateUserMessage(error: any, category: ErrorCategory): string {
  // If we have a user-friendly message directly from Supabase, use it
  if (error?.message && !error.message.includes('TypeError') && !error.message.includes('error code')) {
    return error.message;
  }
  
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication error. Please sign in again.';
    
    case ErrorCategory.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.';
    
    case ErrorCategory.CONNECTION:
      return 'Connection issue. Please check your internet connection and try again.';
    
    case ErrorCategory.VALIDATION:
      return 'The provided information is invalid or incomplete.';
    
    case ErrorCategory.NOT_FOUND:
      return 'The requested information could not be found.';
    
    case ErrorCategory.SERVER:
      return 'The server encountered an error. Our team has been notified.';
    
    case ErrorCategory.UNKNOWN:
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Determine if an error is actionable by the user
 */
function isActionable(category: ErrorCategory): boolean {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.CONNECTION:
    case ErrorCategory.VALIDATION:
      return true;
    
    case ErrorCategory.AUTHORIZATION:
    case ErrorCategory.NOT_FOUND:
    case ErrorCategory.SERVER:
    case ErrorCategory.UNKNOWN:
    default:
      return false;
  }
}

/**
 * Generate appropriate actions based on error category
 */
function generateActions(category: ErrorCategory): { label: string; action: () => void }[] {
  const actions: { label: string; action: () => void }[] = [];
  
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      actions.push({
        label: 'Sign In',
        action: () => window.location.href = '/auth/login'
      });
      break;
    
    case ErrorCategory.CONNECTION:
      actions.push({
        label: 'Retry',
        action: () => window.location.reload()
      });
      break;
    
    case ErrorCategory.VALIDATION:
      // No default actions for validation errors as they depend on the specific field
      break;
    
    default:
      // No default actions for other categories
      break;
  }
  
  return actions;
}

/**
 * Format a Supabase error into a standardized structure
 */
export function formatError(error: any): FormattedError {
  const category = categorizeError(error);
  const severity = determineSeverity(category);
  const message = generateUserMessage(error, category);
  const actionable = isActionable(category);
  const actions = generateActions(category);
  
  // Log the error appropriately based on severity
  switch (severity) {
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      logger.error(`Supabase error: ${message}`, error instanceof Error ? error : new Error(String(error)), { 
        component: 'errorHandler'
      });
      break;
    
    case ErrorSeverity.WARNING:
      logger.warn(`Supabase warning: ${message}`, { 
        component: 'errorHandler',
        details: error ? JSON.stringify(error) : 'No details'
      });
      break;
    
    case ErrorSeverity.INFO:
      logger.debug(`Supabase info: ${message}`, { 
        component: 'errorHandler',
        details: error ? JSON.stringify(error) : 'No details'
      });
      break;
  }
  
  return {
    message,
    technicalDetails: error,
    category,
    severity,
    code: error?.code,
    actionable,
    actions
  };
}

/**
 * Handle a Supabase error with standardized logging and notification
 */
export function handleError(error: any, context: string = 'operation', showToast: boolean = true): FormattedError {
  const formattedError = formatError(error);
  
  // Show toast notification if needed
  if (showToast) {
    toast.error(formattedError.message, {
      duration: formattedError.severity === ErrorSeverity.ERROR ? 5000 : 3000,
    });
  }
  
  return formattedError;
}

/**
 * Retry a function with exponential backoff for transient errors
 * @param fn Function to retry
 * @param retries Maximum number of retries
 * @param delay Initial delay in ms
 * @param shouldRetry Function to determine if error is retriable
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 300,
  shouldRetry: (error: any) => boolean = (error) => {
    const category = categorizeError(error);
    return category === ErrorCategory.CONNECTION;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !shouldRetry(error)) {
      throw error;
    }
    
    // Log retry attempt
    logger.debug(`Retrying after error (${retries} attempts left)`, { 
      component: 'errorHandler',
      retries
    });
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    return withRetry(fn, retries - 1, delay * 2, shouldRetry);
  }
}

/**
 * Wrap a Supabase operation with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string = 'operation',
  showToast: boolean = true
): Promise<{ data: T | null; error: FormattedError | null }> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      const formattedError = handleError(error, context, showToast);
      return { data: null, error: formattedError };
    }
    
    return { data, error: null };
  } catch (err) {
    const formattedError = handleError(err, context, showToast);
    return { data: null, error: formattedError };
  }
}

/**
 * Check if a specific error requires a session refresh
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code || '';
  
  return (
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('not authenticated') ||
    errorCode === '401' ||
    errorCode === 'PGRST301'
  );
}

/**
 * Check if an error is a network/connection error
 */
export function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = (error.message || '').toLowerCase();
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch') ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError'
  );
}

export default {
  formatError,
  handleError,
  withRetry,
  withErrorHandling,
  isAuthError,
  isConnectionError,
  ErrorCategory,
  ErrorSeverity
}; 