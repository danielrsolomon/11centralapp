"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
/**
 * Middleware to validate request body against a Zod schema
 * @param schema - Zod schema to validate against
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body);
            // Replace the request body with the validated data
            req.body = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Format Zod validation errors
                const formattedErrors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        code: 'VALIDATION_ERROR',
                        details: formattedErrors
                    }
                });
            }
            // Handle unexpected errors
            console.error('Validation middleware error:', error);
            return res.status(500).json({
                error: {
                    message: 'Validation system error',
                    code: 'INTERNAL_ERROR'
                }
            });
        }
    };
};
exports.validateBody = validateBody;
/**
 * Middleware to validate request query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.query);
            // Replace the request query with the validated data
            req.query = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Format Zod validation errors
                const formattedErrors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    error: {
                        message: 'Query parameter validation error',
                        code: 'VALIDATION_ERROR',
                        details: formattedErrors
                    }
                });
            }
            // Handle unexpected errors
            console.error('Query validation middleware error:', error);
            return res.status(500).json({
                error: {
                    message: 'Validation system error',
                    code: 'INTERNAL_ERROR'
                }
            });
        }
    };
};
exports.validateQuery = validateQuery;
/**
 * Middleware to validate request parameters against a Zod schema
 * @param schema - Zod schema to validate against
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.params);
            // Replace the request params with the validated data
            req.params = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Format Zod validation errors
                const formattedErrors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    error: {
                        message: 'URL parameter validation error',
                        code: 'VALIDATION_ERROR',
                        details: formattedErrors
                    }
                });
            }
            // Handle unexpected errors
            console.error('URL parameter validation middleware error:', error);
            return res.status(500).json({
                error: {
                    message: 'Validation system error',
                    code: 'INTERNAL_ERROR'
                }
            });
        }
    };
};
exports.validateParams = validateParams;
//# sourceMappingURL=validation.js.map