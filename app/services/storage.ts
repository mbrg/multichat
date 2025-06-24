/**
 * Storage service factory
 *
 * Provides cloud storage implementation for authenticated users.
 */

import { ApiKeyStorage } from '../types/storage'
import { CloudStorage } from '../utils/cloudStorage'

/**
 * Cloud storage implementation
 * Wraps the static CloudStorage class to implement the interface
 */
class CloudStorageAdapter implements ApiKeyStorage {
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    return CloudStorage.storeApiKey(provider, apiKey)
  }

  async getApiKey(provider: string): Promise<string | null> {
    return CloudStorage.getApiKey(provider)
  }

  async getAllApiKeys(): Promise<Record<string, string>> {
    return CloudStorage.getAllApiKeys()
  }

  async removeApiKey(provider: string): Promise<void> {
    return CloudStorage.removeApiKey(provider)
  }

  async clearAllSecrets(): Promise<void> {
    return CloudStorage.clearAllSecrets()
  }

  async isAuthenticated(): Promise<boolean> {
    return CloudStorage.isAuthenticated()
  }

  async storeSecret(key: string, value: string): Promise<void> {
    return CloudStorage.storeSecret(key, value)
  }

  async getSecret(key: string): Promise<string | null> {
    return CloudStorage.getSecret(key)
  }

  async removeSecret(key: string): Promise<void> {
    return CloudStorage.removeSecret(key)
  }
}

/**
 * Storage factory that provides cloud storage implementation
 */
export class StorageService {
  private static cloudStorage = new CloudStorageAdapter()

  /**
   * Get storage implementation (always cloud storage)
   */
  static async getStorage(): Promise<ApiKeyStorage> {
    return this.cloudStorage
  }

  /**
   * Get cloud storage implementation directly (for testing)
   */
  static getCloudStorage(): ApiKeyStorage {
    return this.cloudStorage
  }
}
