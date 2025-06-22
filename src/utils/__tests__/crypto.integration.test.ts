/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureStorage } from '../crypto';

// Integration tests using real browser APIs where possible
describe('SecureStorage Integration Tests', () => {
  beforeEach(() => {
    // Clean slate for each test
    localStorage.clear();
    SecureStorage.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    SecureStorage.clearAll();
    localStorage.clear();
  });

  describe('Real Crypto Operations', () => {
    it('should perform end-to-end encryption and decryption', async () => {
      const testKey = 'test-api-key';
      const testValue = 'sk-1234567890abcdef';

      // Store encrypted data
      await SecureStorage.encryptAndStore(testKey, testValue);

      // Verify it's stored in localStorage encrypted (not plain text)
      const storedData = localStorage.getItem(testKey);
      expect(storedData).toBeTruthy();
      expect(storedData).not.toBe(testValue); // Should be encrypted
      expect(storedData).not.toContain(testValue); // Should not contain plain text

      // Retrieve and decrypt
      const retrievedValue = await SecureStorage.decryptAndRetrieve(testKey);
      expect(retrievedValue).toBe(testValue);
    });

    it('should handle multiple different keys independently', async () => {
      const keys = [
        { key: 'openai-key', value: 'sk-openai123' },
        { key: 'anthropic-key', value: 'sk-ant-123' },
        { key: 'google-key', value: 'AIza123' }
      ];

      // Store all keys
      for (const { key, value } of keys) {
        await SecureStorage.encryptAndStore(key, value);
      }

      // Verify all can be retrieved correctly
      for (const { key, value } of keys) {
        const retrieved = await SecureStorage.decryptAndRetrieve(key);
        expect(retrieved).toBe(value);
      }
    });

    it('should generate different ciphertext for same plaintext', async () => {
      const testKey = 'test-key';
      const testValue = 'same-value';

      // Encrypt same value twice
      await SecureStorage.encryptAndStore(testKey + '1', testValue);
      const encrypted1 = localStorage.getItem(testKey + '1');

      await SecureStorage.encryptAndStore(testKey + '2', testValue);
      const encrypted2 = localStorage.getItem(testKey + '2');

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(await SecureStorage.decryptAndRetrieve(testKey + '1')).toBe(testValue);
      expect(await SecureStorage.decryptAndRetrieve(testKey + '2')).toBe(testValue);
    });

    it('should handle unicode and special characters', async () => {
      const testCases = [
        'Hello 世界! 🌍',
        'Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./`~',
        'Newlines\\nand\\ttabs',
        'Zero\\0byte',
        '🔐 Crypto 🚀 Test 💯'
      ];

      for (const testValue of testCases) {
        const key = `test-${testCases.indexOf(testValue)}`;
        await SecureStorage.encryptAndStore(key, testValue);
        const retrieved = await SecureStorage.decryptAndRetrieve(key);
        expect(retrieved).toBe(testValue);
      }
    });
  });

  describe('Auto-lock Behavior', () => {
    it('should maintain access during activity', async () => {
      vi.useFakeTimers();
      
      const testKey = 'activity-test';
      const testValue = 'test-value';

      // Initial storage
      await SecureStorage.encryptAndStore(testKey, testValue);
      expect(SecureStorage.isLocked()).toBe(false);

      // Simulate activity within timeout period
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
        await SecureStorage.decryptAndRetrieve(testKey); // Activity resets timer
        expect(SecureStorage.isLocked()).toBe(false);
      }

      vi.useRealTimers();
    });

    it('should lock after true inactivity', async () => {
      vi.useFakeTimers();
      
      await SecureStorage.encryptAndStore('test', 'value');
      expect(SecureStorage.isLocked()).toBe(false);

      // No activity for 15+ minutes
      vi.advanceTimersByTime(16 * 60 * 1000);
      
      expect(SecureStorage.isLocked()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Error Recovery', () => {
    it('should handle corrupted localStorage data', async () => {
      const testKey = 'corruption-test';
      
      // Store valid data first
      await SecureStorage.encryptAndStore(testKey, 'valid-data');
      expect(await SecureStorage.decryptAndRetrieve(testKey)).toBe('valid-data');

      // Corrupt the stored data
      localStorage.setItem(testKey, 'invalid-base64-data-!@#$%');

      // Should return null and clean up corrupted data
      const result = await SecureStorage.decryptAndRetrieve(testKey);
      expect(result).toBeNull();
      expect(localStorage.getItem(testKey)).toBeNull();
    });

    it('should handle malformed base64 data', async () => {
      const testKey = 'malformed-test';
      
      // Set malformed base64 data
      localStorage.setItem(testKey, 'not-valid-base64!');

      const result = await SecureStorage.decryptAndRetrieve(testKey);
      expect(result).toBeNull();
      expect(localStorage.getItem(testKey)).toBeNull();
    });

    it('should handle truncated encrypted data', async () => {
      const testKey = 'truncated-test';
      
      // Store valid data then truncate it
      await SecureStorage.encryptAndStore(testKey, 'test-data');
      const validData = localStorage.getItem(testKey)!;
      
      // Truncate to be too short for IV + data
      localStorage.setItem(testKey, validData.substring(0, 10));

      const result = await SecureStorage.decryptAndRetrieve(testKey);
      expect(result).toBeNull();
      expect(localStorage.getItem(testKey)).toBeNull();
    });
  });

  describe('Key Persistence', () => {
    it('should reuse the same key across operations', async () => {
      // This test verifies that the same CryptoKey is used
      // We can't directly inspect the key, but we can verify behavior
      
      await SecureStorage.encryptAndStore('key1', 'value1');
      const locked1 = SecureStorage.isLocked();
      
      await SecureStorage.encryptAndStore('key2', 'value2');
      const locked2 = SecureStorage.isLocked();
      
      // Both operations should succeed and not be locked
      expect(locked1).toBe(false);
      expect(locked2).toBe(false);
      
      // Both values should be retrievable
      expect(await SecureStorage.decryptAndRetrieve('key1')).toBe('value1');
      expect(await SecureStorage.decryptAndRetrieve('key2')).toBe('value2');
    });

    it('should require new key generation after clearAll', async () => {
      await SecureStorage.encryptAndStore('test1', 'value1');
      expect(SecureStorage.isLocked()).toBe(false);

      SecureStorage.clearAll();
      expect(SecureStorage.isLocked()).toBe(true);

      // Should work again after clearAll (generates new key)
      await SecureStorage.encryptAndStore('test2', 'value2');
      expect(SecureStorage.isLocked()).toBe(false);
      expect(await SecureStorage.decryptAndRetrieve('test2')).toBe('value2');
    });
  });

  describe('Large Data Handling', () => {
    it('should handle reasonably large API keys', async () => {
      // Generate large API key (some services have long keys)
      const largeKey = 'sk-' + 'a'.repeat(1000) + 'b'.repeat(1000) + 'c'.repeat(1000);
      
      await SecureStorage.encryptAndStore('large-key', largeKey);
      const retrieved = await SecureStorage.decryptAndRetrieve('large-key');
      
      expect(retrieved).toBe(largeKey);
      expect(retrieved?.length).toBe(largeKey.length);
    });

    it('should handle multiple large keys simultaneously', async () => {
      const keys = Array.from({ length: 10 }, (_, i) => ({
        key: `large-key-${i}`,
        value: `prefix-${i}-` + 'x'.repeat(500) + `-suffix-${i}`
      }));

      // Store all large keys
      for (const { key, value } of keys) {
        await SecureStorage.encryptAndStore(key, value);
      }

      // Verify all are retrievable
      for (const { key, value } of keys) {
        expect(await SecureStorage.decryptAndRetrieve(key)).toBe(value);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent encrypt operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        SecureStorage.encryptAndStore(`concurrent-${i}`, `value-${i}`)
      );

      // All should complete successfully
      await Promise.all(operations);

      // All values should be retrievable
      for (let i = 0; i < 5; i++) {
        expect(await SecureStorage.decryptAndRetrieve(`concurrent-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should handle mixed concurrent operations', async () => {
      // Setup initial data
      await SecureStorage.encryptAndStore('initial', 'initial-value');

      const operations = [
        SecureStorage.encryptAndStore('new1', 'value1'),
        SecureStorage.decryptAndRetrieve('initial'),
        SecureStorage.encryptAndStore('new2', 'value2'),
        SecureStorage.decryptAndRetrieve('initial'),
        SecureStorage.encryptAndStore('new3', 'value3')
      ];

      const results = await Promise.all(operations);

      // Check results
      expect(results[1]).toBe('initial-value'); // First decrypt
      expect(results[3]).toBe('initial-value'); // Second decrypt
      
      // Check stored values
      expect(await SecureStorage.decryptAndRetrieve('new1')).toBe('value1');
      expect(await SecureStorage.decryptAndRetrieve('new2')).toBe('value2');
      expect(await SecureStorage.decryptAndRetrieve('new3')).toBe('value3');
    });
  });
});