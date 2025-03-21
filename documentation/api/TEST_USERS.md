# Test Users Documentation

This document describes the test users available in the E11EVEN Central application and how to use them during development.

## Available Test Users

The following test users are available for development purposes:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| test | test@example.com | password123 | User |
| admin | admin@example.com | admin123 | Admin |
| daniel | danielrsolomon@gmail.com | password123 | User |

## Using Test Users

### In the Development UI

When running the application in development mode, the login page automatically displays a "Developer Test Accounts" section with buttons to quickly log in as any of the available test users.

### In Code

You can log in programmatically with a test user using the `loginWithTestUser` function from the test users service:

```typescript
import { loginWithTestUser } from '../services/testUsers';

// Login as the "test" user
const result = await loginWithTestUser('test');

// Login as the "admin" user
const result = await loginWithTestUser('admin');
```

This function will return the same result as a normal login attempt using the auth service.

## Adding New Test Users

To add a new test user, you need to:

1. Create the user in Supabase
2. Add the user to the `TEST_USERS` object in `src/services/testUsers.ts`
3. Add the user to the server-side `TEST_ACCOUNTS` object in `src/api/routes/auth.ts`
4. Update this documentation with the new user's details

## Important Notes

- Test users are only available in development mode (`import.meta.env.MODE === 'development'`).
- The passwords for test users should not be used for real accounts.
- Test users are not automatically created in Supabase - they must be created manually before they can be used.
- If you change a test user's credentials in Supabase, make sure to update the corresponding entries in the code.

## Security Notice

**NEVER** commit real user credentials to the codebase, even in test files. The test users documented here should use fake email addresses and should never have access to production data. 