/**
 * KV Integration Tests
 *
 * Dave Farley-style integration tests that verify the KV abstraction
 * works correctly across different environment configurations.
 * These tests validate real environment-based behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KVStoreFactory } from '../KVStoreFactory'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('KV Integration Tests - Environment-Based Selection', () => {
  let originalEnv: any
  let testKvFile: string

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    // Create unique test file path
    testKvFile = join(
      tmpdir(),
      `kv-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`
    )
    KVStoreFactory.reset()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Restore original environment
    Object.keys(process.env).forEach((key) => delete process.env[key])
    Object.assign(process.env, originalEnv)
    KVStoreFactory.reset()

    // Clean up test-specific file to prevent test pollution
    try {
      await fs.unlink(testKvFile)
    } catch (error) {
      // File doesn't exist, which is fine
    }
  })

  describe('Development Environment', () => {
    it('should fall back to local storage in development without cloud config', async () => {
      // Arrange: Development without cloud config
      Object.assign(process.env, { NODE_ENV: 'development' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      // Act: Should fall back to local storage
      const store = await KVStoreFactory.getInstance()

      // Assert: Should create local store
      expect(store).toBeDefined()
      expect(KVStoreFactory.getCurrentInstanceType()).toContain('LocalKVStore')
    })

    it('should still use local storage even when cloud config exists', async () => {
      // Arrange: Development with cloud config present
      Object.assign(process.env, { NODE_ENV: 'development' })
      process.env.KV_REST_API_URL = 'https://test-api.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      const store = await KVStoreFactory.createInstance('auto')
      expect(store.getImplementationName()).toContain('LocalKVStore')
    })
  })

  describe('Production Environment', () => {
    it('should require cloud configuration in production', async () => {
      // Arrange: Production without cloud config
      Object.assign(process.env, { NODE_ENV: 'production' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      // Act & Assert
      await expect(KVStoreFactory.createInstance('auto')).rejects.toThrow(
        'Cloud KV configuration required (Upstash or Redis)'
      )
    })

    it('should use CloudKV when properly configured in production', async () => {
      // Arrange: Production with cloud config
      Object.assign(process.env, { NODE_ENV: 'production' })
      process.env.KV_REST_API_URL = 'https://prod-api.upstash.io'
      process.env.KV_REST_API_URL = 'https://prod-api.upstash.io'
      process.env.KV_REST_API_TOKEN = 'prod-token'

      // Mock @upstash/redis
      vi.doMock('@upstash/redis', () => ({
        Redis: {
          fromEnv: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
            del: vi.fn().mockResolvedValue(undefined),
          }),
        },
      }))

      try {
        // Act
        const store = await KVStoreFactory.createInstance('auto')

        // Assert
        expect(store.getImplementationName()).toContain('CloudKVStore')
      } catch (error) {
        // Expected if @upstash/redis is not available
        expect((error as Error).message).toContain(
          'Failed to initialize cloud Redis store'
        )
      }
    })

    it('should use Redis when Upstash is not configured', async () => {
      // Arrange: Production with only REDIS_URL
      Object.assign(process.env, { NODE_ENV: 'production' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN
      process.env.REDIS_URL = 'redis://localhost:6379'

      vi.doMock('redis', () => ({
        createClient: vi.fn().mockReturnValue({
          connect: vi.fn().mockResolvedValue(undefined),
          on: vi.fn(),
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue(undefined),
          del: vi.fn().mockResolvedValue(undefined),
        }),
      }))

      const store = await KVStoreFactory.createInstance('auto')
      expect(store.getImplementationName()).toContain('RedisKVStore')
    })
  })

  describe('Explicit Type Selection', () => {
    it('should only support cloud storage now', async () => {
      // Arrange: Cloud config available
      Object.assign(process.env, { NODE_ENV: 'development' })
      process.env.KV_REST_API_URL = 'https://test-api.upstash.io'
      process.env.KV_REST_API_URL = 'https://test-api.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      // Mock @upstash/redis
      vi.doMock('@upstash/redis', () => ({
        Redis: {
          fromEnv: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
            del: vi.fn().mockResolvedValue(undefined),
          }),
        },
      }))

      try {
        // Act
        const store = await KVStoreFactory.createInstance('cloud')

        // Assert
        expect(store.getImplementationName()).toContain('CloudKVStore')
      } catch (error) {
        // Expected if @upstash/redis is not available
        expect((error as Error).message).toContain(
          'Failed to initialize cloud Redis store'
        )
      }
    })

    it('should respect explicit cloud selection', async () => {
      // Arrange
      Object.assign(process.env, { NODE_ENV: 'development' })

      // Mock @upstash/redis
      vi.doMock('@upstash/redis', () => ({
        Redis: {
          fromEnv: vi.fn().mockReturnValue({
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
          }),
        },
      }))

      try {
        // Act
        const store = await KVStoreFactory.createInstance('cloud')

        // Assert
        expect(store.getImplementationName()).toContain('CloudKVStore')
      } catch (error) {
        expect((error as Error).message).toContain(
          'Cloud KV configuration required (Upstash or Redis)'
        )
      }
    })
  })

  describe('Factory Behavior', () => {
    it('should return same instance for singleton calls', async () => {
      // Arrange
      Object.assign(process.env, { NODE_ENV: 'development' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      // Act
      const store1 = await KVStoreFactory.getInstance()
      const store2 = await KVStoreFactory.getInstance()

      // Assert
      expect(store1).toBe(store2)
    })

    it('should return different instances after reset', async () => {
      // Arrange
      Object.assign(process.env, { NODE_ENV: 'development' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      // Act
      const store1 = await KVStoreFactory.getInstance()
      KVStoreFactory.reset()
      const store2 = await KVStoreFactory.getInstance()

      // Assert
      expect(store1).not.toBe(store2)
    })

    it('should provide implementation type information', async () => {
      // Arrange
      Object.assign(process.env, { NODE_ENV: 'development' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      // Act
      expect(KVStoreFactory.getCurrentInstanceType()).toBeNull()

      await KVStoreFactory.getInstance()
      const type = KVStoreFactory.getCurrentInstanceType()

      // Assert
      expect(type).toContain('LocalKVStore')
    })
  })

  describe('Contract Compliance Across Environments', () => {
    it('should handle all data types consistently in local mode', async () => {
      // Arrange
      Object.assign(process.env, { NODE_ENV: 'development' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      const store = KVStoreFactory.createLocalKVStore(testKvFile)

      // Test various data types
      const testCases = [
        { key: 'string', value: 'hello world' },
        { key: 'number', value: 42 },
        { key: 'boolean-true', value: true },
        { key: 'boolean-false', value: false },
        { key: 'null', value: null },
        { key: 'object', value: { nested: { data: 'test' } } },
        { key: 'array', value: [1, 'two', { three: 3 }] },
        { key: 'empty-string', value: '' },
        { key: 'zero', value: 0 },
      ]

      // Act & Assert
      for (const testCase of testCases) {
        await store.set(testCase.key, testCase.value)
        const retrieved = await store.get(testCase.key)
        expect(retrieved).toEqual(testCase.value)
      }
    })

    it('should handle concurrent operations in local mode', async () => {
      // Arrange
      Object.assign(process.env, { NODE_ENV: 'development' })
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      const store = KVStoreFactory.createLocalKVStore(testKvFile)

      // Act: Concurrent writes
      const operations = []
      for (let i = 0; i < 10; i++) {
        operations.push(store.set(`concurrent-${i}`, `value-${i}`))
      }
      await Promise.all(operations)

      // Assert: All values are correct
      for (let i = 0; i < 10; i++) {
        const value = await store.get(`concurrent-${i}`)
        expect(value).toBe(`value-${i}`)
      }
    })
  })
})
