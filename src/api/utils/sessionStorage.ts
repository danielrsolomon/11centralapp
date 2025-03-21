/**
 * Session Storage Utilities for Server-Side Session Management
 * 
 * This module provides an interface for storing and retrieving session data
 * on the server side. It currently uses an in-memory implementation but is
 * designed to be replaceable with a persistent storage solution like Redis.
 */

export interface SessionStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * In-memory storage implementation for session data.
 * Note: This is not persistent across server restarts or multiple instances.
 */
class InMemorySessionStorage implements SessionStorageInterface {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    console.log(`[SessionStorage] Getting item with key: ${key}`);
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    console.log(`[SessionStorage] Setting item with key: ${key}`);
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    console.log(`[SessionStorage] Removing item with key: ${key}`);
    this.storage.delete(key);
  }
}

// Create and export the default session storage instance
const sessionStorage = new InMemorySessionStorage();
export default sessionStorage;

/**
 * Function to generate a storage key for a user session
 * @param userId The user ID to generate a storage key for
 * @returns A storage key string
 */
export function getUserSessionKey(userId: string): string {
  return `user_session:${userId}`;
}

/**
 * Function to store a user's session
 * @param userId The user ID
 * @param sessionData The session data to store (will be JSON stringified)
 */
export async function storeUserSession(userId: string, sessionData: any): Promise<void> {
  const key = getUserSessionKey(userId);
  await sessionStorage.setItem(key, JSON.stringify(sessionData));
}

/**
 * Function to retrieve a user's session
 * @param userId The user ID
 * @returns The parsed session data or null if not found
 */
export async function getUserSession(userId: string): Promise<any | null> {
  const key = getUserSessionKey(userId);
  const data = await sessionStorage.getItem(key);
  
  if (!data) {
    return null;
  }
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error(`[SessionStorage] Error parsing session data for user ${userId}:`, error);
    return null;
  }
}

/**
 * Function to remove a user's session
 * @param userId The user ID
 */
export async function removeUserSession(userId: string): Promise<void> {
  const key = getUserSessionKey(userId);
  await sessionStorage.removeItem(key);
} 