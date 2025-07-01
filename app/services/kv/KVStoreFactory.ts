/**
 * KV Store Factory
 *
 * Factory pattern implementation for KV store selection.
 * Provides clear, testable logic for choosing between implementations.
 */

import { IKVStore } from './IKVStore'
import { CloudKVStore } from './CloudKVStore'
import { RedisKVStore } from './RedisKVStore'
import { LocalKVStore } from './LocalKVStore'

export type KVStoreType = 'cloud' | 'local' | 'auto'

export interface KVEnvironment {
  NODE_ENV: string
  KV_REST_API_URL?: string
  KV_REST_API_TOKEN?: string
  REDIS_URL?: string
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
    const hasUpstash = this.hasUpstashConfiguration(env)
    const hasRedis = this.hasRedisConfiguration(env)
    const hasCloudConfig = hasUpstash || hasRedis

    console.log(`[KVStoreFactory] Environment analysis:`)
    console.log(`  NODE_ENV: ${env.NODE_ENV}`)
    console.log(`  Has KV_REST_API_URL: ${Boolean(env.KV_REST_API_URL)}`)
    console.log(`  Has KV_REST_API_TOKEN: ${Boolean(env.KV_REST_API_TOKEN)}`)
    console.log(`  Has REDIS_URL: ${Boolean(env.REDIS_URL)}`)

    // In development or test, always use local storage
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      console.log(
        `[KVStoreFactory] Using local storage in ${env.NODE_ENV}`
      )
      return 'local'
    }

    // Production requires cloud configuration
    if (!hasCloudConfig) {
      throw new Error(
        'Cloud KV configuration required (Upstash or Redis)'
      )
    }

    console.log(`[KVStoreFactory] Using cloud KV storage`)
    return 'cloud'
  }

  /**
   * Check if cloud Redis configuration is available
   */
  private static hasCloudConfiguration(env: KVEnvironment): boolean {
    return this.hasUpstashConfiguration(env) || this.hasRedisConfiguration(env)
  }

  private static hasUpstashConfiguration(env: KVEnvironment): boolean {
    return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
  }

  private static hasRedisConfiguration(env: KVEnvironment): boolean {
    return Boolean(env.REDIS_URL)
  }

  /**
   * Get environment variables (abstracted for testing)
   */
  private static getEnvironment(): KVEnvironment {
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
      REDIS_URL: process.env.REDIS_URL,
    }
  }

  /**
   * Create cloud Redis store instance
   */
  static async createCloudKVStore(): Promise<IKVStore> {
    const env = this.getEnvironment()
    if (this.hasUpstashConfiguration(env)) {
      try {
        return new CloudKVStore()
      } catch (error) {
        console.error(
          '[KVStoreFactory] Failed to initialize Upstash Redis:',
          error
        )
        throw new Error(
          'Failed to initialize cloud Redis store. Ensure @upstash/redis is installed and environment variables are configured.'
        )
      }
    }

    if (this.hasRedisConfiguration(env)) {
      try {
        return new RedisKVStore(env.REDIS_URL!)
      } catch (error) {
        console.error('[KVStoreFactory] Failed to initialize Redis:', error)
        throw new Error(
          'Failed to initialize redis store. Ensure redis dependency is installed and REDIS_URL is configured.'
        )
      }
    }

    throw new Error('Cloud KV configuration required (Upstash or Redis)')
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
