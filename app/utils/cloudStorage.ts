/**
 * CloudStorage - Server-side encrypted storage for user secrets
 *
 * This utility provides secure cloud storage for API keys and system instructions using:
 * - Vercel KV for persistence
 * - Server-side encryption with user-specific keys
 * - NextAuth.js session-based authentication
 * - No client-side exposure of secrets
 */

// CloudStorage provides static methods for server-side encrypted storage

export interface UserSecrets {
  apiKeys?: {
    openai?: string
    anthropic?: string
    google?: string
    mistral?: string
    together?: string
  }
  systemInstructions?: string
  [key: string]: any
}

export class CloudStorage {
  private static readonly API_BASE = '/api/secrets'

  /**
   * Stores user secrets in the cloud
   */
  public static async storeSecrets(secrets: UserSecrets): Promise<void> {
    const response = await fetch(this.API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secrets }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to store secrets')
    }
  }

  /**
   * Retrieves user secrets from the cloud
   */
  public static async getSecrets(): Promise<UserSecrets> {
    const response = await fetch(this.API_BASE, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to retrieve secrets')
    }

    const data = await response.json()
    return data.secrets || {}
  }

  /**
   * Stores a specific API key in the cloud
   */
  public static async storeApiKey(
    provider: string,
    apiKey: string
  ): Promise<void> {
    const secrets = await this.getSecrets()

    if (!secrets.apiKeys) {
      secrets.apiKeys = {}
    }

    secrets.apiKeys[provider] = apiKey
    await this.storeSecrets(secrets)
  }

  /**
   * Retrieves a specific API key from the cloud
   */
  public static async getApiKey(provider: string): Promise<string | null> {
    const secrets = await this.getSecrets()
    return secrets.apiKeys?.[provider] || null
  }

  /**
   * Stores system instructions in the cloud
   */
  public static async storeSystemInstructions(
    instructions: string
  ): Promise<void> {
    const secrets = await this.getSecrets()
    secrets.systemInstructions = instructions
    await this.storeSecrets(secrets)
  }

  /**
   * Retrieves system instructions from the cloud
   */
  public static async getSystemInstructions(): Promise<string | null> {
    const secrets = await this.getSecrets()
    return secrets.systemInstructions || null
  }

  /**
   * Removes a specific API key from the cloud
   */
  public static async removeApiKey(provider: string): Promise<void> {
    const secrets = await this.getSecrets()

    if (secrets.apiKeys && secrets.apiKeys[provider]) {
      delete secrets.apiKeys[provider]
      await this.storeSecrets(secrets)
    }
  }

  /**
   * Removes system instructions from the cloud
   */
  public static async removeSystemInstructions(): Promise<void> {
    const secrets = await this.getSecrets()
    delete secrets.systemInstructions
    await this.storeSecrets(secrets)
  }

  /**
   * Removes a specific secret by key
   */
  public static async removeSecret(key: string): Promise<void> {
    const response = await fetch(
      `${this.API_BASE}?key=${encodeURIComponent(key)}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove secret')
    }
  }

  /**
   * Clears all user secrets from the cloud
   */
  public static async clearAllSecrets(): Promise<void> {
    const response = await fetch(this.API_BASE, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to clear secrets')
    }
  }

  /**
   * Checks if the user is authenticated for cloud storage
   */
  public static async isAuthenticated(): Promise<boolean> {
    try {
      const response = await fetch(this.API_BASE, {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Migrates secrets from local storage to cloud storage
   */
  public static async migrateFromLocal(
    localSecrets: UserSecrets
  ): Promise<void> {
    if (Object.keys(localSecrets).length === 0) {
      return
    }

    const cloudSecrets = await this.getSecrets()

    // Merge local secrets with cloud secrets (cloud takes precedence)
    const mergedSecrets = {
      ...localSecrets,
      ...cloudSecrets,
      apiKeys: {
        ...localSecrets.apiKeys,
        ...cloudSecrets.apiKeys,
      },
    }

    await this.storeSecrets(mergedSecrets)
  }

  /**
   * Gets all API keys as a simple object
   */
  public static async getAllApiKeys(): Promise<Record<string, string>> {
    const secrets = await this.getSecrets()
    return secrets.apiKeys || {}
  }

  /**
   * Checks if a specific API key exists
   */
  public static async hasApiKey(provider: string): Promise<boolean> {
    const apiKey = await this.getApiKey(provider)
    return apiKey !== null && apiKey.length > 0
  }

  /**
   * Gets a summary of stored secrets (without exposing the actual values)
   */
  public static async getSecretsSummary(): Promise<{
    hasApiKeys: boolean
    apiKeyProviders: string[]
    hasSystemInstructions: boolean
  }> {
    const secrets = await this.getSecrets()

    return {
      hasApiKeys: Boolean(
        secrets.apiKeys && Object.keys(secrets.apiKeys).length > 0
      ),
      apiKeyProviders: Object.keys(secrets.apiKeys || {}),
      hasSystemInstructions: Boolean(secrets.systemInstructions),
    }
  }
}
