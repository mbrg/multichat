/**
 * Storage interface for API key management
 *
 * This interface defines the contract for storing and retrieving API keys,
 * allowing different implementations (cloud, local, etc.) without coupling
 * to specific storage mechanisms.
 */

export interface ApiKeyStorage {
  /**
   * Store an API key for a specific provider
   */
  storeApiKey(provider: string, apiKey: string): Promise<void>

  /**
   * Retrieve an API key for a specific provider
   */
  getApiKey(provider: string): Promise<string | null>

  /**
   * Get all stored API keys
   */
  getAllApiKeys(): Promise<Record<string, string>>

  /**
   * Remove an API key for a specific provider
   */
  removeApiKey(provider: string): Promise<void>

  /**
   * Clear all stored secrets
   */
  clearAllSecrets(): Promise<void>

  /**
   * Check if the user is authenticated for this storage method
   */
  isAuthenticated(): Promise<boolean>
}
