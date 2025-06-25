import { getKVStore } from './kv'
import { deriveUserKey, encrypt, decrypt } from '../utils/crypto'

/**
 * Generic service for managing encrypted user data in KV store.
 * Eliminates duplication across API routes while maintaining security.
 */
export class EncryptedDataService<T = Record<string, any>> {
  private readonly keyPrefix: string
  private readonly defaultValue: T

  constructor(keyPrefix: string, defaultValue: T) {
    this.keyPrefix = keyPrefix
    this.defaultValue = defaultValue
  }

  /**
   * Retrieve encrypted data for a user
   */
  async getData(userId: string): Promise<T> {
    const kvStore = await getKVStore()
    const encryptedData = await kvStore.get<string>(
      `${this.keyPrefix}:${userId}`
    )
    if (!encryptedData) return this.defaultValue

    const userKey = await deriveUserKey(userId)
    const decryptedData = await decrypt(encryptedData, userKey)
    return JSON.parse(decryptedData)
  }

  /**
   * Save encrypted data for a user
   */
  async saveData(userId: string, data: T): Promise<void> {
    const kvStore = await getKVStore()
    const userKey = await deriveUserKey(userId)
    const encryptedData = await encrypt(JSON.stringify(data), userKey)
    await kvStore.set(`${this.keyPrefix}:${userId}`, encryptedData)
  }

  /**
   * Delete all data for a user
   */
  async deleteData(userId: string): Promise<void> {
    const kvStore = await getKVStore()
    await kvStore.del(`${this.keyPrefix}:${userId}`)
  }

  /**
   * Update partial data for a user (merge with existing)
   */
  async updatePartial(userId: string, updates: Partial<T>): Promise<T> {
    const existingData = await this.getData(userId)
    const mergedData = { ...existingData, ...updates } as T
    await this.saveData(userId, mergedData)
    return mergedData
  }

  /**
   * Check if user has any data stored
   */
  async hasData(userId: string): Promise<boolean> {
    const kvStore = await getKVStore()
    const encryptedData = await kvStore.get<string>(
      `${this.keyPrefix}:${userId}`
    )
    return !!encryptedData
  }

  /**
   * Delete a specific key from user's data
   */
  async deleteKey(userId: string, key: keyof T): Promise<T> {
    const existingData = await this.getData(userId)
    const updatedData = { ...existingData }
    delete updatedData[key]
    await this.saveData(userId, updatedData)
    return updatedData
  }
}

import { UserSettings } from '../types/settings'

// Pre-configured service instances for common data types
export interface ApiKeyData {
  [key: string]: string
}

// Export pre-configured instances
export const ApiKeysService = new EncryptedDataService<ApiKeyData>(
  'apikeys',
  {}
)
export const SettingsService = new EncryptedDataService<UserSettings>(
  'settings',
  {}
)
