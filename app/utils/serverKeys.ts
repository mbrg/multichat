/**
 * Server-side API key access utilities
 *
 * Provides secure access to API keys on the server-side by reading from
 * user's encrypted cloud storage when user session is available.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '../lib/auth'
import { getKVStore } from '../services/kv'
import { createHash, createDecipheriv } from 'crypto'

// Derive a user-specific encryption key from user ID and dedicated encryption secret
function deriveUserKey(userId: string): Buffer {
  const encryptionSecret = process.env.KV_ENCRYPTION_KEY
  if (!encryptionSecret) {
    throw new Error('KV_ENCRYPTION_KEY environment variable is required')
  }

  return createHash('sha256')
    .update(userId + encryptionSecret)
    .digest()
}

// Decrypt data with user-specific key
function decryptData(encryptedData: string, userId: string): string {
  const key = deriveUserKey(userId)
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export class ServerKeys {
  /**
   * Get API key for a specific provider from user's cloud storage
   */
  static async getApiKey(provider: string): Promise<string | null> {
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const userKey = `secrets:${session.user.id}`
        const kvStore = await getKVStore()
        const encryptedSecrets = await kvStore.get<string>(userKey)

        if (encryptedSecrets) {
          const decryptedSecrets = decryptData(
            encryptedSecrets,
            session.user.id
          )
          const secrets = JSON.parse(decryptedSecrets)

          const apiKey = secrets.apiKeys?.[provider]
          if (apiKey) {
            return apiKey
          }
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
}
