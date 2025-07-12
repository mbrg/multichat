// ==================== TEMPORARY MIGRATION CODE - REMOVE AFTER ALL USERS MIGRATED ====================
// This file contains temporary migration code to re-encrypt user data with the new PBKDF2 key derivation
// Migration date: 2025-01-12
// Can be removed after: 2025-02-12 (1 month after deployment)
// ====================================================================================================

import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  pbkdf2,
} from 'crypto'
import { promisify } from 'util'
import { deriveUserKey, encrypt, decrypt } from './crypto'
import { log, LoggingService } from '../services/LoggingService'
import type { IKVStore } from '../services/kv/IKVStore'

const pbkdf2Async = promisify(pbkdf2)

// ==================== OLD KEY DERIVATION (SHA-256) - DO NOT USE FOR NEW DATA ====================
export async function deriveUserKeyOld(userId: string): Promise<Buffer> {
  const encryptionSecret = process.env.KV_ENCRYPTION_KEY
  if (!encryptionSecret) {
    throw new Error('KV_ENCRYPTION_KEY environment variable is required')
  }

  const key = createHash('sha256')
    .update(userId + encryptionSecret)
    .digest()

  return Promise.resolve(key)
}

// ==================== MIGRATION DETECTION ====================
export async function needsMigration(
  userId: string,
  encryptedData: string
): Promise<boolean> {
  try {
    // Try to decrypt with new key derivation
    const newKey = await deriveUserKey(userId)
    await decrypt(encryptedData, newKey)
    log.info('[MIGRATION] User already using new key derivation', { userId })
    return false
  } catch (error) {
    // If decryption fails, try with old key
    try {
      const oldKey = await deriveUserKeyOld(userId)
      await decrypt(encryptedData, oldKey)
      log.warn('[MIGRATION] User needs migration from old key derivation', {
        userId,
      })
      return true
    } catch (error) {
      log.error(
        '[MIGRATION] Data cannot be decrypted with either key',
        error as Error,
        { userId }
      )
      throw new Error('Data corruption - cannot decrypt with old or new key')
    }
  }
}

// ==================== MIGRATION FUNCTION ====================
export async function migrateEncryptedData(
  userId: string,
  encryptedData: string
): Promise<string> {
  const startTime = Date.now()
  log.info('[MIGRATION] Starting data migration', { userId })

  try {
    // Decrypt with old key
    const oldKey = await deriveUserKeyOld(userId)
    const decryptedData = await decrypt(encryptedData, oldKey)
    log.debug('[MIGRATION] Successfully decrypted data with old key', {
      userId,
    })

    // Re-encrypt with new key
    const newKey = await deriveUserKey(userId)
    const newEncryptedData = await encrypt(decryptedData, newKey)

    const duration = Date.now() - startTime
    log.info('[MIGRATION] Successfully re-encrypted data with new key', {
      userId,
      duration,
      dataSize: encryptedData.length,
    })

    // Log performance metrics
    log.performance({
      operation: 'crypto_migration',
      duration,
      success: true,
      metadata: { userId, dataSize: encryptedData.length },
    })

    return newEncryptedData
  } catch (error) {
    const duration = Date.now() - startTime
    log.error('[MIGRATION] Failed to migrate data', error as Error, {
      userId,
      duration,
    })

    // Log performance metrics for failure
    log.performance({
      operation: 'crypto_migration',
      duration,
      success: false,
      metadata: { userId, error: (error as Error).message },
    })

    throw error
  }
}

// ==================== BATCH MIGRATION FOR ALL USER DATA ====================
export interface MigrationResult {
  success: boolean
  migratedKeys: string[]
  failedKeys: string[]
  errors: Record<string, string>
}

export async function migrateAllUserData(
  userId: string,
  kvStore: IKVStore
): Promise<MigrationResult> {
  const startTime = Date.now()
  log.info('[MIGRATION] Starting full data migration for user', { userId })

  const result: MigrationResult = {
    success: true,
    migratedKeys: [],
    failedKeys: [],
    errors: {},
  }

  try {
    // Get all possible keys for this user
    const keysToMigrate = [
      `apikeys:${userId}`,
      `settings:${userId}`,
      `conversations:${userId}`,
    ]

    for (const key of keysToMigrate) {
      try {
        const data = await kvStore.get(key)
        if (!data) {
          log.debug('[MIGRATION] No data found for key', { key, userId })
          continue
        }

        // Check if migration is needed
        const needsMig = await needsMigration(userId, data)
        if (!needsMig) {
          log.debug('[MIGRATION] Key already migrated', { key, userId })
          continue
        }

        // Migrate the data
        const migratedData = await migrateEncryptedData(userId, data)

        // Save the migrated data
        await kvStore.set(key, migratedData)

        result.migratedKeys.push(key)
        log.info('[MIGRATION] Successfully migrated key', { key, userId })

        // Log business event for tracking
        log.business('crypto_key_migrated', 1, { userId, key })
      } catch (error) {
        result.success = false
        result.failedKeys.push(key)
        result.errors[key] =
          error instanceof Error ? error.message : String(error)
        log.error('[MIGRATION] Failed to migrate key', error as Error, {
          key,
          userId,
        })
      }
    }

    const duration = Date.now() - startTime

    // Log final result
    log.info('[MIGRATION] Migration completed for user', {
      userId,
      success: result.success,
      duration,
      migratedCount: result.migratedKeys.length,
      failedCount: result.failedKeys.length,
      migratedKeys: result.migratedKeys,
      failedKeys: result.failedKeys,
    })

    // Log business metrics
    log.business('crypto_migration_completed', result.migratedKeys.length, {
      userId,
      success: result.success,
      duration,
      failedCount: result.failedKeys.length,
    })

    // Log security event
    const logger = LoggingService.getInstance()
    logger.logSecurityEvent('user_data_encryption_migrated', {
      userId,
      migratedKeys: result.migratedKeys.length,
      success: result.success,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    log.critical(
      '[MIGRATION] Catastrophic failure during migration',
      error as Error,
      {
        userId,
        duration,
      }
    )
    throw error
  }
}

// ==================== MIGRATION FLAG MANAGEMENT ====================
// Track which users have been migrated to avoid repeated attempts
const MIGRATION_FLAG_KEY = 'crypto_migration_completed'

export async function isMigrationCompleted(
  userId: string,
  kvStore: IKVStore
): Promise<boolean> {
  try {
    const flag = await kvStore.get(`${MIGRATION_FLAG_KEY}:${userId}`)
    return flag === 'true'
  } catch (error) {
    log.error('[MIGRATION] Failed to check migration flag', error as Error, {
      userId,
    })
    return false
  }
}

export async function setMigrationCompleted(
  userId: string,
  kvStore: IKVStore
): Promise<void> {
  try {
    await kvStore.set(`${MIGRATION_FLAG_KEY}:${userId}`, 'true')
    log.info('[MIGRATION] Set migration completed flag', { userId })
  } catch (error) {
    log.error('[MIGRATION] Failed to set migration flag', error as Error, {
      userId,
    })
    throw error
  }
}

// ==================== END OF TEMPORARY MIGRATION CODE ====================
