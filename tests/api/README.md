# API Authentication Tests

This directory contains automated tests for the E11EVEN Central API authentication system, ensuring that the login, session management, and token validation processes function as expected.

## Available Tests

1. **Session Management Unit Tests** (`session-management.test.js`):
   - Tests session storage, retrieval, and expiration
   - Tests JWT token generation and validation
   - Operates in isolation with mock storages

2. **Authentication Flow Integration Tests** (`auth-flow.test.js`):
   - Tests the complete authentication flow from login to logout
   - Verifies API responses for protected and unprotected endpoints
   - Validates token validation and session management

## Running the Tests

### Prerequisites

- Node.js 16+
- npm 
- A running API server (`npm run api:start`)
- Valid Supabase credentials in your `.env.local` file

### Running All Authentication Tests

```bash
npm run test:auth
```

This command will:
1. Verify that your API server is running
2. Configure the test environment with the right variables
3. Run the authentication flow integration tests

### Running Individual Test Suites

For session management unit tests:
```bash
npm run test:auth:unit
```

For authentication flow integration tests:
```bash
npm run test:auth:integration
```

### Test Credentials

By default, the tests will use the following credentials:
- Email: `test@example.com`
- Password: `password123`

To override these, you can set the following environment variables:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## Troubleshooting

If tests are failing, check the following:

1. Is the API server running? Start it with `npm run api:start`.
2. Are your `.env.local` variables set correctly?
3. Does the test user exist in Supabase? 
4. For development environments, you can use the `/api/auth/dev-login` endpoint to test with predefined accounts.

## Extending the Tests

When adding new authentication features, please add corresponding tests to ensure they work as expected.

To add new tests:
1. Identify if your feature is a unit-level feature (add to session-management tests) or an API-level feature (add to auth-flow tests)
2. Follow the existing patterns for similar features
3. Use the test utils provided in `test-utils.js` for common functionality 