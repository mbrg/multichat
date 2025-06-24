/**
 * KV Store Interface
 *
 * This interface defines the contract for key-value storage,
 * allowing us to swap between different implementations
 * (local development, cloud production, testing, etc.)
 */

export interface IKVStore {
  /**
   * Retrieve a value by key
   */
  get<T = any>(key: string): Promise<T | null>

  /**
   * Store a value with a key
   */
  set(key: string, value: any): Promise<void>

  /**
   * Delete a value by key
   */
  del(key: string): Promise<void>

  /**
   * Get implementation name for logging/debugging
   */
  getImplementationName(): string
}
