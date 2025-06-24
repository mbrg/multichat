/**
 * Contract tests for IKVStore interface
 *
 * These tests verify that any implementation of IKVStore
 * behaves correctly according to the interface contract.
 * They are implementation-agnostic and focus on behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IKVStore } from '../IKVStore'

/**
 * Contract test suite for IKVStore implementations
 *
 * Usage: Call this function with your IKVStore implementation
 * to verify it meets the contract requirements.
 *
 * @param createStore - Factory function that creates a fresh store instance
 */
export function testIKVStoreContract(createStore: () => IKVStore) {
  describe('IKVStore Contract', () => {
    let store: IKVStore

    beforeEach(() => {
      store = createStore()
    })

    describe('get operation', () => {
      it('should return null for non-existent keys', async () => {
        const result = await store.get('non-existent-key')
        expect(result).toBeNull()
      })

      it('should return null for empty string key', async () => {
        const result = await store.get('')
        expect(result).toBeNull()
      })

      it('should handle special characters in keys', async () => {
        const result = await store.get('key-with-special-chars!@#$%')
        expect(result).toBeNull()
      })
    })

    describe('set and get operations', () => {
      it('should store and retrieve string values', async () => {
        const key = 'test-string'
        const value = 'hello world'

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toBe(value)
      })

      it('should store and retrieve number values', async () => {
        const key = 'test-number'
        const value = 42

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toBe(value)
      })

      it('should store and retrieve boolean values', async () => {
        const key = 'test-boolean'
        const value = true

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toBe(value)
      })

      it('should store and retrieve object values', async () => {
        const key = 'test-object'
        const value = { name: 'test', count: 5, active: true }

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toEqual(value)
      })

      it('should store and retrieve array values', async () => {
        const key = 'test-array'
        const value = [1, 'two', { three: 3 }]

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toEqual(value)
      })

      it('should store and retrieve null values', async () => {
        const key = 'test-null'
        const value = null

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toBeNull()
      })

      it('should handle overwriting existing values', async () => {
        const key = 'test-overwrite'
        const firstValue = 'first'
        const secondValue = 'second'

        await store.set(key, firstValue)
        await store.set(key, secondValue)
        const result = await store.get(key)

        expect(result).toBe(secondValue)
      })

      it('should handle keys with special characters', async () => {
        const key = 'test-key!@#$%^&*()_+-=[]{}|;:,.<>?'
        const value = 'special key test'

        await store.set(key, value)
        const result = await store.get(key)

        expect(result).toBe(value)
      })
    })

    describe('del operation', () => {
      it('should delete existing keys', async () => {
        const key = 'test-delete'
        const value = 'to be deleted'

        await store.set(key, value)
        await store.del(key)
        const result = await store.get(key)

        expect(result).toBeNull()
      })

      it('should handle deleting non-existent keys gracefully', async () => {
        await expect(store.del('non-existent-key')).resolves.not.toThrow()
      })

      it('should handle deleting empty string key gracefully', async () => {
        await expect(store.del('')).resolves.not.toThrow()
      })

      it('should handle multiple deletions of the same key', async () => {
        const key = 'test-multiple-delete'

        await store.set(key, 'value')
        await store.del(key)
        await store.del(key)

        const result = await store.get(key)
        expect(result).toBeNull()
      })
    })

    describe('getImplementationName operation', () => {
      it('should return a non-empty string', () => {
        const name = store.getImplementationName()
        expect(typeof name).toBe('string')
        expect(name.length).toBeGreaterThan(0)
      })

      it('should return consistent implementation name', () => {
        const name1 = store.getImplementationName()
        const name2 = store.getImplementationName()
        expect(name1).toBe(name2)
      })
    })

    describe('edge cases and error handling', () => {
      it('should handle concurrent operations gracefully', async () => {
        const key = 'concurrent-test'
        const operations = [
          store.set(key, 'value1'),
          store.set(key, 'value2'),
          store.get(key),
          store.del(key),
          store.get(key),
        ]

        await expect(Promise.all(operations)).resolves.not.toThrow()
      })

      it('should handle large values', async () => {
        const key = 'large-value-test'
        const largeValue = 'x'.repeat(10000)

        await store.set(key, largeValue)
        const result = await store.get(key)

        expect(result).toBe(largeValue)
      })

      it('should handle deeply nested objects', async () => {
        const key = 'nested-object-test'
        const nestedValue = {
          level1: {
            level2: {
              level3: {
                value: 'deeply nested',
                array: [1, 2, { nested: true }],
              },
            },
          },
        }

        await store.set(key, nestedValue)
        const result = await store.get(key)

        expect(result).toEqual(nestedValue)
      })
    })
  })
}

/**
 * Example usage of the contract test suite
 *
 * This would typically be called from specific implementation test files:
 *
 * import { testIKVStoreContract } from './IKVStore.contract.test'
 * import { YourKVStoreImplementation } from '../YourKVStoreImplementation'
 *
 * testIKVStoreContract(() => new YourKVStoreImplementation())
 */

// Mock implementation for testing the contract
class MockKVStore implements IKVStore {
  private store = new Map<string, any>()

  async get<T = any>(key: string): Promise<T | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value)
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  getImplementationName(): string {
    return 'MockKVStore'
  }
}

// Run the contract tests with the mock implementation
testIKVStoreContract(() => new MockKVStore())
