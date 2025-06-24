/**
 * Server-side API key access utilities
 *
 * Provides secure access to API keys on the server-side by reading from:
 * 1. User's encrypted cloud storage (when user session is available)
 * 2. Environment variables (fallback, development mode)
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
   * Get API key for a specific provider
   * Attempts to load from user's cloud storage, falls back to environment variables
   */
  static async getApiKey(provider: string): Promise<string | null> {
    try {
      // Try to get from user's encrypted storage first
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
            console.log(
              `[ServerKeys] Using cloud storage API key for ${provider}`
            )
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

    // Fallback to environment variables
    const envKeyMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      together: 'TOGETHER_API_KEY',
    }

    const envVarName = envKeyMap[provider]
    if (envVarName) {
      const envKey = process.env[envVarName]
      if (envKey) {
        console.log(
          `[ServerKeys] Using environment variable ${envVarName} for ${provider}`
        )
        return envKey
      }
    }

    console.warn(`[ServerKeys] No API key found for ${provider}`)
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
