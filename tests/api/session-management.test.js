/**
 * Session Management Unit Tests
 * 
 * This test suite focuses on testing the session management functionality,
 * including storage, retrieval, expiration, and cleanup of user sessions.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { MockSessionStorage, generateMockJwt } from './test-utils.js';

// Mock user for testing
const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com'
};

// Import session storage functions directly
// In a real test, we would use rewire or proxyquire to import with mocks
// For this example, we'll mock them manually
let mockStorage;
const sessionStorage = {
  storeUserSession: async (userId, sessionData) => mockStorage.storeUserSession(userId, sessionData),
  getUserSession: async (userId) => mockStorage.getUserSession(userId),
  removeUserSession: async (userId) => mockStorage.removeUserSession(userId)
};

describe('Session Management', function() {
  beforeEach(() => {
    // Set up a fresh mock storage for each test
    mockStorage = new MockSessionStorage();
    
    // Reset the clock if it was used in previous tests
    if (this.clock) {
      this.clock.restore();
    }
  });
  
  after(() => {
    // Clean up sinon after all tests
    sinon.restore();
  });
  
  describe('Session Storage', () => {
    it('should store a user session with valid data', async () => {
      const sessionData = {
        access_token: 'valid-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      };
      
      const result = await sessionStorage.storeUserSession(TEST_USER.id, sessionData);
      expect(result).to.be.true;
      
      // Verify session was stored
      const storedSession = await sessionStorage.getUserSession(TEST_USER.id);
      expect(storedSession).to.deep.equal(sessionData);
    });
    
    it('should retrieve a stored session by user ID', async () => {
      const sessionData = {
        access_token: 'valid-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      };
      
      // Store the session
      await sessionStorage.storeUserSession(TEST_USER.id, sessionData);
      
      // Retrieve the session
      const result = await sessionStorage.getUserSession(TEST_USER.id);
      expect(result).to.exist;
      expect(result.access_token).to.equal(sessionData.access_token);
      expect(result.expires_at).to.equal(sessionData.expires_at);
    });
    
    it('should return null for non-existent sessions', async () => {
      const result = await sessionStorage.getUserSession('non-existent-user');
      expect(result).to.be.null;
    });
    
    it('should remove a session when requested', async () => {
      const sessionData = {
        access_token: 'valid-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      };
      
      // Store the session
      await sessionStorage.storeUserSession(TEST_USER.id, sessionData);
      
      // Remove the session
      const result = await sessionStorage.removeUserSession(TEST_USER.id);
      expect(result).to.be.true;
      
      // Verify session was removed
      const storedSession = await sessionStorage.getUserSession(TEST_USER.id);
      expect(storedSession).to.be.null;
    });
  });
  
  describe('Session Expiration', () => {
    it('should handle expired sessions correctly', async () => {
      // Create a clock to manipulate time
      this.clock = sinon.useFakeTimers(new Date());
      
      const currentTime = Date.now();
      const sessionData = {
        access_token: 'valid-token',
        expires_at: currentTime + 3600000 // 1 hour from now
      };
      
      // Store the session
      await sessionStorage.storeUserSession(TEST_USER.id, sessionData);
      
      // Advance time by 2 hours
      this.clock.tick(2 * 3600000);
      
      // Mock session validation logic
      const isSessionValid = (session) => {
        return session && session.expires_at > Date.now();
      };
      
      // Check if the session is valid
      const storedSession = await sessionStorage.getUserSession(TEST_USER.id);
      const valid = isSessionValid(storedSession);
      
      expect(valid).to.be.false;
      expect(storedSession.expires_at).to.be.lessThan(Date.now());
    });
    
    it('should be able to refresh and extend session expiration', async () => {
      // Initial session
      const initialSessionData = {
        access_token: 'valid-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      };
      
      // Store the session
      await sessionStorage.storeUserSession(TEST_USER.id, initialSessionData);
      
      // Mock token refresh - create a new token with extended expiration
      const refreshedSessionData = {
        access_token: 'refreshed-token',
        expires_at: Date.now() + 7200000 // 2 hours from now
      };
      
      // Update the session
      await sessionStorage.storeUserSession(TEST_USER.id, refreshedSessionData);
      
      // Verify session was updated
      const storedSession = await sessionStorage.getUserSession(TEST_USER.id);
      expect(storedSession.access_token).to.equal(refreshedSessionData.access_token);
      expect(storedSession.expires_at).to.equal(refreshedSessionData.expires_at);
    });
  });
  
  describe('JWT Token Generation and Validation', () => {
    it('should generate a valid JWT token with correct claims', () => {
      const payload = {
        sub: TEST_USER.id,
        email: TEST_USER.email,
        role: 'user'
      };
      
      const token = generateMockJwt(payload);
      
      // JWT should have three parts separated by dots
      const parts = token.split('.');
      expect(parts).to.have.lengthOf(3);
      
      // Decode the payload
      const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      // Verify claims
      expect(decodedPayload.sub).to.equal(TEST_USER.id);
      expect(decodedPayload.email).to.equal(TEST_USER.email);
      expect(decodedPayload.role).to.equal('user');
      expect(decodedPayload.iat).to.exist;
      expect(decodedPayload.exp).to.exist;
      expect(decodedPayload.exp - decodedPayload.iat).to.equal(3600); // 1 hour difference
    });
  });
}); 