#!/usr/bin/env node

/**
 * Authentication Fix Testing Tool
 * 
 * This script allows you to test the server-side authentication fixes
 * with a real JWT token to verify proper token extraction and validation.
 * 
 * Usage:
 *   node src/api/tools/test-auth.js <token>
 * 
 * Where <token> is a valid JWT token from a logged-in user
 */

// Ensure we have localStorage even in Node
if (typeof global !== 'undefined' && !global.localStorage) {
  const memoryStore = new Map();
  global.localStorage = {
    getItem: (key) => memoryStore.get(key) || null,
    setItem: (key, value) => memoryStore.set(key, value),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
    get length() { return memoryStore.size; },
    key: (n) => Array.from(memoryStore.keys())[n] || null
  };
  console.log('Added localStorage polyfill to global scope');
}

// Get the token from command line args
const token = process.argv[2];

if (!token) {
  console.error('Error: No token provided');
  console.error('Usage: node test-auth.js <token>');
  console.error('Where <token> is a valid JWT token from a logged-in user');
  process.exit(1);
}

/**
 * Basic JWT token validation without dependencies
 */
function validateToken(token) {
  try {
    // Basic structure validation
    if (!token || typeof token !== 'string' || !token.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      return { valid: false, userId: null, error: 'Invalid token format' };
    }
    
    // Extract the payload
    const base64Payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    
    // Check if token has basic required fields
    if (!payload || !payload.sub) {
      return { valid: false, userId: null, error: 'Invalid token payload - missing sub field' };
    }
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, userId: null, error: 'Token expired' };
    }
    
    return { valid: true, userId: payload.sub, payload };
  } catch (error) {
    return { valid: false, userId: null, error: error.message || 'Unknown error' };
  }
}

// Validate the token
const result = validateToken(token);

// Display results
console.log('\n=== Token Validation Results ===\n');

if (result.valid) {
  console.log('✅ Token is valid');
  console.log(`User ID: ${result.userId}`);
  
  if (result.payload) {
    console.log('\nToken payload:');
    console.log(JSON.stringify(result.payload, null, 2));
    
    // Check for user information in claims
    const hasUserInfo = result.payload.email || result.payload.name || result.payload.user_metadata;
    if (hasUserInfo) {
      console.log('\n✅ Token contains user information that can be used for fallback authentication');
    } else {
      console.log('\n⚠️ Token does not contain user information for fallback authentication');
    }
    
    // Check expiration
    if (result.payload.exp) {
      const expiresAt = new Date(result.payload.exp * 1000);
      const now = new Date();
      const timeRemaining = expiresAt - now;
      
      console.log(`\nToken expires at: ${expiresAt.toISOString()}`);
      if (timeRemaining > 0) {
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Time remaining: ${hoursRemaining}h ${minutesRemaining}m`);
      } else {
        console.log('⚠️ Token has expired');
      }
    } else {
      console.log('\n⚠️ Token does not contain expiration information');
    }
  }
  
  // Create fallback user from token payload
  const payload = result.payload || {};
  const fallbackUser = {
    id: result.userId,
    email: payload.email || `${result.userId}@example.com`,
    roles: payload.roles || ['user'],
    role: payload.roles && payload.roles.length > 0 ? payload.roles[0] : 'user'
  };
  
  console.log('\nFallback user object that would be created:');
  console.log(JSON.stringify(fallbackUser, null, 2));
  
} else {
  console.log('❌ Token is invalid');
  console.log(`Error: ${result.error}`);
}

console.log('\n=== End of Test ===\n'); 