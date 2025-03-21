/**
 * Test user service - ONLY FOR DEVELOPMENT ENVIRONMENT
 * This service provides utilities for easily testing with predefined test users
 */

import { authService } from './authService';

interface TestUser {
  email: string;
  password: string;
  label: string;
}

// Available test users - matches server configuration
export const TEST_USERS: Record<string, TestUser> = {
  test: { 
    email: 'test@example.com', 
    password: 'password123', 
    label: 'Test User'
  },
  admin: { 
    email: 'admin@example.com', 
    password: 'admin123', 
    label: 'Admin User'
  },
  daniel: { 
    email: 'danielrsolomon@gmail.com', 
    password: 'password123', 
    label: 'Daniel Solomon'
  }
};

/**
 * Login with a test user
 * @param username - The test user to log in as
 * @returns Login result
 */
export const loginWithTestUser = async (username: string) => {
  // Safety check: Only allow in development
  if (import.meta.env.MODE !== 'development') {
    console.error('[TestUsers] Test user login attempted in non-development environment');
    return {
      error: {
        message: 'Test users can only be used in development mode'
      },
      data: null
    };
  }
  
  // Check if the requested test user exists
  if (!TEST_USERS[username]) {
    console.error(`[TestUsers] Unknown test user: ${username}`);
    return {
      error: {
        message: `Unknown test user: ${username}. Available test users: ${Object.keys(TEST_USERS).join(', ')}`
      },
      data: null
    };
  }
  
  const user = TEST_USERS[username];
  console.log(`[TestUsers] Logging in as test user: ${user.label}`);
  
  try {
    // Use the authService to sign in with the test user credentials
    const result = await authService.signInWithEmail(user.email, user.password);
    
    if (result.error) {
      console.error(`[TestUsers] Failed to login as test user: ${username}`, result.error);
    } else {
      console.log(`[TestUsers] Successfully logged in as test user: ${username}`);
    }
    
    return result;
  } catch (error) {
    console.error(`[TestUsers] Error logging in as test user: ${username}`, error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error logging in as test user',
      },
      data: null
    };
  }
}; 