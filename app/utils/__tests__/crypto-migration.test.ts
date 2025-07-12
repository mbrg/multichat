// ==================== TEMPORARY TEST FILE - REMOVE AFTER 2025-02-12 ====================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  deriveUserKeyOld,
  needsMigration,
  migrateEncryptedData,
  migrateAllUserData,
  isMigrationCompleted,
  setMigrationCompleted,
} from '../crypto-migration'
import { deriveUserKey, encrypt, decrypt } from '../crypto'
import type { IKVStore } from '../../services/kv/IKVStore'

// No mocking for logging service - let it run normally

describe('Crypto Migration', () => {
  const testUserId = '/github/12345'
  const testData = 'This is sensitive user data'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deriveUserKeyOld', () => {
    it('should derive key using old SHA-256 method', async () => {
      const key = await deriveUserKeyOld(testUserId)
      expect(key).toBeInstanceOf(Buffer)
      expect(key.length).toBe(32) // SHA-256 produces 32 bytes
    })

    it('should produce consistent keys for same userId', async () => {
      const key1 = await deriveUserKeyOld(testUserId)
      const key2 = await deriveUserKeyOld(testUserId)
      expect(key1.equals(key2)).toBe(true)
    })

    it('should produce different keys for different userIds', async () => {
      const key1 = await deriveUserKeyOld(testUserId)
      const key2 = await deriveUserKeyOld('/github/67890')
      expect(key1.equals(key2)).toBe(false)
    })
  })

  describe('needsMigration', () => {
    it('should return false for data encrypted with new key', async () => {
      // Encrypt with new method
      const newKey = await deriveUserKey(testUserId)
      const encryptedData = await encrypt(testData, newKey)

      const needs = await needsMigration(testUserId, encryptedData)
      expect(needs).toBe(false)
    })

    it('should return true for data encrypted with old key', async () => {
      // Encrypt with old method
      const oldKey = await deriveUserKeyOld(testUserId)
      const encryptedData = await encrypt(testData, oldKey)

      const needs = await needsMigration(testUserId, encryptedData)
      expect(needs).toBe(true)
    })

    it('should throw for corrupted data', async () => {
      const corruptedData = 'not-valid-encrypted-data'
      await expect(needsMigration(testUserId, corruptedData)).rejects.toThrow(
        'Data corruption - cannot decrypt with old or new key'
      )
    })
  })

  describe('migrateEncryptedData', () => {
    it('should successfully migrate data from old to new encryption', async () => {
      // Encrypt with old method
      const oldKey = await deriveUserKeyOld(testUserId)
      const oldEncrypted = await encrypt(testData, oldKey)

      // Migrate
      const newEncrypted = await migrateEncryptedData(testUserId, oldEncrypted)

      // Verify can decrypt with new key
      const newKey = await deriveUserKey(testUserId)
      const decrypted = await decrypt(newEncrypted, newKey)
      expect(decrypted).toBe(testData)

      // Verify cannot decrypt with old key
      await expect(decrypt(newEncrypted, oldKey)).rejects.toThrow()
    })
  })

  describe('migrateAllUserData', () => {
    it('should migrate all user data keys', async () => {
      // Mock KV store
      const mockKVStore: IKVStore = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        getImplementationName: vi.fn().mockReturnValue('MockKVStore'),
      }

      // Setup old encrypted data
      const oldKey = await deriveUserKeyOld(testUserId)
      const apiKeysData = await encrypt('{"openai": "sk-123"}', oldKey)
      const settingsData = await encrypt('{"theme": "dark"}', oldKey)

      // Mock KV store responses
      vi.mocked(mockKVStore.get).mockImplementation(async (key) => {
        if (key === `apikeys:${testUserId}`) return apiKeysData
        if (key === `settings:${testUserId}`) return settingsData
        return null
      })

      // Run migration
      const result = await migrateAllUserData(testUserId, mockKVStore)

      // Verify results
      expect(result.success).toBe(true)
      expect(result.migratedKeys).toContain(`apikeys:${testUserId}`)
      expect(result.migratedKeys).toContain(`settings:${testUserId}`)
      expect(result.failedKeys).toHaveLength(0)

      // Verify data was re-saved
      expect(mockKVStore.set).toHaveBeenCalledTimes(2)

      // Verify the saved data can be decrypted with new key
      const savedApiKeys = vi.mocked(mockKVStore.set).mock.calls[0][1]
      const savedSettings = vi.mocked(mockKVStore.set).mock.calls[1][1]

      const newKey = await deriveUserKey(testUserId)
      const decryptedApiKeys = await decrypt(savedApiKeys, newKey)
      const decryptedSettings = await decrypt(savedSettings, newKey)

      expect(decryptedApiKeys).toBe('{"openai": "sk-123"}')
      expect(decryptedSettings).toBe('{"theme": "dark"}')
    })

    it('should handle missing data gracefully', async () => {
      const mockKVStore: IKVStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        del: vi.fn(),
        getImplementationName: vi.fn().mockReturnValue('MockKVStore'),
      }

      const result = await migrateAllUserData(testUserId, mockKVStore)

      expect(result.success).toBe(true)
      expect(result.migratedKeys).toHaveLength(0)
      expect(result.failedKeys).toHaveLength(0)
    })

    it('should handle partial failures', async () => {
      const mockKVStore: IKVStore = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        getImplementationName: vi.fn().mockReturnValue('MockKVStore'),
      }

      const oldKey = await deriveUserKeyOld(testUserId)
      const validData = await encrypt('{"valid": true}', oldKey)
      const settingsData = await encrypt('{"theme": "dark"}', oldKey)

      vi.mocked(mockKVStore.get).mockImplementation(async (key) => {
        if (key === `apikeys:${testUserId}`) return validData
        if (key === `settings:${testUserId}`) return settingsData
        return null
      })

      // Make set fail for settings key to simulate partial failure
      vi.mocked(mockKVStore.set).mockImplementation(async (key, value) => {
        if (key === `settings:${testUserId}`) {
          throw new Error('Storage error')
        }
      })

      const result = await migrateAllUserData(testUserId, mockKVStore)

      expect(result.success).toBe(false)
      expect(result.migratedKeys).toContain(`apikeys:${testUserId}`)
      expect(result.failedKeys).toContain(`settings:${testUserId}`)
      expect(result.errors[`settings:${testUserId}`]).toBe('Storage error')
    })
  })

  describe('Migration flags', () => {
    it('should check and set migration completion flag', async () => {
      const mockKVStore: IKVStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        del: vi.fn(),
        getImplementationName: vi.fn().mockReturnValue('MockKVStore'),
      }

      // Check not migrated
      const notMigrated = await isMigrationCompleted(testUserId, mockKVStore)
      expect(notMigrated).toBe(false)

      // Set as migrated
      await setMigrationCompleted(testUserId, mockKVStore)
      expect(mockKVStore.set).toHaveBeenCalledWith(
        `crypto_migration_completed:${testUserId}`,
        'true'
      )

      // Check migrated
      vi.mocked(mockKVStore.get).mockResolvedValue('true')
      const migrated = await isMigrationCompleted(testUserId, mockKVStore)
      expect(migrated).toBe(true)
    })
  })
})
// ==================== END OF TEMPORARY TEST FILE ====================
