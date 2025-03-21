# E11EVEN Central API

This directory contains the API routes and middleware for the E11EVEN Central App.

## Structure

```
/api
├── middleware/                # Middleware functions
│   ├── auth.ts               # Authentication and authorization
│   ├── validation.ts         # Request validation using Zod
│   └── error-handler.ts      # Error handling
│
├── routes/                    # API route modules
│   ├── index.ts              # Main router
│   ├── auth/                 # Authentication routes
│   ├── university/           # LMS routes
│   ├── chat/                 # Messaging routes
│   ├── schedule/             # Scheduling routes
│   ├── gratuity/             # Gratuity tracking routes
│   └── admin/                # Admin routes
│
├── index.ts                   # Main API entry point
└── supabaseAdmin.ts           # Supabase admin client
```

## Usage

The API is designed to be used with Express.js and Supabase. To use the API, you'll need to install the following dependencies:

```bash
npm install express cors body-parser zod
```

## API Responses

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": { ... }  // Optional
  }
}
```

## Authentication

All protected routes require a valid Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## Route Documentation

Each route module has JSDoc comments that describe the route, parameters, and access control.

## Dependencies

- Express.js: Web framework
- Zod: Request validation
- Supabase: Database and authentication
- CORS: Cross-Origin Resource Sharing
- Body Parser: Request body parsing 