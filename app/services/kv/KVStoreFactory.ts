/**
 * KV Store Factory
 *
 * Factory pattern implementation for KV store selection.
 * Provides clear, testable logic for choosing between implementations.
 */

import { IKVStore } from './IKVStore'
import { LocalKVStore } from './LocalKVStore'
import { CloudKVStore } from './CloudKVStore'

export type KVStoreType = 'local' | 'cloud' | 'auto'

export interface KVEnvironment {
  NODE_ENV: string
  KV_URL?: string
  KV_REST_API_URL?: string
  KV_REST_API_TOKEN?: string
}

export class KVStoreFactory {
  private static instance: IKVStore | null = null

  /**
   * Get KV store instance (singleton pattern)
   */
  static async getInstance(type: KVStoreType = 'auto'): Promise<IKVStore> {
    if (this.instance) {
      return this.instance
    }

    this.instance = await this.createInstance(type)
    return this.instance
  }

  /**
   * Create a new KV store instance (for testing)
   */
  static async createInstance(type: KVStoreType = 'auto'): Promise<IKVStore> {
    const resolvedType = this.resolveKVType(type)

    console.log(`[KVStoreFactory] Creating ${resolvedType} KV store instance`)

    switch (resolvedType) {
      case 'local':
        return new LocalKVStore()

      case 'cloud':
        return await this.createCloudKVStore()

      default:
        throw new Error(`Unknown KV store type: ${resolvedType}`)
    }
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    console.log('[KVStoreFactory] Resetting singleton instance')
    this.instance = null
  }

  /**
   * Resolve KV type based on environment and configuration
   */
  private static resolveKVType(requestedType: KVStoreType): 'local' | 'cloud' {
    if (requestedType !== 'auto') {
      console.log(
        `[KVStoreFactory] Using explicitly requested type: ${requestedType}`
      )
      return requestedType
    }

    const env = this.getEnvironment()
    const hasCloudConfig = this.hasCloudConfiguration(env)

    console.log(`[KVStoreFactory] Environment analysis:`)
    console.log(`  NODE_ENV: ${env.NODE_ENV}`)
    console.log(`  Has KV_URL: ${Boolean(env.KV_URL)}`)
    console.log(`  Has KV_REST_API_URL: ${Boolean(env.KV_REST_API_URL)}`)
    console.log(`  Has KV_REST_API_TOKEN: ${Boolean(env.KV_REST_API_TOKEN)}`)

    // Production: Always use cloud if configured, fail if not
    if (env.NODE_ENV === 'production') {
      if (!hasCloudConfig) {
        throw new Error(
          'Production environment requires Vercel KV configuration'
        )
      }
      console.log(`[KVStoreFactory] Production mode -> using cloud KV`)
      return 'cloud'
    }

    // Development: Use cloud if configured, otherwise local
    if (hasCloudConfig) {
      console.log(
        `[KVStoreFactory] Development mode with cloud config -> using cloud KV`
      )
      return 'cloud'
    } else {
      console.log(
        `[KVStoreFactory] Development mode without cloud config -> using local KV`
      )
      return 'local'
    }
  }

  /**
   * Check if cloud KV configuration is available
   */
  private static hasCloudConfiguration(env: KVEnvironment): boolean {
    return Boolean(env.KV_URL && env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
  }

  /**
   * Get environment variables (abstracted for testing)
   */
  private static getEnvironment(): KVEnvironment {
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      KV_URL: process.env.KV_URL,
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    }
  }

  /**
   * Create cloud KV store instance
   */
  private static async createCloudKVStore(): Promise<CloudKVStore> {
    try {
      const { kv } = await import('@vercel/kv')
      return new CloudKVStore(kv)
    } catch (error) {
      console.error('[KVStoreFactory] Failed to import @vercel/kv:', error)
      throw new Error(
        'Failed to initialize cloud KV store. Ensure @vercel/kv is installed and configured.'
      )
    }
  }

  /**
   * Get current instance type (for debugging/logging)
   */
  static getCurrentInstanceType(): string | null {
    return this.instance?.getImplementationName() || null
  }
}
