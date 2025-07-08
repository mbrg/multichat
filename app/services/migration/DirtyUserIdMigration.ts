/**
 * DIRTY MIGRATION - DELETE AFTER ROLLOUT
 *
 * This migration updates user IDs from raw GitHub IDs to prefixed format (/github/{id})
 * and migrates their KV store data (settings and API keys).
 *
 * Migration: raw GitHub user ID → /github/{id}
 * Example: "12345678" → "/github/12345678"
 */

import { KVStoreFactory } from '../kv/KVStoreFactory'
import { IKVStore } from '../kv/IKVStore'
import { log } from '../LoggingService'
import { deriveUserKey, decrypt, encrypt } from '@/utils/crypto'

export class DirtyUserIdMigration {
  private kv: IKVStore | null = null

  private async getKVStore(): Promise<IKVStore> {
    if (!this.kv) {
      this.kv = await KVStoreFactory.getInstance()
    }
    return this.kv
  }

  /**
   * DIRTY MIGRATION - Run this when user logs in
   * Migrates user data from old format to new format
   */
  async migrateUserData(userId: string): Promise<void> {
    const kv = await this.getKVStore()
    // Check if user ID already has the new prefix format
    if (userId.startsWith('/github/')) {
      log.debug('User ID already has prefix, no migration needed', { userId })
      return
    }

    // This is an old format user ID - migrate it
    const newUserId = `/github/${userId}`

    log.info('Starting dirty user ID migration', {
      oldUserId: userId,
      newUserId,
      operation: 'userid_migration_start',
    })

    try {
      // Migrate settings
      await this.migrateSettings(kv, userId, newUserId)

      // Migrate API keys
      await this.migrateApiKeys(kv, userId, newUserId)

      log.info('Dirty user ID migration completed successfully', {
        oldUserId: userId,
        newUserId,
        operation: 'userid_migration_complete',
      })
    } catch (error) {
      log.error(
        'Dirty user ID migration failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          oldUserId: userId,
          newUserId,
          operation: 'userid_migration_failed',
        }
      )
      throw error
    }
  }

  private async migrateSettings(
    kv: IKVStore,
    oldUserId: string,
    newUserId: string
  ): Promise<void> {
    const oldKey = `settings:${oldUserId}`
    const newKey = `settings:${newUserId}`

    log.debug('Migrating settings data', {
      oldKey,
      newKey,
      operation: 'settings_migration',
    })

    try {
      // Check if old data exists
      const oldEncryptedData = await kv.get<string>(oldKey)
      if (!oldEncryptedData) {
        log.debug('No settings data found for old user ID', { oldUserId })
        return
      }

      // Check if new data already exists (avoid overwriting)
      const newData = await kv.get(newKey)
      if (newData) {
        log.warn(
          'New settings data already exists, cleaning up old data only',
          {
            oldUserId,
            newUserId,
          }
        )
        await kv.del(oldKey)
        return
      }

      // Decrypt with old key and re-encrypt with new key
      const oldKey_crypto = await deriveUserKey(oldUserId)
      const newKey_crypto = await deriveUserKey(newUserId)

      const decryptedData = await decrypt(oldEncryptedData, oldKey_crypto)
      const reencryptedData = await encrypt(decryptedData, newKey_crypto)

      // Store re-encrypted data under new key
      await kv.set(newKey, reencryptedData)
      await kv.del(oldKey)

      log.info('Settings data migrated successfully', {
        oldUserId,
        newUserId,
        operation: 'settings_migration_complete',
      })
    } catch (error) {
      log.error(
        'Settings migration failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          oldUserId,
          newUserId,
          operation: 'settings_migration_failed',
        }
      )
      throw error
    }
  }

  private async migrateApiKeys(
    kv: IKVStore,
    oldUserId: string,
    newUserId: string
  ): Promise<void> {
    const oldKey = `apikeys:${oldUserId}`
    const newKey = `apikeys:${newUserId}`

    log.debug('Migrating API keys data', {
      oldKey,
      newKey,
      operation: 'apikeys_migration',
    })

    try {
      // Check if old data exists
      const oldEncryptedData = await kv.get<string>(oldKey)
      if (!oldEncryptedData) {
        log.debug('No API keys data found for old user ID', { oldUserId })
        return
      }

      // Check if new data already exists (avoid overwriting)
      const newData = await kv.get(newKey)
      if (newData) {
        log.warn(
          'New API keys data already exists, cleaning up old data only',
          {
            oldUserId,
            newUserId,
          }
        )
        await kv.del(oldKey)
        return
      }

      // Decrypt with old key and re-encrypt with new key
      const oldKey_crypto = await deriveUserKey(oldUserId)
      const newKey_crypto = await deriveUserKey(newUserId)

      const decryptedData = await decrypt(oldEncryptedData, oldKey_crypto)
      const reencryptedData = await encrypt(decryptedData, newKey_crypto)

      // Store re-encrypted data under new key
      await kv.set(newKey, reencryptedData)
      await kv.del(oldKey)

      log.info('API keys data migrated successfully', {
        oldUserId,
        newUserId,
        operation: 'apikeys_migration_complete',
      })
    } catch (error) {
      log.error(
        'API keys migration failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          oldUserId,
          newUserId,
          operation: 'apikeys_migration_failed',
        }
      )
      throw error
    }
  }
}
