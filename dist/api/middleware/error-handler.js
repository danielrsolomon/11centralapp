"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.createErrorResponse = createErrorResponse;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.throwApiError = throwApiError;
exports.sendApiError = sendApiError;
/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, statusCode = 400, code = 'API_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
/**
 * Create a standard error response to ensure consistent format
 * @param statusCode HTTP status code
 * @param message Error message
 * @param code Error code
 * @param details Additional error details
 * @returns Standardized error response object
 */
function createErrorResponse(statusCode = 500, message = 'Internal Server Error', code = 'INTERNAL_ERROR', details = null) {
    return {
        success: false,
        data: [], // Always include empty data array for consistency
        error: {
            code,
            message,
            details: details || undefined
        }
    };
}
/**
 * Central error handler middleware
 */
function errorHandler(err, req, res, next) {
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';
    let errorCode = 'INTERNAL_ERROR';
    let errorDetails = null;
    console.log('DEBUG - Error Handler Received:', {
        errorType: err.constructor.name,
        message: err.message,
        stack: err.stack?.substring(0, 200) + '...',
        isApiError: err instanceof ApiError
    });
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        errorMessage = err.message;
        errorCode = err.code || 'API_ERROR';
        errorDetails = err.details;
    }
    else if ('code' in err && typeof err.code === 'string') {
        // Handle Supabase PostgrestError
        const pgError = err;
        statusCode = 400;
        errorMessage = pgError.message || 'Database Error';
        errorCode = pgError.code;
        // Map common postgres error codes to user-friendly messages
        if (pgError.code === '23505') {
            errorMessage = 'A record with this information already exists';
            errorCode = 'DUPLICATE_RECORD';
        }
        else if (pgError.code === '23503') {
            errorMessage = 'Referenced record does not exist';
            errorCode = 'FOREIGN_KEY_VIOLATION';
        }
    }
    else if (err instanceof Error) {
        // Handle generic Error objects
        errorMessage = err.message || 'An unexpected error occurred';
        errorDetails = err.stack;
    }
    // For development only - more detailed error logging
    console.error(`API Error (${errorCode}):`, err);
    // Create a standardized error response
    const errorResponse = createErrorResponse(statusCode, errorMessage, errorCode, errorDetails);
    console.log('DEBUG - Final Error Response:', JSON.stringify(errorResponse, null, 2));
    res.status(statusCode).json(errorResponse);
}
/**
 * Not found handler middleware
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            code: 'NOT_FOUND'
        }
    });
}
/**
 * Helper function to throw API errors that will be caught by the error handler middleware
 * Use this in your route handlers when you need to stop execution and return an error response
 */
function throwApiError(message, statusCode = 400, code = 'API_ERROR', details) {
    throw new ApiError(message, statusCode, code, details);
}
/**
 * Helper function to send an API error response directly
 * Use this when you need more control over the response and don't want to throw an error
 */
function sendApiError(res, message, statusCode = 400, code = 'API_ERROR', details) {
    const errorResponse = {
        success: false,
        error: {
            message,
            code,
            // Only include details in non-production environments or for non-500 errors
            ...(process.env.NODE_ENV !== 'production' || statusCode !== 500) && details ? { details } : {}
        }
    };
    return res.status(statusCode).json(errorResponse);
}
//# sourceMappingURL=error-handler.js.map