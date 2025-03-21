/**
 * Test Utilities for API Testing
 * 
 * This module provides utility functions for API testing, including:
 * - Mock session storage
 * - Test user creation/cleanup
 * - Request helpers
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Mock session storage for testing
export class MockSessionStorage {
  constructor() {
    this.sessions = new Map();
  }

  async storeUserSession(userId, sessionData) {
    this.sessions.set(userId, sessionData);
    return true;
  }

  async getUserSession(userId) {
    return this.sessions.get(userId) || null;
  }

  async removeUserSession(userId) {
    this.sessions.delete(userId);
    return true;
  }

  clear() {
    this.sessions.clear();
  }
}

// Create a test user with Supabase
export async function createTestUser(supabaseUrl, supabaseKey, userData) {
  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Generate a random password if not provided
  const password = userData.password || crypto.randomBytes(10).toString('hex');
  
  // Create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password,
    email_confirm: true
  });
  
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
  
  return {
    id: data.user.id,
    email: data.user.email,
    password
  };
}

// Delete a test user with Supabase
export async function deleteTestUser(supabaseUrl, supabaseKey, userId) {
  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Delete the user
  const { error } = await supabase.auth.admin.deleteUser(userId);
  
  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`);
  }
  
  return true;
}

// Generate a JWT token for testing (without actually using Supabase)
export function generateMockJwt(payload, secret = 'test-secret') {
  // Create header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Current timestamp in seconds
  const now = Math.floor(Date.now() / 1000);
  
  // Complete payload with timing claims
  const completePayload = {
    ...payload,
    iat: now,
    exp: now + 3600 // Expires in 1 hour
  };
  
  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(completePayload)).toString('base64url');
  
  // Create signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  // Return complete JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
} 