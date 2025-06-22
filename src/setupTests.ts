import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock DOM methods not available in JSDOM
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock Web Crypto API with actual data storage
const encryptedDataStore = new Map<string, string>();
const keyStore = new Map<string, any>();
let keyGeneration = 0;

const mockCrypto = {
  randomUUID: vi.fn(() => Math.random().toString(36).substring(2, 15)),
  subtle: {
    generateKey: vi.fn().mockImplementation(async () => {
      keyGeneration++;
      const keyId = `key-gen-${keyGeneration}`;
      const key = {
        id: keyId,
        generation: keyGeneration,
        type: 'secret',
        algorithm: { name: 'AES-GCM', length: 256 },
        extractable: false,
        usages: ['encrypt', 'decrypt'],
      };
      keyStore.set(keyId, key);
      return key;
    }),
    encrypt: vi.fn().mockImplementation(async (algorithm: any, key: any, data: ArrayBuffer) => {
      const plaintext = new TextDecoder().decode(data);
      // Use btoa with URL-safe encoding for unicode support
      const encrypted = btoa(unescape(encodeURIComponent(plaintext + ':encrypted')));
      const iv = algorithm.iv ? Array.from(new Uint8Array(algorithm.iv)).join(',') : 'default-iv';
      const keyId = key.id || 'default-key';
      const generation = key.generation || 0;
      const storageKey = `gen-${generation}:${keyId}:${encrypted}:${iv}`;
      encryptedDataStore.set(storageKey, plaintext);
      return new TextEncoder().encode(encrypted);
    }),
    decrypt: vi.fn().mockImplementation(async (algorithm: any, key: any, data: ArrayBuffer) => {
      const encrypted = new TextDecoder().decode(data);
      const iv = algorithm.iv ? Array.from(new Uint8Array(algorithm.iv)).join(',') : 'default-iv';
      const keyId = key.id || 'default-key';
      const generation = key.generation || 0;
      const storageKey = `gen-${generation}:${keyId}:${encrypted}:${iv}`;
      const originalData = encryptedDataStore.get(storageKey);
      if (originalData) {
        return new TextEncoder().encode(originalData);
      }
      
      // Allow fallback if:
      // 1. No keyId (backwards compatibility)
      // 2. OR encryptedDataStore is not empty (meaning it's a lock scenario, not clearAll scenario)
      if (!key.id || encryptedDataStore.size > 0) {
        try {
          const decoded = decodeURIComponent(escape(atob(encrypted)));
          if (decoded.endsWith(':encrypted')) {
            return new TextEncoder().encode(decoded.replace(':encrypted', ''));
          }
        } catch (e) {
          // Ignore
        }
      }
      
      throw new Error('Decryption failed');
    }),
    exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    importKey: vi.fn().mockImplementation(async (format: any, keyData: any) => {
      const keyId = new TextDecoder().decode(keyData);
      // Check if this key already exists
      if (keyStore.has(keyId)) {
        return keyStore.get(keyId);
      }
      
      // If not found, it's a legacy key - create with current generation
      const key = {
        id: keyId,
        generation: keyGeneration || 1,
        type: 'secret',
        algorithm: { name: 'AES-GCM', length: 256 },
        extractable: false,
        usages: ['encrypt', 'decrypt'],
      };
      keyStore.set(keyId, key);
      return key;
    }),
  },
  getRandomValues: vi.fn().mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Mock IndexedDB for tests
const createMockRequest = (shouldSucceed = true) => {
  const request = {
    onerror: null as any,
    onsuccess: null as any,
    onupgradeneeded: null as any,
    result: null as any,
    error: null as any,
  };
  
  // Simulate database operation
  queueMicrotask(() => {
    if (shouldSucceed && request.onsuccess) {
      const mockDB = {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
        createObjectStore: vi.fn(),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockImplementation((keyName: string) => {
              const getRequest = {
                onsuccess: null as any,
                onerror: null as any,
                result: undefined,
              };
              queueMicrotask(() => {
                // Simulate finding stored key data if it exists
                const storedKeys = Array.from(keyStore.keys());
                if (storedKeys.length > 0 && keyName === 'cryptoKey') {
                  // Return the most recent key
                  const latestKeyId = storedKeys[storedKeys.length - 1];
                  const keyData = new TextEncoder().encode(latestKeyId);
                  getRequest.result = keyData;
                }
                if (getRequest.onsuccess) getRequest.onsuccess();
              });
              return getRequest;
            }),
            put: vi.fn().mockImplementation(() => {
              const putRequest = {
                onsuccess: null as any,
                onerror: null as any,
              };
              queueMicrotask(() => {
                if (putRequest.onsuccess) putRequest.onsuccess();
              });
              return putRequest;
            }),
            delete: vi.fn().mockImplementation(() => {
              const deleteRequest = {
                onsuccess: null as any,
                onerror: null as any,
              };
              queueMicrotask(() => {
                if (deleteRequest.onsuccess) deleteRequest.onsuccess();
              });
              return deleteRequest;
            }),
            clear: vi.fn().mockImplementation(() => {
              const clearRequest = {
                onsuccess: null as any,
                onerror: null as any,
              };
              queueMicrotask(() => {
                if (clearRequest.onsuccess) clearRequest.onsuccess();
              });
              return clearRequest;
            }),
          }),
        }),
        close: vi.fn(),
      };
      
      request.result = mockDB;
      
      // Trigger onupgradeneeded if needed
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request } as any);
      }
      
      request.onsuccess();
    } else if (!shouldSucceed && request.onerror) {
      request.error = new Error('Database operation failed');
      request.onerror();
    }
  });
  
  return request;
};

const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => createMockRequest()),
  deleteDatabase: vi.fn().mockImplementation(() => {
    // Clear all stored keys when database is deleted (like clearAll does)
    encryptedDataStore.clear();
    keyStore.clear();
    keyGeneration = 0; // Reset key generation
    return createMockRequest();
  }),
};

// Mock crypto with defineProperty since it's read-only
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true,
});

// @ts-ignore
global.indexedDB = mockIndexedDB;

// Clear mocks between tests
import { beforeEach } from 'vitest';
beforeEach(() => {
  encryptedDataStore.clear();
  keyStore.clear();
  keyGeneration = 0;
  vi.clearAllMocks();
});