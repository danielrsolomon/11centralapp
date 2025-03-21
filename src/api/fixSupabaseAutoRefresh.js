/**
 * Fixes for Supabase localStorage references in server environment
 * 
 * This script patches the Supabase auth module to prevent localStorage errors
 * that occur in a Node.js environment
 */

console.log('[FixStorage] Initializing Supabase localStorage fix');

// Override the localStorage in global scope with a memory-based implementation
// This prevents "localStorage is not defined" errors in a Node.js environment
const memoryStore = new Map();

// Create a localStorage-like implementation that uses memory instead
const memoryStorage = {
  getItem: (key) => {
    console.log(`[FixStorage] Memory storage getItem: ${key}`);
    return memoryStore.get(key) || null;
  },
  setItem: (key, value) => {
    console.log(`[FixStorage] Memory storage setItem: ${key}`);
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    console.log(`[FixStorage] Memory storage removeItem: ${key}`);
    memoryStore.delete(key);
  },
  clear: () => {
    console.log(`[FixStorage] Memory storage clear`);
    memoryStore.clear();
  },
  // Add length property to match localStorage API
  get length() {
    return memoryStore.size;
  },
  // Add key method to match localStorage API
  key: (index) => {
    const keys = Array.from(memoryStore.keys());
    return keys[index] || null;
  }
};

// Apply the fix to the global scope if running in Node.js
if (typeof global !== 'undefined') {
  if (!global.localStorage) {
    console.log('[FixStorage] Adding localStorage to global scope (first time)');
    try {
      Object.defineProperty(global, 'localStorage', {
        value: memoryStorage,
        writable: false,
        configurable: true
      });
    } catch (e) {
      console.error('[FixStorage] Failed to define localStorage on global:', e);
      // Fallback to direct assignment
      global.localStorage = memoryStorage;
    }
  } else {
    console.log('[FixStorage] Replacing existing localStorage in global scope');
    try {
      // Try-catch for environments where we can't redefine global properties
      global.localStorage = memoryStorage;
    } catch (e) {
      console.error('[FixStorage] Failed to replace localStorage:', e);
    }
  }
  
  // Verify the fix worked
  try {
    if (global.localStorage) {
      console.log('[FixStorage] localStorage is now available in global scope');
      global.localStorage.setItem('__test_localStorage', 'true');
      console.log('[FixStorage] Successfully stored test value in localStorage');
    } else {
      console.error('[FixStorage] localStorage is still not available in global scope');
    }
  } catch (e) {
    console.error('[FixStorage] Error testing localStorage:', e);
  }
}

// Function to disable auto-refresh on Supabase clients
function disableSupabaseAutoRefresh(client) {
  if (!client || !client.auth) {
    console.warn('[FixStorage] Cannot disable auto-refresh: invalid client');
    return;
  }

  try {
    // Disable any existing refresh interval
    if (client.auth._autoRefreshInterval) {
      clearInterval(client.auth._autoRefreshInterval);
      client.auth._autoRefreshInterval = null;
      console.log('[FixStorage] Disabled auto-refresh interval');
    }

    // Replace the auto-refresh token tick with a no-op function
    if (typeof client.auth._autoRefreshTokenTick === 'function') {
      client.auth._autoRefreshTokenTick = () => Promise.resolve();
      console.log('[FixStorage] Replaced autoRefreshTokenTick with no-op function');
    }

    // Disable any future attempts to start auto-refresh
    if (typeof client.auth._startAutoRefresh === 'function') {
      client.auth._startAutoRefresh = () => {
        console.log('[FixStorage] Prevented auto-refresh from starting');
      };
      console.log('[FixStorage] Replaced _startAutoRefresh with no-op function');
    }

    // Set refresh option to false
    if (client.auth.autoRefreshToken !== undefined) {
      client.auth.autoRefreshToken = false;
    }
    
    return true;
  } catch (error) {
    console.error('[FixStorage] Error disabling auto-refresh:', error);
    return false;
  }
}

module.exports = {
  memoryStorage,
  disableSupabaseAutoRefresh
};

console.log('[FixStorage] Supabase localStorage fix applied'); 