/**
 * KV Store Contract Tests
 *
 * These tests verify that any implementation of IKVStore
 * behaves according to the contract, without depending on
 * specific implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { IKVStore } from '../IKVStore'
// LocalKVStore removed - using cloud-only storage
import { CloudKVStore } from '../CloudKVStore'

// Mock Vercel KV for testing
const mockVercelKV = {
  get: async (key: string) =>
    mockStorage.has(key) ? mockStorage.get(key) : null,
  set: async (key: string, value: any) => {
    mockStorage.set(key, value)
  },
  del: async (key: string) => {
    mockStorage.delete(key)
  },
}

const mockStorage = new Map<string, any>()

// Test suite that runs against any IKVStore implementation
function runKVStoreContractTests(
  name: string,
  createStore: () => Promise<IKVStore>
) {
  describe(`${name} - KV Store Contract`, () => {
    let store: IKVStore

    beforeEach(async () => {
      mockStorage.clear()
      store = await createStore()
    })

    it('should have an implementation name', () => {
      expect(store.getImplementationName()).toBeTruthy()
      expect(typeof store.getImplementationName()).toBe('string')
    })

    it('should return null for non-existent keys', async () => {
      const result = await store.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should store and retrieve string values', async () => {
      const key = 'test-string'
      const value = 'hello world'

      await store.set(key, value)
      const retrieved = await store.get(key)

      expect(retrieved).toBe(value)
    })

    it('should store and retrieve object values', async () => {
      const key = 'test-object'
      const value = { message: 'hello', count: 42, nested: { flag: true } }

      await store.set(key, value)
      const retrieved = await store.get(key)

      expect(retrieved).toEqual(value)
    })

    it('should store and retrieve array values', async () => {
      const key = 'test-array'
      const value = ['item1', 'item2', { id: 1 }]

      await store.set(key, value)
      const retrieved = await store.get(key)

      expect(retrieved).toEqual(value)
    })

    it('should overwrite existing values', async () => {
      const key = 'test-overwrite'
      const firstValue = 'first'
      const secondValue = 'second'

      await store.set(key, firstValue)
      await store.set(key, secondValue)
      const retrieved = await store.get(key)

      expect(retrieved).toBe(secondValue)
    })

    it('should delete existing keys', async () => {
      const key = 'test-delete'
      const value = 'to be deleted'

      await store.set(key, value)
      await store.del(key)
      const retrieved = await store.get(key)

      expect(retrieved).toBeNull()
    })

    it('should handle deleting non-existent keys gracefully', async () => {
      // Should not throw
      await expect(store.del('non-existent-key')).resolves.not.toThrow()
    })

    it('should handle empty string values', async () => {
      const key = 'test-empty'
      const value = ''

      await store.set(key, value)
      const retrieved = await store.get(key)

      expect(retrieved).toBe(value)
    })

    it('should handle null values', async () => {
      const key = 'test-null'
      const value = null

      await store.set(key, value)
      const retrieved = await store.get(key)

      expect(retrieved).toBe(value)
    })

    it('should handle zero values', async () => {
      const key = 'test-zero'
      const value = 0

      await store.set(key, value)
      const retrieved = await store.get(key)

      expect(retrieved).toBe(value)
    })

    it('should handle boolean values', async () => {
      const key1 = 'test-true'
      const key2 = 'test-false'

      await store.set(key1, true)
      await store.set(key2, false)

      expect(await store.get(key1)).toBe(true)
      expect(await store.get(key2)).toBe(false)
    })

    it('should handle concurrent operations', async () => {
      const promises = []

      // Concurrent sets
      for (let i = 0; i < 10; i++) {
        promises.push(store.set(`key-${i}`, `value-${i}`))
      }

      await Promise.all(promises)

      // Verify all values were set
      for (let i = 0; i < 10; i++) {
        const value = await store.get(`key-${i}`)
        expect(value).toBe(`value-${i}`)
      }
    })
  })
}

// Run contract tests for cloud implementation only
runKVStoreContractTests(
  'CloudKVStore',
  async () => new CloudKVStore(mockVercelKV)
)
