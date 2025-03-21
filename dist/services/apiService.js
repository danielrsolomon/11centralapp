"use strict";
/**
 * API Service
 *
 * This service provides utility functions for making API calls to the backend.
 * It handles common operations like request formatting, error handling, and authentication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
exports.apiRequest = apiRequest;
/**
 * Make an API request to the E11EVEN Central API
 */
async function apiRequest(endpoint, options = {}) {
    const { method = 'GET', headers = {}, body, signal } = options;
    // Default headers
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    try {
        // Build request options
        const requestOptions = {
            method,
            headers: { ...defaultHeaders, ...headers },
            signal,
            credentials: 'include', // Include cookies for auth
        };
        // Add body for non-GET requests
        if (method !== 'GET' && body !== undefined) {
            requestOptions.body = JSON.stringify(body);
        }
        // Make the request
        const response = await fetch(`/api${endpoint}`, requestOptions);
        // Handle empty responses or non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error(`API: Invalid response format for ${endpoint}. Content-Type: ${contentType}`);
            return {
                success: false,
                error: {
                    message: 'Invalid response format',
                    details: `Expected JSON but received ${contentType || 'unknown content type'}`,
                    code: 'INVALID_RESPONSE_FORMAT'
                }
            };
        }
        // Parse response with try/catch to handle malformed JSON
        let data;
        try {
            const text = await response.text();
            if (!text || text.trim() === '') {
                console.error(`API: Empty response body for endpoint ${endpoint}`);
                return {
                    success: false,
                    error: {
                        message: 'Empty response from server',
                        details: 'The server returned an empty response body',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }
            try {
                data = JSON.parse(text);
            }
            catch (parseError) {
                console.error(`API: JSON parse error for endpoint ${endpoint}:`, parseError);
                console.error(`API: Response text was: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
                return {
                    success: false,
                    error: {
                        message: 'Failed to parse JSON response',
                        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
                        code: 'JSON_PARSE_ERROR'
                    }
                };
            }
        }
        catch (textError) {
            console.error(`API: Error reading response text for endpoint ${endpoint}:`, textError);
            return {
                success: false,
                error: {
                    message: 'Failed to read response',
                    details: textError instanceof Error ? textError.message : 'Unknown error reading response',
                    code: 'RESPONSE_READ_ERROR'
                }
            };
        }
        // Check for required response structure (success field)
        if (data && typeof data === 'object' && !('success' in data)) {
            console.error(`API: Response missing 'success' field for ${endpoint}:`, data);
            // Attempt to handle legacy or inconsistent API responses
            // If data looks like a direct array or object, wrap it in our expected format
            return {
                success: true,
                data: data
            };
        }
        // Handle API error responses
        if (!response.ok || (data && data.success === false)) {
            return {
                success: false,
                error: {
                    message: data?.error?.message || data?.message || 'An error occurred',
                    details: data?.error?.details || data?.details || response.statusText,
                    code: data?.error?.code || data?.code || response.status.toString()
                }
            };
        }
        // Return successful response
        return {
            success: true,
            data: data?.data ?? data // Fall back to full response if no data field
        };
    }
    catch (error) {
        // Handle network errors
        let errorMessage = 'Network error';
        let errorDetails = 'Unknown error';
        let errorCode = 'NETWORK_ERROR';
        if (error instanceof Error) {
            errorMessage = error.message;
            errorDetails = error.stack || 'No stack trace available';
            if (error.name === 'AbortError') {
                errorCode = 'REQUEST_ABORTED';
                errorMessage = 'Request was aborted';
            }
        }
        console.error(`API: Network error for ${endpoint}:`, error);
        return {
            success: false,
            error: {
                message: errorMessage,
                details: errorDetails,
                code: errorCode
            }
        };
    }
}
/**
 * API utility methods for common operations
 */
exports.api = {
    get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
    patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
    delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' })
};
exports.default = exports.api;
//# sourceMappingURL=apiService.js.map