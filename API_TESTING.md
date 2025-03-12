# API Testing for E11EVEN Central Platform

This document outlines how to test the API endpoints of the E11EVEN Central Platform, with a focus on the Learning Management System (LMS) API.

## Prerequisites

1. Node.js 18+ installed
2. Next.js development server running (`npm run dev`)
3. Valid Supabase credentials in `.env.local`
4. A test user account in your Supabase auth system

## Test Scripts

### Program Creation and API Verification Test

The `test-create-program.js` script provides an end-to-end test of the `/api/learning/programs` endpoint by:

1. Creating a test department (if needed)
2. Creating a test program
3. Verifying the API returns the new program correctly
4. Cleaning up test data

#### Setup

Before running the test, make sure to:

1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Configure the test script by editing the following variables at the top of `test-create-program.js`:
   ```javascript
   const TEST_PREFIX = 'TEST_';  // Prefix for test data to identify it easily
   const TEST_USER_EMAIL = 'your_test_user@example.com';  // Replace with a valid test user
   const TEST_USER_PASSWORD = 'your_password';  // Replace with correct password
   ```

3. Ensure your test user exists in Supabase auth

4. Make sure your `.env.local` file contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

#### Running the Test

1. Start the Next.js development server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, run the test:
   ```bash
   node test-create-program.js
   ```

3. Watch the output for test results and any errors

#### Command-line Options

The test script supports the following command-line options:

```
Usage:
  node test-create-program.js [options]

Options:
  --skip-cleanup, -s   Skip cleanup of test data (useful for debugging)
  --help, -h           Show this help message
```

Examples:
```bash
# Run the test with normal cleanup
node test-create-program.js

# Run the test but keep the test data for debugging
node test-create-program.js --skip-cleanup

# Show help information
node test-create-program.js --help
```

#### Expected Output

A successful test will show:
- Creation of test department (or finding an existing one)
- Successful creation of a test program
- Authentication with the test user (or fallback to admin mode)
- Successful verification from both direct database access and API endpoint
- Cleanup of test data

Example success output:
```
[12:34:56] 🚀 Starting Program Creation and API Verification Test
[12:34:56] 📂 Checking for test department...
[12:34:56] ✅ Found existing test department
[12:34:57] 🆕 Creating test program...
[12:34:57] ✅ Created test program
[12:34:58] 🔑 Signing in as test@example.com...
[12:34:58] ✅ Authentication successful
[12:34:58] ✅ User already has access to department
[12:34:59] 🔍 Testing /api/learning/programs endpoint...
[12:35:00] ✅ Found 1 programs via REST API
[12:35:00] ✅ Successfully found our test program via REST API
[12:35:00] 📡 Fetching from endpoint: http://localhost:3000/api/learning/programs
[12:35:01] 📡 API Response Status: 200
[12:35:01] ✅ API returned 1 programs
[12:35:01] ✅ SUCCESS: Our test program was found in the API response
[12:35:01] 🧹 Cleaning up test data...
[12:35:02] ✅ Successfully deleted test program
[12:35:02] 🏁 Test completed
```

#### Troubleshooting

If the test fails, check:

1. **Authentication errors**: Make sure the test user credentials are correct
2. **Database errors**: Ensure the `programs` and `departments` tables exist with the expected schema
3. **API errors**: Check the server logs for errors during API calls
4. **Permission errors**: Ensure the test user has appropriate roles to access departments and programs

### Other API Tests

For testing other API endpoints, follow the same pattern:
1. Create test data using the admin client
2. Authenticate as a regular user
3. Call the API endpoint
4. Verify the response
5. Clean up test data

## Debugging Database Schema

If you encounter schema-related errors, use the following SQL query to inspect table structures:

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table_name';
```

You can run this via the Supabase SQL Editor or using the `execute_raw_query` function:

```javascript
const { data, error } = await adminClient.rpc('execute_raw_query', {
  query_text: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'programs'",
  query_params: '[]'
});
``` 