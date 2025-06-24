/**
 * Storage service factory
 *
 * Provides the appropriate storage implementation based on authentication state.
 * This creates a clean separation between the storage interface and implementation.
 */

import { ApiKeyStorage } from '../types/storage'
import { CloudStorage } from '../utils/cloudStorage'

/**
 * Environment variables storage implementation
 * Used as fallback when not authenticated
 */
class EnvironmentStorage implements ApiKeyStorage {
  async storeApiKey(_provider: string, _apiKey: string): Promise<void> {
    // Environment storage is read-only
    console.warn(
      'Cannot store API keys in environment storage - authentication required'
    )
  }

  async getApiKey(provider: string): Promise<string | null> {
    const envKeyMap: Record<string, string> = {
      openai: 'NEXT_PUBLIC_OPENAI',
      anthropic: 'NEXT_PUBLIC_ANTHROPIC',
      google: 'NEXT_PUBLIC_GOOGLE',
      mistral: 'NEXT_PUBLIC_MISTRAL',
      together: 'NEXT_PUBLIC_TOGETHER',
    }

    const envVarName = envKeyMap[provider]
    if (envVarName) {
      return process.env[envVarName] || null
    }
    return null
  }

  async getAllApiKeys(): Promise<Record<string, string>> {
    const providers = ['openai', 'anthropic', 'google', 'mistral', 'together']
    const keys: Record<string, string> = {}

    for (const provider of providers) {
      const key = await this.getApiKey(provider)
      if (key) {
        keys[provider] = key
      }
    }

    return keys
  }

  async removeApiKey(_provider: string): Promise<void> {
    // Environment storage is read-only
    console.warn('Cannot remove API keys from environment storage')
  }

  async clearAllSecrets(): Promise<void> {
    // Environment storage is read-only
    console.warn('Cannot clear environment storage')
  }

  async isAuthenticated(): Promise<boolean> {
    return false
  }
}

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
}

/**
 * Storage factory that provides the appropriate storage implementation
 */
export class StorageService {
  private static cloudStorage = new CloudStorageAdapter()
  private static envStorage = new EnvironmentStorage()

  /**
   * Get storage implementation based on authentication state
   */
  static async getStorage(): Promise<ApiKeyStorage> {
    const isAuthenticated = await this.cloudStorage.isAuthenticated()

    if (isAuthenticated) {
      return this.cloudStorage
    }

    // In development, allow environment variables
    if (process.env.NODE_ENV === 'development') {
      return this.envStorage
    }

    // In production, require authentication
    return this.cloudStorage
  }

  /**
   * Get cloud storage implementation directly (for testing)
   */
  static getCloudStorage(): ApiKeyStorage {
    return this.cloudStorage
  }

  /**
   * Get environment storage implementation directly (for testing)
   */
  static getEnvironmentStorage(): ApiKeyStorage {
    return this.envStorage
  }
}
