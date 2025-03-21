/**
 * Global localStorage Polyfill for Node.js
 * 
 * This file provides a global localStorage implementation for Node.js environments
 * to prevent "localStorage is not defined" errors. This must be required as early
 * as possible in the application startup process.
 */

// Create a memory-based storage
const memoryStore = new Map();

// Define localStorage polyfill
const localStoragePolyfill = {
  clear: () => {
    console.log('[Global Storage] localStorage.clear()');
    memoryStore.clear();
  },
  getItem: (key) => {
    console.log(`[Global Storage] localStorage.getItem('${key}')`);
    return memoryStore.get(key) || null;
  },
  key: (index) => {
    console.log(`[Global Storage] localStorage.key(${index})`);
    const keys = Array.from(memoryStore.keys());
    return keys[index] || null;
  },
  removeItem: (key) => {
    console.log(`[Global Storage] localStorage.removeItem('${key}')`);
    memoryStore.delete(key);
  },
  setItem: (key, value) => {
    console.log(`[Global Storage] localStorage.setItem('${key}', '${value && value.length > 20 ? value.substring(0, 20) + '...' : value}')`);
    memoryStore.set(key, value);
  },
  // Add length property
  get length() {
    return memoryStore.size;
  }
};

// Apply the polyfill
if (typeof globalThis !== 'undefined') {
  if (!globalThis.localStorage) {
    console.log('[Global Storage] Applying localStorage polyfill to globalThis');
    try {
      // Use Object.defineProperty for better compatibility
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: localStoragePolyfill,
        writable: false
      });
    } catch (e) {
      console.warn('[Global Storage] Failed to define localStorage via defineProperty:', e);
      globalThis.localStorage = localStoragePolyfill;
    }
  } else {
    console.log('[Global Storage] globalThis.localStorage already exists');
  }
}

// Also apply to global
if (typeof global !== 'undefined') {
  if (!global.localStorage) {
    console.log('[Global Storage] Applying localStorage polyfill to global');
    try {
      Object.defineProperty(global, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: localStoragePolyfill,
        writable: false
      });
    } catch (e) {
      console.warn('[Global Storage] Failed to define localStorage via defineProperty:', e);
      global.localStorage = localStoragePolyfill;
    }
  } else {
    console.log('[Global Storage] global.localStorage already exists');
  }
}

// API that can be imported
module.exports = {
  getItem: localStoragePolyfill.getItem,
  setItem: localStoragePolyfill.setItem,
  removeItem: localStoragePolyfill.removeItem,
  clear: localStoragePolyfill.clear,
  key: localStoragePolyfill.key,
  get length() {
    return memoryStore.size;
  }
};

console.log('[Global Storage] localStorage polyfill loaded and ready'); 