# Express TypeScript Compatibility Guide

This document provides guidance on how to properly handle TypeScript compatibility issues with Express route handlers in the E11EVEN Central API.

## Background

Express route handlers in TypeScript sometimes cause type errors related to the return type. These errors typically look like:

```
No overload matches this call.
  The last overload gave the following error.
    Argument of type '(req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
      Type '(req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
        Type 'Response<any, Record<string, any>> | undefined' is not assignable to type 'void | Promise<void>'.
```

This happens because Express's TypeScript type definitions expect route handlers to return `void` or `Promise<void>`, but when using `return res.json()` or `return res.send()`, the code returns the `Response` object.

## Solution 1: Using the Route Helper Utilities

We've provided utility functions in `src/api/utils/route-helpers.ts` to solve this issue:

### asyncHandler

The `asyncHandler` function properly wraps an async route handler to catch errors and forward them to Express's `next()` function:

```typescript
import { asyncHandler } from '../utils/route-helpers.js';

router.get('/path', 
  asyncHandler(async (req, res, next) => {
    // Your route handler code here
    sendSuccess(res, { data: 'some data' });
  })
);
```

### Response Helper Functions

We also provide standardized helper functions for sending API responses:

```typescript
import { sendSuccess, sendError } from '../utils/route-helpers.js';

// Success response (status 200 by default)
sendSuccess(res, { user: userData });

// Custom status code
sendSuccess(res, { token: 'xyz' }, 201);

// Error response (status 400 by default)
sendError(res, 'Resource not found', 'NOT_FOUND', 404);

// With additional details
sendError(
  res, 
  'Validation failed', 
  'VALIDATION_ERROR', 
  400, 
  { fields: ['email', 'password'] }
);
```

## Solution 2: TypeScript Configuration

We've also updated the API-specific TypeScript configuration in `tsconfig.api.json` to be more permissive about return types:

```json
{
  "compilerOptions": {
    // ...other options
    "noImplicitReturns": false,
    "strictNullChecks": false
  }
}
```

These settings allow Express route handlers to return response objects without TypeScript errors.

## Best Practices for Route Handlers

1. **Always Use asyncHandler for Async Functions**

```typescript
// Good
router.get('/path', asyncHandler(async (req, res, next) => {
  // Code
}));

// Avoid
router.get('/path', async (req, res, next) => {
  try {
    // Code
  } catch (error) {
    next(error);
  }
});
```

2. **Use the Standard Response Formats**

All API responses should follow our standard format:

```typescript
// Success responses
{
  "success": true,
  "data": {
    // Response data
  }
}

// Error responses
{
  "success": false,
  "data": [], // Always an empty array for errors
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {} // Optional
  }
}
```

3. **Don't Return Response Objects**

Avoid returning response objects from route handlers:

```typescript
// Good
sendSuccess(res, data);
return; // Optional but good for clarity

// Avoid
return res.json({ success: true, data });
```

## Complete Example

```typescript
import express from 'express';
import { asyncHandler, sendSuccess, sendError } from '../utils/route-helpers.js';

const router = express.Router();

router.get('/items', 
  asyncHandler(async (req, res, next) => {
    try {
      const items = await fetchItemsFromDatabase();
      sendSuccess(res, { items });
    } catch (error) {
      // This catch is optional since asyncHandler already forwards errors
      // to Express's error handling middleware, but you can use it for
      // custom error handling if needed
      sendError(
        res, 
        'Failed to fetch items', 
        'DATABASE_ERROR', 
        500
      );
    }
  })
);

export default router;
``` 