# Testing Instructions for Content Service Refactoring

This document outlines steps to verify that the refactored university content and program API endpoints work correctly and no longer produce "Invalid response format" errors.

## Prerequisites

- Node.js and npm installed
- Supabase access (for backend testing)
- Access to the E11EVEN Central app codebase

## Starting the Development Server

1. Open a terminal in the project root directory
2. Install dependencies if needed: `npm install`
3. Start the development server: `npm run dev`
4. Wait for the server to start completely (you should see a message indicating the server is running)

## Testing the API Endpoints

### Backend Testing

Test the API endpoints directly using cURL, Postman, or your browser's developer tools:

#### 1. Test the Content Hierarchy Endpoint

```bash
curl http://localhost:3001/api/university/content/hierarchy -H "Authorization: Bearer YOUR_TOKEN"
```

Verify that the response is properly formatted as:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "type": "program",
      "children": [...]
    }
  ]
}
```

#### 2. Test the Programs Endpoint

```bash
curl http://localhost:3001/api/university/programs -H "Authorization: Bearer YOUR_TOKEN"
```

Verify that the response is properly formatted as:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "description": "..."
    }
  ]
}
```

#### 3. Test a Single Program Endpoint

```bash
curl http://localhost:3001/api/university/programs/PROGRAM_ID -H "Authorization: Bearer YOUR_TOKEN"
```

Replace `PROGRAM_ID` with a valid program ID from your database.

Example with a dummy program ID:

```bash
curl http://localhost:3001/api/university/programs/00000000-0000-0000-0000-000000000000 -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing

1. Open your browser and navigate to the E11EVEN University section:
   - Sign in to the application
   - Navigate to the University section where the content tree is displayed

2. Open browser developer tools (F12 or right-click > Inspect)
   - Go to the Network tab
   - Filter requests to show only XHR/fetch requests

3. Refresh the page and observe the requests to:
   - `/api/university/content/hierarchy`
   - `/api/university/programs`

4. Verify that:
   - The requests return HTTP status 200
   - Response bodies contain properly formatted JSON with `success: true` and a `data` array
   - No "Invalid response format" errors appear in the console or UI
   - The content tree displays correctly with all programs, courses, lessons, and modules

## Error Testing

To verify error handling, you can test with invalid requests:

1. Try accessing a non-existent program ID:
   ```bash
   curl http://localhost:3001/api/university/programs/00000000-0000-0000-0000-000000000000 -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Verify that the response contains a properly formatted error:
   ```json
   {
     "success": false,
     "error": {
       "message": "Program not found",
       "code": "PROGRAM_NOT_FOUND"
     }
   }
   ```

## Check Server Logs

Monitor the server logs while performing these tests to ensure:

1. All requests are properly logged
2. No unexpected errors appear in the logs
3. Response formatting is consistent

## Supabase Direct Verification

As a final step, you can verify the data in Supabase:

1. Log in to the Supabase dashboard
2. Go to the Table Editor and check the `programs`, `courses`, `lessons`, and `modules` tables
3. Verify that the data matches what's being returned by the API

## Success Criteria

The refactoring is successful if:

1. All API endpoints return properly structured responses with `success` and `data` properties
2. No "Invalid response format" errors appear in the UI
3. Error responses follow the same structure with `success: false` and an `error` object
4. The content tree UI displays all hierarchical content correctly
5. Server logs show no unexpected errors during normal operation

## Troubleshooting

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify that the `backendContentService` is properly importing Supabase
3. Check that all route handlers are using the new service methods
4. Verify that the response structure matches what the frontend expects 