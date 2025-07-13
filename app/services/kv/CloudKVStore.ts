/**
 * Cloud KV Store Implementation
 *
 * Production key-value store using Upstash Redis.
 * Provides persistent, distributed storage with full Redis features.
 */

import { Redis } from '@upstash/redis'
import { IKVStore } from './IKVStore'

export class CloudKVStore implements IKVStore {
  private redis: Redis
  private readonly instanceId: string

  constructor(redisInstance?: Redis) {
    if (redisInstance) {
      this.redis = redisInstance
    } else {
      // Use Vercel-provided environment variables
      this.redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      })
    }
    this.instanceId = Math.random().toString(36).substring(2, 8)
    console.log(
      `[CloudKVStore:${this.instanceId}] Initialized Upstash Redis store`
    )
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = (await this.redis.get(key)) as T | null
      console.log(
        `[CloudKVStore:${this.instanceId}] GET ${this.obfuscateKey(key)} -> ${value ? 'found' : 'null'}`
      )
      return value
    } catch (error) {
      console.error(
        `[CloudKVStore:${this.instanceId}] GET ${this.obfuscateKey(key)} -> ERROR:`,
        error
      )
      throw error
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await this.redis.set(key, value)
      console.log(
        `[CloudKVStore:${this.instanceId}] SET ${this.obfuscateKey(key)} -> stored`
      )
    } catch (error) {
      console.error(
        `[CloudKVStore:${this.instanceId}] SET ${this.obfuscateKey(key)} -> ERROR:`,
        error
      )
      throw error
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
      console.log(
        `[CloudKVStore:${this.instanceId}] DEL ${this.obfuscateKey(key)} -> deleted`
      )
    } catch (error) {
      console.error(
        `[CloudKVStore:${this.instanceId}] DEL ${this.obfuscateKey(key)} -> ERROR:`,
        error
      )
      throw error
    }
  }

  getImplementationName(): string {
    return `CloudKVStore:${this.instanceId}:Upstash`
  }

  private obfuscateKey(key: string): string {
    // Only show first 8 characters and last 4 characters, mask the middle
    if (key.length <= 12) {
      return key.substring(0, 4) + '***'
    }
    return key.substring(0, 8) + '***' + key.substring(key.length - 4)
  }
}
