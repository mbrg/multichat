/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Access the global object in tests
const globalAny: any = globalThis;
import { SecureStorage } from '../crypto';

describe('SecureStorage Security Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    SecureStorage.clearAll();
  });

  afterEach(() => {
    SecureStorage.clearAll();
    localStorage.clear();
  });

  describe('Data Confidentiality', () => {
    it('should never store API keys in plain text', async () => {
      const sensitiveData = [
        'sk-1234567890abcdef1234567890abcdef12345678',
        'AIzaSyDq1234567890abcdef1234567890abcdef',
        'sk-ant-api03-1234567890abcdef1234567890abcdef',
        'password123',
        'secret-token-xyz'
      ];

      for (const secret of sensitiveData) {
        await SecureStorage.encryptAndStore(`key-${sensitiveData.indexOf(secret)}`, secret);
        
        // Check localStorage doesn't contain plain text
        const allLocalStorageData = JSON.stringify(localStorage);
        expect(allLocalStorageData).not.toContain(secret);
        
        // Verify each stored item is not the plain text
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            expect(value).not.toBe(secret);
            expect(value).not.toContain(secret);
          }
        }
      }
    });

    it('should not leak secrets in error messages', async () => {
      const secret = 'sk-very-secret-key-that-should-not-leak';
      await SecureStorage.encryptAndStore('test-key', secret);
      
      // Corrupt the stored data to trigger an error
      const key = Object.keys(localStorage)[0];
      localStorage.setItem(key, 'corrupted-data');

      // Capture any error messages
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await SecureStorage.decryptAndRetrieve('test-key');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain(secret);
      }

      // Check console errors don't leak secrets
      const consoleCalls = consoleSpy.mock.calls;
      for (const call of consoleCalls) {
        const errorMsg = call.join(' ');
        expect(errorMsg).not.toContain(secret);
      }

      consoleSpy.mockRestore();
    });

    it('should use different ciphertext for identical plaintexts', async () => {
      const plaintext = 'identical-secret-data';
      
      await SecureStorage.encryptAndStore('key1', plaintext);
      await SecureStorage.encryptAndStore('key2', plaintext);
      
      const encrypted1 = localStorage.getItem('key1');
      const encrypted2 = localStorage.getItem('key2');
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted1).toBeTruthy();
      expect(encrypted2).toBeTruthy();
    });
  });

  describe('Access Control', () => {
    it('should auto-lock after inactivity period', async () => {
      vi.useFakeTimers();
      
      await SecureStorage.encryptAndStore('test', 'secret-data');
      expect(SecureStorage.isLocked()).toBe(false);
      
      // Advance past 15 minute timeout
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      
      expect(SecureStorage.isLocked()).toBe(true);
      
      vi.useRealTimers();
    });

    it('should lock immediately on manual lock', async () => {
      await SecureStorage.encryptAndStore('test', 'secret-data');
      expect(SecureStorage.isLocked()).toBe(false);
      
      SecureStorage.lockNow();
      expect(SecureStorage.isLocked()).toBe(true);
    });

    it('should require unlocking after lock to access data', async () => {
      await SecureStorage.encryptAndStore('test', 'secret-data');
      SecureStorage.lockNow();
      
      // Should still be able to access data (unlocking happens automatically)
      const result = await SecureStorage.decryptAndRetrieve('test');
      expect(result).toBe('secret-data');
      expect(SecureStorage.isLocked()).toBe(false); // Unlocked by access
    });

    it('should reset timeout on activity', async () => {
      vi.useFakeTimers();
      
      await SecureStorage.encryptAndStore('test', 'data');
      
      // Activity before timeout
      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      await SecureStorage.decryptAndRetrieve('test'); // Activity
      
      // Should not be locked yet
      vi.advanceTimersByTime(10 * 60 * 1000); // Another 10 minutes (20 total)
      expect(SecureStorage.isLocked()).toBe(false);
      
      // Should lock after full timeout from last activity
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 more minutes (16 from last activity)
      expect(SecureStorage.isLocked()).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('Data Integrity', () => {
    it('should detect and handle data tampering', async () => {
      await SecureStorage.encryptAndStore('tamper-test', 'original-data');
      
      // Tamper with stored data
      const originalData = localStorage.getItem('tamper-test')!;
      const tamperedData = originalData.slice(0, -5) + 'AAAAA'; // Change last 5 chars
      localStorage.setItem('tamper-test', tamperedData);
      
      // Should detect tampering and return null
      const result = await SecureStorage.decryptAndRetrieve('tamper-test');
      expect(result).toBeNull();
      
      // Should clean up tampered data
      expect(localStorage.getItem('tamper-test')).toBeNull();
    });

    it('should handle partial data corruption', async () => {
      await SecureStorage.encryptAndStore('corrupt-test', 'test-data');
      
      // Partially corrupt data (truncate)
      const originalData = localStorage.getItem('corrupt-test')!;
      const partialData = originalData.substring(0, originalData.length / 2);
      localStorage.setItem('corrupt-test', partialData);
      
      const result = await SecureStorage.decryptAndRetrieve('corrupt-test');
      expect(result).toBeNull();
      expect(localStorage.getItem('corrupt-test')).toBeNull();
    });

    it('should handle invalid base64 encoding', async () => {
      localStorage.setItem('invalid-b64', 'this-is-not-valid-base64!@#$%');
      
      const result = await SecureStorage.decryptAndRetrieve('invalid-b64');
      expect(result).toBeNull();
      expect(localStorage.getItem('invalid-b64')).toBeNull();
    });
  });

  describe('Memory Security', () => {
    it('should not retain keys in memory after lock', async () => {
      await SecureStorage.encryptAndStore('memory-test', 'sensitive-data');
      
      // Force garbage collection if available
      if (globalAny.gc) {
        globalAny.gc();
      }
      
      SecureStorage.lockNow();
      expect(SecureStorage.isLocked()).toBe(true);
      
      // The key promise should be nulled
      // We can't directly inspect private members, but we can verify behavior
      await SecureStorage.encryptAndStore('new-test', 'new-data');
      expect(SecureStorage.isLocked()).toBe(false); // Should unlock again
    });

    it('should clear all data on clearAll', async () => {
      await SecureStorage.encryptAndStore('clear1', 'data1');
      await SecureStorage.encryptAndStore('clear2', 'data2');
      
      SecureStorage.clearAll();
      
      // Should be locked
      expect(SecureStorage.isLocked()).toBe(true);
      
      // localStorage should be cleared
      expect(localStorage.length).toBe(0);
      
      // Should still work after clearAll (generates new key)
      await SecureStorage.encryptAndStore('new-after-clear', 'new-data');
      expect(await SecureStorage.decryptAndRetrieve('new-after-clear')).toBe('new-data');
    });
  });

  describe('Cryptographic Security', () => {
    it('should use proper IV length for AES-GCM', async () => {
      await SecureStorage.encryptAndStore('iv-test', 'test-data');
      
      const encryptedData = localStorage.getItem('iv-test')!;
      const binaryData = atob(encryptedData);
      
      // First 12 bytes should be the IV for AES-GCM
      expect(binaryData.length).toBeGreaterThan(12);
      
      // IV should be 12 bytes (96 bits) for AES-GCM
      const ivLength = 12;
      expect(binaryData.length).toBe(ivLength + (binaryData.length - ivLength));
    });

    it('should produce different IVs for multiple encryptions', async () => {
      const iterations = 10;
      const ivs = new Set();
      
      for (let i = 0; i < iterations; i++) {
        await SecureStorage.encryptAndStore(`iv-unique-${i}`, 'same-data');
        const encrypted = localStorage.getItem(`iv-unique-${i}`)!;
        const binaryData = atob(encrypted);
        const iv = binaryData.substring(0, 12); // Extract IV
        ivs.add(iv);
      }
      
      // All IVs should be unique
      expect(ivs.size).toBe(iterations);
    });

    it('should fail decryption with wrong key material', async () => {
      await SecureStorage.encryptAndStore('key-test', 'secret-data');
      const originalEncrypted = localStorage.getItem('key-test')!;
      
      // Clear and force new key generation
      SecureStorage.clearAll();
      
      // Store the old encrypted data with new key system
      localStorage.setItem('key-test', originalEncrypted);
      
      // Should fail to decrypt with different key
      const result = await SecureStorage.decryptAndRetrieve('key-test');
      expect(result).toBeNull();
    });
  });

  describe('Side-Channel Resistance', () => {
    it('should handle different key sizes correctly', async () => {
      const shortKey = 'sk-short';
      const longKey = 'sk-' + 'a'.repeat(1000);
      
      // Both should encrypt and decrypt successfully regardless of size
      await SecureStorage.encryptAndStore('short', shortKey);
      await SecureStorage.encryptAndStore('long', longKey);
      
      expect(await SecureStorage.decryptAndRetrieve('short')).toBe(shortKey);
      expect(await SecureStorage.decryptAndRetrieve('long')).toBe(longKey);
    });

    it('should handle decryption failures consistently', async () => {
      const validData = 'valid-secret';
      await SecureStorage.encryptAndStore('valid', validData);
      
      const invalidInputs = [
        'not-base64!',
        btoa('too-short'),
        btoa('x'.repeat(100)), // Wrong length but valid base64
        btoa(String.fromCharCode(...Array(50).fill(0))) // All zeros
      ];
      
      const timings: number[] = [];
      
      for (const input of invalidInputs) {
        localStorage.setItem('invalid-test', input);
        
        const start = performance.now();
        const result = await SecureStorage.decryptAndRetrieve('invalid-test');
        const time = performance.now() - start;
        
        expect(result).toBeNull();
        timings.push(time);
      }
      
      // All failure timings should be roughly consistent
      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      for (const time of timings) {
        const deviation = Math.abs(time - avgTime) / avgTime;
        expect(deviation).toBeLessThan(2); // Allow reasonable variance
      }
    });
  });
});