/**
 * Authentication Flow Test Suite
 * 
 * This test suite verifies the complete authentication flow using the API
 * endpoints, ensuring that login, session validation, and logout work correctly.
 */

import fetch from 'node-fetch';
import { expect } from 'chai';

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'password123'
};

// Helper to make API requests
const api = {
  async post(endpoint, body, token = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return await response.json();
  },
  
  async get(endpoint, token = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    return await response.json();
  }
};

describe('Authentication Flow', function() {
  // Increase timeout for external API calls
  this.timeout(10000);
  
  // Store token between tests
  let authToken = null;
  
  describe('Login Process', () => {
    it('should reject login with invalid credentials', async () => {
      const result = await api.post('/api/auth/login', {
        email: TEST_USER.email,
        password: 'wrong-password'
      });
      
      expect(result.success).to.equal(false);
      expect(result.error).to.exist;
    });
    
    it('should login with valid credentials and return user and session', async () => {
      const result = await api.post('/api/auth/login', TEST_USER);
      
      expect(result.success).to.equal(true);
      expect(result.data).to.exist;
      expect(result.data.user).to.exist;
      expect(result.data.session).to.exist;
      expect(result.data.session.access_token).to.be.a('string');
      
      // Save token for subsequent tests
      authToken = result.data.session.access_token;
    });
  });
  
  describe('Session Validation', () => {
    it('should reject requests without a token', async () => {
      const result = await api.get('/api/auth/session');
      
      expect(result.success).to.equal(false);
      expect(result.error).to.exist;
      expect(result.error.code).to.equal('AUTH_ERROR');
    });
    
    it('should validate a valid token and return user data', async () => {
      // Skip if login failed
      if (!authToken) {
        this.skip();
        return;
      }
      
      const result = await api.get('/api/auth/session', authToken);
      
      expect(result.success).to.equal(true);
      expect(result.data).to.exist;
      expect(result.data.user).to.exist;
      expect(result.data.user.id).to.be.a('string');
      expect(result.data.session).to.exist;
    });
  });
  
  describe('User Data Access', () => {
    it('should retrieve user data with a valid token', async () => {
      // Skip if login failed
      if (!authToken) {
        this.skip();
        return;
      }
      
      const result = await api.get('/api/auth/user', authToken);
      
      expect(result.success).to.equal(true);
      expect(result.data).to.exist;
      expect(result.data.id).to.be.a('string');
      expect(result.data.email).to.equal(TEST_USER.email);
    });
  });
  
  describe('Logout Process', () => {
    it('should successfully logout with a valid token', async () => {
      // Skip if login failed
      if (!authToken) {
        this.skip();
        return;
      }
      
      const result = await api.post('/api/auth/logout', {}, authToken);
      
      expect(result.success).to.equal(true);
      expect(result.data).to.exist;
      expect(result.data.message).to.equal('Logged out successfully');
    });
    
    it('should invalidate the session after logout', async () => {
      // Skip if login failed
      if (!authToken) {
        this.skip();
        return;
      }
      
      const result = await api.get('/api/auth/session', authToken);
      
      expect(result.success).to.equal(false);
      expect(result.error).to.exist;
    });
  });
}); 