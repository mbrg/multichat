/**
 * StorageMigration - Utilities for migrating between local and cloud storage
 *
 * This utility helps migrate user secrets between local storage (crypto.ts)
 * and cloud storage (cloudStorage.ts) while maintaining data integrity.
 */

import { SecureStorage } from './crypto'
import { CloudStorage, UserSecrets } from './cloudStorage'

export interface MigrationStatus {
  hasLocalSecrets: boolean
  hasCloudSecrets: boolean
  canMigrate: boolean
  isAuthenticated: boolean
}

export class StorageMigration {
  // Common keys used in local storage for secrets
  private static readonly LOCAL_STORAGE_KEYS = [
    'openai_api_key',
    'anthropic_api_key',
    'google_api_key',
    'mistral_api_key',
    'together_api_key',
    'system_instructions',
  ]

  /**
   * Gets migration status - what's available locally vs cloud
   */
  public static async getMigrationStatus(): Promise<MigrationStatus> {
    const hasLocalSecrets = await this.hasLocalSecrets()
    const isAuthenticated = await CloudStorage.isAuthenticated()

    let hasCloudSecrets = false
    if (isAuthenticated) {
      try {
        const cloudSecrets = await CloudStorage.getSecrets()
        hasCloudSecrets = Object.keys(cloudSecrets).length > 0
      } catch {
        hasCloudSecrets = false
      }
    }

    return {
      hasLocalSecrets,
      hasCloudSecrets,
      canMigrate: hasLocalSecrets && isAuthenticated,
      isAuthenticated,
    }
  }

  /**
   * Checks if there are any secrets stored locally
   */
  private static async hasLocalSecrets(): Promise<boolean> {
    try {
      for (const key of this.LOCAL_STORAGE_KEYS) {
        const value = await SecureStorage.decryptAndRetrieve(key)
        if (value && value.trim().length > 0) {
          return true
        }
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Extracts all secrets from local storage
   */
  public static async extractLocalSecrets(): Promise<UserSecrets> {
    const secrets: UserSecrets = {}

    try {
      // Extract API keys
      const apiKeys: Record<string, string> = {}

      for (const provider of [
        'openai',
        'anthropic',
        'google',
        'mistral',
        'together',
      ]) {
        const key = `${provider}_api_key`
        const value = await SecureStorage.decryptAndRetrieve(key)
        if (value && value.trim().length > 0) {
          apiKeys[provider] = value.trim()
        }
      }

      if (Object.keys(apiKeys).length > 0) {
        secrets.apiKeys = apiKeys
      }

      // Extract system instructions
      const systemInstructions = await SecureStorage.decryptAndRetrieve(
        'system_instructions'
      )
      if (systemInstructions && systemInstructions.trim().length > 0) {
        secrets.systemInstructions = systemInstructions.trim()
      }

      return secrets
    } catch (error) {
      console.error('Error extracting local secrets:', error)
      return {}
    }
  }

  /**
   * Migrates secrets from local to cloud storage
   */
  public static async migrateToCloud(): Promise<{
    success: boolean
    migratedKeys: string[]
    errors: string[]
  }> {
    const result = {
      success: false,
      migratedKeys: [] as string[],
      errors: [] as string[],
    }

    try {
      // Check if migration is possible
      const status = await this.getMigrationStatus()
      if (!status.canMigrate) {
        result.errors.push(
          'Cannot migrate: authentication required or no local secrets found'
        )
        return result
      }

      // Extract local secrets
      const localSecrets = await this.extractLocalSecrets()
      if (Object.keys(localSecrets).length === 0) {
        result.errors.push('No local secrets found to migrate')
        return result
      }

      // Migrate to cloud
      await CloudStorage.migrateFromLocal(localSecrets)

      // Track what was migrated
      if (localSecrets.apiKeys) {
        result.migratedKeys.push(
          ...Object.keys(localSecrets.apiKeys).map((k) => `${k}_api_key`)
        )
      }
      if (localSecrets.systemInstructions) {
        result.migratedKeys.push('system_instructions')
      }

      result.success = true
      return result
    } catch (error) {
      result.errors.push(
        `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return result
    }
  }

  /**
   * Clears local secrets after successful migration
   */
  public static async clearLocalSecretsAfterMigration(): Promise<{
    success: boolean
    clearedKeys: string[]
    errors: string[]
  }> {
    const result = {
      success: false,
      clearedKeys: [] as string[],
      errors: [] as string[],
    }

    try {
      for (const key of this.LOCAL_STORAGE_KEYS) {
        try {
          const value = await SecureStorage.decryptAndRetrieve(key)
          if (value) {
            SecureStorage.remove(key)
            result.clearedKeys.push(key)
          }
        } catch (error) {
          result.errors.push(
            `Failed to clear ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      result.success = result.errors.length === 0
      return result
    } catch (error) {
      result.errors.push(
        `Clear operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return result
    }
  }

  /**
   * Performs a complete migration: local to cloud, then clear local
   */
  public static async performFullMigration(): Promise<{
    success: boolean
    migratedKeys: string[]
    clearedKeys: string[]
    errors: string[]
  }> {
    const result = {
      success: false,
      migratedKeys: [] as string[],
      clearedKeys: [] as string[],
      errors: [] as string[],
    }

    // Step 1: Migrate to cloud
    const migrationResult = await this.migrateToCloud()
    result.migratedKeys = migrationResult.migratedKeys
    result.errors.push(...migrationResult.errors)

    if (!migrationResult.success) {
      return result
    }

    // Step 2: Clear local storage
    const clearResult = await this.clearLocalSecretsAfterMigration()
    result.clearedKeys = clearResult.clearedKeys
    result.errors.push(...clearResult.errors)

    result.success = migrationResult.success && clearResult.success
    return result
  }

  /**
   * Creates a backup of local secrets before migration
   */
  public static async createLocalBackup(): Promise<{
    success: boolean
    backup: UserSecrets
    timestamp: string
  }> {
    const timestamp = new Date().toISOString()

    try {
      const backup = await this.extractLocalSecrets()
      return {
        success: true,
        backup,
        timestamp,
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
      return {
        success: false,
        backup: {},
        timestamp,
      }
    }
  }

  /**
   * Validates that cloud storage contains the expected secrets
   */
  public static async validateCloudMigration(
    expectedSecrets: UserSecrets
  ): Promise<{
    success: boolean
    missingKeys: string[]
    errors: string[]
  }> {
    const result = {
      success: false,
      missingKeys: [] as string[],
      errors: [] as string[],
    }

    try {
      const cloudSecrets = await CloudStorage.getSecrets()

      // Check API keys
      if (expectedSecrets.apiKeys) {
        for (const [provider, expectedKey] of Object.entries(
          expectedSecrets.apiKeys
        )) {
          const cloudKey = cloudSecrets.apiKeys?.[provider]
          if (!cloudKey || cloudKey !== expectedKey) {
            result.missingKeys.push(`${provider}_api_key`)
          }
        }
      }

      // Check system instructions
      if (expectedSecrets.systemInstructions) {
        if (
          !cloudSecrets.systemInstructions ||
          cloudSecrets.systemInstructions !== expectedSecrets.systemInstructions
        ) {
          result.missingKeys.push('system_instructions')
        }
      }

      result.success = result.missingKeys.length === 0
      return result
    } catch (error) {
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return result
    }
  }
}
