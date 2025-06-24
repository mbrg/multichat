/**
 * KV Store Factory Tests
 *
 * These tests verify the factory logic for selecting KV implementations
 * based on environment and configuration, without testing implementation details.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KVStoreFactory, type KVEnvironment } from '../KVStoreFactory'

describe('KVStoreFactory', () => {
  beforeEach(() => {
    // Reset singleton before each test
    KVStoreFactory.reset()
    vi.clearAllMocks()
  })

  describe('Environment Resolution', () => {
    it('should fall back to local storage in development without cloud config', async () => {
      // Mock environment without cloud config
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('KV_URL', undefined)
      vi.stubEnv('KV_REST_API_URL', undefined)
      vi.stubEnv('KV_REST_API_TOKEN', undefined)

      const store = await KVStoreFactory.getInstance()
      expect(store).toBeDefined()
      expect(KVStoreFactory.getCurrentInstanceType()).toContain('LocalKVStore')
    })

    it('should use cloud KV in development with cloud config', async () => {
      // Mock environment with cloud config
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('KV_URL', 'redis://localhost:6379')
      vi.stubEnv('KV_REST_API_URL', 'https://api.vercel.com/kv')
      vi.stubEnv('KV_REST_API_TOKEN', 'token123')

      // Mock the @vercel/kv import
      vi.doMock('@vercel/kv', () => ({
        kv: {
          get: vi.fn(),
          set: vi.fn(),
          del: vi.fn(),
        },
      }))

      const store = await KVStoreFactory.createInstance('auto')

      expect(store.getImplementationName()).toContain('CloudKVStore')
    })

    it('should use cloud KV in production with cloud config', async () => {
      // Mock environment with cloud config
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('KV_URL', 'redis://production:6379')
      vi.stubEnv('KV_REST_API_URL', 'https://api.vercel.com/kv')
      vi.stubEnv('KV_REST_API_TOKEN', 'prod-token123')

      // Mock the @vercel/kv import
      vi.doMock('@vercel/kv', () => ({
        kv: {
          get: vi.fn(),
          set: vi.fn(),
          del: vi.fn(),
        },
      }))

      const store = await KVStoreFactory.createInstance('auto')

      expect(store.getImplementationName()).toContain('CloudKVStore')
    })

    it('should throw error in production without cloud config', async () => {
      // Mock production environment without cloud config
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('KV_URL', undefined)
      vi.stubEnv('KV_REST_API_URL', undefined)
      vi.stubEnv('KV_REST_API_TOKEN', undefined)

      await expect(KVStoreFactory.createInstance('auto')).rejects.toThrow(
        'Vercel KV configuration required'
      )
    })
  })

  describe('Explicit Type Selection', () => {
    it('should only support cloud storage now', async () => {
      // Cloud config available
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('KV_URL', 'redis://localhost:6379')
      vi.stubEnv('KV_REST_API_URL', 'https://api.vercel.com/kv')
      vi.stubEnv('KV_REST_API_TOKEN', 'token123')

      // Mock the @vercel/kv import
      vi.doMock('@vercel/kv', () => ({
        kv: {
          get: vi.fn(),
          set: vi.fn(),
          del: vi.fn(),
        },
      }))

      const store = await KVStoreFactory.createInstance('cloud')

      expect(store.getImplementationName()).toContain('CloudKVStore')
    })

    it('should respect explicit cloud type selection', async () => {
      // Mock the @vercel/kv import
      vi.doMock('@vercel/kv', () => ({
        kv: {
          get: vi.fn(),
          set: vi.fn(),
          del: vi.fn(),
        },
      }))

      vi.stubEnv('NODE_ENV', 'development')

      const store = await KVStoreFactory.createInstance('cloud')

      expect(store.getImplementationName()).toContain('CloudKVStore')
    })
  })

  describe('Singleton Behavior', () => {
    it('should return the same instance on multiple calls', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('KV_URL', undefined)
      vi.stubEnv('KV_REST_API_URL', undefined)
      vi.stubEnv('KV_REST_API_TOKEN', undefined)

      const store1 = await KVStoreFactory.getInstance()
      const store2 = await KVStoreFactory.getInstance()

      expect(store1).toBe(store2)
    })

    it('should return different instances after reset', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('KV_URL', undefined)
      vi.stubEnv('KV_REST_API_URL', undefined)
      vi.stubEnv('KV_REST_API_TOKEN', undefined)

      const store1 = await KVStoreFactory.getInstance()
      KVStoreFactory.reset()
      const store2 = await KVStoreFactory.getInstance()

      expect(store1).not.toBe(store2)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing @vercel/kv dependency gracefully', async () => {
      // Mock import failure using vi.mock at top level would be hoisted
      // Instead, mock the createCloudKVStore method directly
      const spy = vi.spyOn(KVStoreFactory, 'createCloudKVStore')
      spy.mockRejectedValue(new Error('Failed to initialize cloud KV store'))

      await expect(KVStoreFactory.createInstance('cloud')).rejects.toThrow(
        'Failed to initialize cloud KV store'
      )

      spy.mockRestore()
    })
  })

  describe('Current Instance Type', () => {
    it('should return null when no instance exists', () => {
      expect(KVStoreFactory.getCurrentInstanceType()).toBeNull()
    })

    it('should return implementation name when instance exists', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('KV_URL', undefined)
      vi.stubEnv('KV_REST_API_URL', undefined)
      vi.stubEnv('KV_REST_API_TOKEN', undefined)

      await KVStoreFactory.getInstance()
      const type = KVStoreFactory.getCurrentInstanceType()

      expect(type).toContain('LocalKVStore')
    })
  })
})
