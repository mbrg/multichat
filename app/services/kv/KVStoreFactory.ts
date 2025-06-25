/**
 * KV Store Factory
 *
 * Factory pattern implementation for KV store selection.
 * Provides clear, testable logic for choosing between implementations.
 */

import { IKVStore } from './IKVStore'
import { CloudKVStore } from './CloudKVStore'
import { LocalKVStore } from './LocalKVStore'

export type KVStoreType = 'cloud' | 'local' | 'auto'

export interface KVEnvironment {
  NODE_ENV: string
  KV_URL?: string
  KV_REST_API_URL?: string
  KV_REST_API_TOKEN?: string
}

export class KVStoreFactory {
  private static instance: IKVStore | null = null
  private static initPromise: Promise<IKVStore> | null = null

  /**
   * Get KV store instance (singleton pattern)
   */
  static async getInstance(type: KVStoreType = 'auto'): Promise<IKVStore> {
    if (this.instance) {
      return this.instance
    }

    if (this.initPromise) {
      return await this.initPromise
    }

    this.initPromise = this.createInstance(type)
    this.instance = await this.initPromise
    this.initPromise = null
    return this.instance
  }

  /**
   * Create a new KV store instance (for testing)
   */
  static async createInstance(type: KVStoreType = 'auto'): Promise<IKVStore> {
    const resolvedType = this.resolveKVType(type)

    switch (resolvedType) {
      case 'cloud':
        console.log(`[KVStoreFactory] Creating cloud KV store instance`)
        return await this.createCloudKVStore()

      case 'local':
        console.log(`[KVStoreFactory] Creating local KV store instance`)
        return this.createLocalKVStore()

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
    this.initPromise = null
  }

  /**
   * Resolve KV type based on environment and configuration
   */
  private static resolveKVType(requestedType: KVStoreType): KVStoreType {
    if (requestedType === 'cloud') {
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

    // In development or test, fall back to local storage if no cloud config
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      if (!hasCloudConfig) {
        console.log(
          `[KVStoreFactory] Using local storage (no cloud config in ${env.NODE_ENV})`
        )
        return 'local'
      }
    }

    // Production requires cloud configuration
    if (!hasCloudConfig) {
      throw new Error(
        'Vercel KV configuration required (KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN)'
      )
    }

    console.log(`[KVStoreFactory] Using cloud KV storage`)
    return 'cloud'
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
  static async createCloudKVStore(): Promise<CloudKVStore> {
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
   * Create local KV store instance
   */
  static createLocalKVStore(kvFilePath?: string): LocalKVStore {
    return new LocalKVStore(kvFilePath)
  }

  /**
   * Get current instance type (for debugging/logging)
   */
  static getCurrentInstanceType(): string | null {
    return this.instance?.getImplementationName() || null
  }
}
