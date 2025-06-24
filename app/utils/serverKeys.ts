/**
 * Server-side API key access utilities
 *
 * Provides secure access to API keys on the server-side by reading from
 * user's encrypted cloud storage when user session is available.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '../lib/auth'
import { getKVStore } from '../services/kv'
import { deriveUserKey, decrypt } from './crypto'

interface ApiKeyData {
  [key: string]: string
}

async function getApiKeysData(userId: string): Promise<ApiKeyData> {
  const kvStore = await getKVStore()
  const encryptedData = await kvStore.get<string>(`apikeys:${userId}`)
  if (!encryptedData) return {}

  const userKey = await deriveUserKey(userId)
  const decryptedData = await decrypt(encryptedData, userKey)
  return JSON.parse(decryptedData)
}

export class ServerKeys {
  /**
   * Get API key for a specific provider from user's cloud storage
   */
  static async getApiKey(provider: string): Promise<string | null> {
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const apiKeysData = await getApiKeysData(session.user.id)
        const apiKey = apiKeysData[provider]
        if (apiKey) {
          return apiKey
        }
      }
    } catch (error) {
      console.warn(
        `[ServerKeys] Failed to load ${provider} key from cloud storage:`,
        error
      )
    }

    return null
  }

  /**
   * Check if an API key exists for a provider
   */
  static async hasApiKey(provider: string): Promise<boolean> {
    const key = await this.getApiKey(provider)
    return key !== null && key.length > 0
  }

  /**
   * Get all available API keys
   */
  static async getAllApiKeys(): Promise<Record<string, string>> {
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const apiKeysData = await getApiKeysData(session.user.id)
        // Filter out any empty/null values
        const validKeys: Record<string, string> = {}
        Object.entries(apiKeysData).forEach(([provider, key]) => {
          if (key && key.trim()) {
            validKeys[provider] = key
          }
        })
        return validKeys
      }
    } catch (error) {
      console.warn(
        '[ServerKeys] Failed to load API keys from cloud storage:',
        error
      )
    }

    return {}
  }
}
