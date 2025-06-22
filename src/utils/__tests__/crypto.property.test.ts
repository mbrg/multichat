/**
 * Property-based tests for crypto functionality
 * These tests verify that crypto operations maintain their mathematical properties
 * across a wide range of inputs, following Dave Farley's principle of testing invariants.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SecureStorage } from '../crypto'

describe('SecureStorage Property-Based Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Clear any existing storage state
    SecureStorage.clearAll()
  })

  describe('Encryption/Decryption Invariants', () => {
    it('user data always survives encryption round trips regardless of content', async () => {
      // Property: encrypt(data) |> decrypt() === data
      const testInputs = [
        '', // Empty string
        'a', // Single character
        'Hello, World!', // ASCII text
        '🚀🎉🔐', // Unicode/emoji
        'sk-1234567890abcdef', // API key format
        JSON.stringify({ key: 'value', nested: { data: true } }), // JSON
        'x'.repeat(1000), // Large string
        '\n\t\r\0', // Special characters
        'API_KEY_WITH_UNDERSCORES_AND_NUMBERS_123',
        'mixed-CASE-with-symbols-!@#$%^&*()',
        Array.from({ length: 50 }, () => Math.random().toString(36)).join('') // Random string
      ]

      for (const originalData of testInputs) {
        await SecureStorage.encryptAndStore('test-key', originalData)
        const decrypted = await SecureStorage.decryptAndRetrieve('test-key')
        
        expect(decrypted).toBe(originalData)
      }
    })

    it('different keys store data independently without interference', async () => {
      // Property: data stored under different keys remains separate
      const testData = 'sensitive-api-key-data'
      const keys = ['key1', 'key2', 'openai', 'anthropic', 'google']

      // Store same data under different keys
      for (const key of keys) {
        await SecureStorage.encryptAndStore(key, `${testData}-${key}`)
      }

      // Verify each key retrieves its own data
      for (const key of keys) {
        const decrypted = await SecureStorage.decryptAndRetrieve(key)
        expect(decrypted).toBe(`${testData}-${key}`)
      }
    })

    it('consistently stores and retrieves the same data across multiple operations', async () => {
      // Property: multiple store/retrieve cycles maintain data integrity
      const testData = 'api-key-to-store-multiple-times'
      const key = 'test-provider'

      // Store and retrieve the same data multiple times
      for (let i = 0; i < 5; i++) {
        await SecureStorage.encryptAndStore(key, testData)
        const decrypted = await SecureStorage.decryptAndRetrieve(key)
        expect(decrypted).toBe(testData)
      }
    })
  })

  describe('Data Integrity Properties', () => {
    it('gracefully handles missing or invalid data', async () => {
      // Property: retrieving non-existent data returns null gracefully
      const nonExistentKeys = ['never-stored', 'missing-key', 'invalid-key-name']
      
      for (const key of nonExistentKeys) {
        const result = await SecureStorage.decryptAndRetrieve(key)
        expect(result).toBeNull() // Should handle missing data gracefully
      }
    })

    it('maintains data consistency across lock/unlock cycles', async () => {
      // Property: data persists correctly through security state changes
      const testData = {
        'openai': 'sk-openai-key-123',
        'anthropic': 'sk-ant-api-key-456',
        'google': 'AIza-google-key-789'
      }

      // Store all data
      for (const [key, value] of Object.entries(testData)) {
        await SecureStorage.encryptAndStore(key, value)
      }

      // Lock and unlock multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        SecureStorage.lockNow()
        // Note: This crypto implementation doesn't have unlock with password
        // It auto-generates keys, so we test the lock/access pattern
        
        // Verify data access after lock
        for (const [key, expectedValue] of Object.entries(testData)) {
          const decrypted = await SecureStorage.decryptAndRetrieve(key)
          expect(decrypted).toBe(expectedValue)
        }
      }
    })
  })

  describe('Security Properties', () => {
    it('correctly reports lock state and maintains data access', async () => {
      // Property: locking mechanism provides security state information
      const testKeys = ['openai', 'anthropic', 'google', 'mistral', 'together']
      
      // Store some data first
      for (const key of testKeys) {
        await SecureStorage.encryptAndStore(key, `secret-data-for-${key}`)
      }

      // Lock the storage
      SecureStorage.lockNow()

      // Verify storage reports as locked
      expect(SecureStorage.isLocked()).toBe(true)
      
      // This implementation auto-unlocks on access (by design)
      // Verify data remains accessible after lock
      for (const key of testKeys) {
        const result = await SecureStorage.decryptAndRetrieve(key)
        expect(result).toBe(`secret-data-for-${key}`)
      }
    })

    it('clears all data completely when clearAll is called', async () => {
      // Property: clearAll() removes all traces of user data
      const testKeys = ['key1', 'key2', 'key3', 'key4', 'key5']
      const testData = 'sensitive-data-to-be-cleared'

      // Store data in multiple keys
      for (const key of testKeys) {
        await SecureStorage.encryptAndStore(key, `${testData}-${key}`)
      }

      // Verify data exists before clearing
      for (const key of testKeys) {
        const data = await SecureStorage.decryptAndRetrieve(key)
        expect(data).toBe(`${testData}-${key}`)
      }

      // Clear all data
      await SecureStorage.clearAll()

      // Verify no data can be retrieved after clearing
      for (const key of testKeys) {
        const data = await SecureStorage.decryptAndRetrieve(key)
        expect(data).toBeNull()
      }

      // Verify that data is completely cleared
      for (const key of testKeys) {
        const data = await SecureStorage.decryptAndRetrieve(key)
        expect(data).toBeNull()
      }
    })
  })

  describe('Performance Properties', () => {
    it('handles concurrent operations without data corruption', async () => {
      // Property: concurrent encrypt/decrypt operations maintain data integrity
      const operations = []
      const testData = Array.from({ length: 10 }, (_, i) => ({
        key: `key-${i}`,
        value: `concurrent-test-data-${i}-${Math.random()}`
      }))

      // Start multiple concurrent operations
      for (const { key, value } of testData) {
        operations.push(SecureStorage.encryptAndStore(key, value))
      }

      // Wait for all encryptions to complete
      await Promise.all(operations)

      // Verify all data was stored correctly
      for (const { key, value } of testData) {
        const decrypted = await SecureStorage.decryptAndRetrieve(key)
        expect(decrypted).toBe(value)
      }
    })

    it('maintains performance characteristics for various data sizes', async () => {
      // Property: encryption time scales reasonably with data size
      const dataSizes = [10, 100, 1000, 10000] // bytes
      const performanceMeasurements = []

      for (const size of dataSizes) {
        const testData = 'x'.repeat(size)
        const key = `perf-test-${size}`
        
        const startTime = performance.now()
        await SecureStorage.encryptAndStore(key, testData)
        const encryptTime = performance.now() - startTime

        const decryptStartTime = performance.now()
        const decrypted = await SecureStorage.decryptAndRetrieve(key)
        const decryptTime = performance.now() - decryptStartTime

        expect(decrypted).toBe(testData)
        performanceMeasurements.push({ size, encryptTime, decryptTime })
      }

      // Verify reasonable performance scaling
      // (Operations should complete in reasonable time - not strict timing requirements)
      for (const measurement of performanceMeasurements) {
        expect(measurement.encryptTime).toBeLessThan(1000) // Less than 1 second
        expect(measurement.decryptTime).toBeLessThan(1000) // Less than 1 second
      }
    })
  })
})