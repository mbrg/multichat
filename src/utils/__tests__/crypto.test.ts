/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Access the global object in tests
const globalAny: any = globalThis;
import { SecureStorage } from '../crypto';

// Test data
const testData = 'test-api-key-12345';
const testKey = 'openai-api-key';
const mockCryptoKey = { type: 'secret', algorithm: { name: 'AES-GCM' } } as CryptoKey;

describe('SecureStorage', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockStore: any;
  let mockCrypto: any;
  let mockIndexedDB: any;

  beforeEach(() => {
    // Reset any existing state
    vi.clearAllMocks();

    // Mock IndexedDB
    mockStore = {
      put: vi.fn(),
      get: vi.fn(),
    };

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockStore),
    };

    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
    };

    mockIndexedDB = {
      open: vi.fn(),
      deleteDatabase: vi.fn(),
    };

    // Mock crypto
    mockCrypto = {
      subtle: {
        generateKey: vi.fn(),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
      },
      getRandomValues: vi.fn(),
    };

    // Setup global mocks
    globalAny.indexedDB = mockIndexedDB;
    globalAny.crypto = mockCrypto;

    // Setup localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    globalAny.localStorage = localStorageMock as any;

    // Setup default mock implementations
    mockIndexedDB.open.mockImplementation(() => {
      const request: any = {
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: mockDB,
      };
      
      // Simulate async operation
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      
      return request;
    });

    mockStore.put.mockImplementation(() => {
      const request: any = { onerror: null, onsuccess: null };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockStore.get.mockImplementation(() => {
      const request: any = {
        onerror: null,
        onsuccess: null,
        result: mockCryptoKey
      };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockCrypto.subtle.generateKey.mockResolvedValue(mockCryptoKey);
    
    mockCrypto.getRandomValues.mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    });

    // Mock encrypt/decrypt with proper base64 handling
    mockCrypto.subtle.encrypt.mockImplementation(async () => {
      const mockEncrypted = new Uint8Array([1, 2, 3, 4, 5]);
      return mockEncrypted.buffer;
    });

    mockCrypto.subtle.decrypt.mockImplementation(async () => {
      const encoder = new TextEncoder();
      return encoder.encode(testData).buffer;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Key Generation and Storage', () => {
    it('should generate and store a new CryptoKey on first use', async () => {
      // Mock no existing key
      mockStore.get.mockImplementationOnce(() => {
        const request: any = {
          onerror: null,
          onsuccess: null,
          result: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await SecureStorage.encryptAndStore(testKey, testData);

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable
        ['encrypt', 'decrypt']
      );
      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should reuse existing CryptoKey', async () => {
      // First call
      await SecureStorage.encryptAndStore(testKey, testData);
      
      // Second call - should not generate new key
      vi.clearAllMocks();
      mockStore.get.mockImplementation(() => {
        const request: any = {
          onerror: null,
          onsuccess: null,
          result: mockCryptoKey
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });
      
      await SecureStorage.encryptAndStore('another-key', 'another-value');

      expect(mockCrypto.subtle.generateKey).not.toHaveBeenCalled();
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and store data', async () => {
      await SecureStorage.encryptAndStore(testKey, testData);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should decrypt and retrieve data', async () => {
      // Setup localStorage to return mock encrypted data
      const mockEncryptedData = btoa('mock-encrypted-data');
      (localStorage.getItem as any).mockReturnValue(mockEncryptedData);

      const result = await SecureStorage.decryptAndRetrieve(testKey);

      expect(localStorage.getItem).toHaveBeenCalledWith(testKey);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
      expect(result).toBe(testData);
    });

    it('should return null for non-existent keys', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const result = await SecureStorage.decryptAndRetrieve('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', async () => {
      (localStorage.getItem as any).mockReturnValue('invalid-encrypted-data');
      mockCrypto.subtle.decrypt.mockRejectedValueOnce(new Error('Decryption failed'));

      const result = await SecureStorage.decryptAndRetrieve(testKey);

      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith(testKey);
    });
  });

  describe('Auto-lock Functionality', () => {
    it('should lock storage after idle timeout', async () => {
      vi.useFakeTimers();

      await SecureStorage.encryptAndStore(testKey, testData);
      expect(SecureStorage.isLocked()).toBe(false);

      // Fast-forward time past idle timeout (15 minutes)
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      expect(SecureStorage.isLocked()).toBe(true);

      vi.useRealTimers();
    });

  });

});