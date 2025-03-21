import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Middleware to validate request against a Zod schema
 * @param schemas - Object containing Zod schemas for body, params, and/or query
 */
export const validateRequest = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: { [key: string]: any } = {};
      
      // Validate body if schema provided
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.body = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }));
        } else {
          req.body = result.data;
        }
      }
      
      // Validate query if schema provided
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.query = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }));
        } else {
          // Need to be careful with query as it might have read-only properties
          Object.assign(req.query, result.data);
        }
      }
      
      // Validate params if schema provided
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.params = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }));
        } else {
          // Need to be careful with params as it might have read-only properties
          Object.assign(req.params, result.data);
        }
      }
      
      // If there are any validation errors, return them
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: errors
          }
        });
      }
      
      next();
    } catch (error) {
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

/**
 * Middleware to validate request body against a Zod schema
 * @param schema - Zod schema to validate against
 */
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      // Replace the request body with the validated data
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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

/**
 * Middleware to validate request query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      // Replace the request query with the validated data
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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

/**
 * Middleware to validate request parameters against a Zod schema
 * @param schema - Zod schema to validate against
 */
export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      // Replace the request params with the validated data
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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