/**
 * CloudStorage - Legacy wrapper for backward compatibility
 *
 * This class maintains the original API while delegating to the new split endpoints.
 * New code should use CloudApiKeys and CloudSettings directly.
 *
 * @deprecated Use CloudApiKeys and CloudSettings instead
 */

import { CloudApiKeys, ApiKeyStatus } from './cloudApiKeys'
import {
  CloudSettings,
  UserSettings,
  SystemInstruction,
  Temperature,
} from './cloudSettings'

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
  /**
   * Stores user secrets in the cloud (legacy method)
   * This method is maintained for backward compatibility
   */
  public static async storeSecrets(secrets: UserSecrets): Promise<void> {
    // Handle API keys separately (but we can't store them from client anymore)
    // This is a breaking change but necessary for security
    if (secrets.apiKeys) {
      console.warn(
        'CloudStorage.storeSecrets: Direct API key storage is deprecated. Use individual setApiKey calls.'
      )
    }

    // Store other settings, converting from legacy format
    const settings: UserSettings = {}

    // Copy all properties except apiKeys and handle legacy systemInstructions
    Object.entries(secrets).forEach(([key, value]) => {
      if (key === 'apiKeys') {
        // Skip API keys
        return
      } else if (key === 'systemInstructions' && typeof value === 'string') {
        // Convert legacy systemInstructions to systemPrompt
        settings.systemPrompt = value
      } else if (key !== 'systemInstructions') {
        // Copy other settings as-is
        ;(settings as any)[key] = value
      }
    })

    await CloudSettings.updateSettings(settings)
  }

  /**
   * Retrieves user secrets from the cloud (legacy method)
   * Note: This will NOT return actual API keys, only their status
   */
  public static async getSecrets(): Promise<UserSecrets> {
    const [apiKeyStatus, settings] = await Promise.all([
      CloudApiKeys.getApiKeyStatus(),
      CloudSettings.getSettings(),
    ])

    // Map settings back to legacy format (excluding new types)
    const secrets: UserSecrets = {
      ...settings,
      systemInstructions: settings.systemPrompt,
    }

    // Remove new array-based properties from legacy interface
    delete (secrets as any).systemInstructions
    delete (secrets as any).temperatures
    delete (secrets as any).systemPrompt

    // Map systemPrompt back to systemInstructions for backward compatibility
    if (settings.systemPrompt !== undefined) {
      secrets.systemInstructions = settings.systemPrompt
    }

    // API keys are returned as empty strings if set (for security)
    secrets.apiKeys = {
      openai: apiKeyStatus.openai ? '***' : undefined,
      anthropic: apiKeyStatus.anthropic ? '***' : undefined,
      google: apiKeyStatus.google ? '***' : undefined,
      mistral: apiKeyStatus.mistral ? '***' : undefined,
      together: apiKeyStatus.together ? '***' : undefined,
    }

    return secrets
  }

  /**
   * Stores a specific API key in the cloud
   */
  public static async storeApiKey(
    provider: string,
    apiKey: string
  ): Promise<void> {
    await CloudApiKeys.setApiKey(provider, apiKey)
  }

  /**
   * Retrieves a specific API key from the cloud
   * Note: This will return '***' if the key exists (for security)
   */
  public static async getApiKey(provider: string): Promise<string | null> {
    const status = await CloudApiKeys.getApiKeyStatus()
    const providerKey = provider as keyof ApiKeyStatus
    return status[providerKey] ? '***' : null
  }

  /**
   * Stores system instructions in the cloud
   */
  public static async storeSystemInstructions(
    instructions: string
  ): Promise<void> {
    await CloudSettings.setSystemPrompt(instructions)
  }

  /**
   * Retrieves system instructions from the cloud
   */
  public static async getSystemInstructions(): Promise<string | null> {
    const prompt = await CloudSettings.getSystemPrompt()
    return prompt || null
  }

  /**
   * Removes a specific API key from the cloud
   */
  public static async removeApiKey(provider: string): Promise<void> {
    await CloudApiKeys.deleteApiKey(provider)
  }

  /**
   * Removes system instructions from the cloud
   */
  public static async removeSystemInstructions(): Promise<void> {
    await CloudSettings.deleteSetting('systemPrompt')
  }

  /**
   * Removes a specific secret by key
   */
  public static async removeSecret(key: string): Promise<void> {
    // Check if it's an API key provider
    const apiKeyProviders = [
      'openai',
      'anthropic',
      'google',
      'mistral',
      'together',
    ]
    if (apiKeyProviders.includes(key)) {
      await CloudApiKeys.deleteApiKey(key)
    } else {
      // Handle special mappings
      const settingKey = key === 'systemInstructions' ? 'systemPrompt' : key
      await CloudSettings.deleteSetting(settingKey)
    }
  }

  /**
   * Clears all user secrets from the cloud
   */
  public static async clearAllSecrets(): Promise<void> {
    await Promise.all([
      CloudApiKeys.deleteAllApiKeys(),
      CloudSettings.deleteAllSettings(),
    ])
  }

  /**
   * Checks if the user is authenticated for cloud storage
   */
  public static async isAuthenticated(): Promise<boolean> {
    try {
      // Try to get API key status as a simple auth check
      await CloudApiKeys.getApiKeyStatus()
      return true
    } catch {
      return false
    }
  }

  /**
   * Gets all API keys as a simple object
   * Note: Returns masked values for security
   */
  public static async getAllApiKeys(): Promise<Record<string, string>> {
    const status = await CloudApiKeys.getApiKeyStatus()
    const maskedKeys: Record<string, string> = {}

    Object.entries(status).forEach(([provider, isSet]) => {
      if (isSet) {
        maskedKeys[provider] = '***'
      }
    })

    return maskedKeys
  }

  /**
   * Checks if a specific API key exists
   */
  public static async hasApiKey(provider: string): Promise<boolean> {
    const status = await CloudApiKeys.getApiKeyStatus()
    const providerKey = provider as keyof ApiKeyStatus
    return status[providerKey] || false
  }

  /**
   * Stores a generic secret in the cloud
   */
  public static async storeSecret(key: string, value: string): Promise<void> {
    // Handle special mappings
    const settingKey = key === 'systemInstructions' ? 'systemPrompt' : key
    await CloudSettings.updateSettings({ [settingKey]: value })
  }

  /**
   * Retrieves a generic secret from the cloud
   */
  public static async getSecret(key: string): Promise<string | null> {
    // Handle special mappings
    const settingKey = key === 'systemInstructions' ? 'systemPrompt' : key
    const settings = await CloudSettings.getSettings()
    return settings[settingKey] || null
  }

  /**
   * Gets a summary of stored secrets (without exposing the actual values)
   */
  public static async getSecretsSummary(): Promise<{
    hasApiKeys: boolean
    apiKeyProviders: string[]
    hasSystemInstructions: boolean
  }> {
    const [apiKeyStatus, settings] = await Promise.all([
      CloudApiKeys.getApiKeyStatus(),
      CloudSettings.getSettings(),
    ])

    const apiKeyProviders = Object.entries(apiKeyStatus)
      .filter(([_, isSet]) => isSet)
      .map(([provider]) => provider)

    return {
      hasApiKeys: apiKeyProviders.length > 0,
      apiKeyProviders,
      hasSystemInstructions: Boolean(settings.systemPrompt),
    }
  }
}
