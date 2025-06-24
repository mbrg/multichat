/**
 * Cloud KV Store Implementation
 *
 * Production key-value store using Vercel KV.
 * Provides persistent, distributed storage.
 */

import { IKVStore } from './IKVStore'

export class CloudKVStore implements IKVStore {
  private kv: any
  private readonly instanceId: string

  constructor(kvInstance: any) {
    this.kv = kvInstance
    this.instanceId = Math.random().toString(36).substring(2, 8)
    console.log(`[CloudKVStore:${this.instanceId}] Initialized Vercel KV store`)
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = (await this.kv.get(key)) as T | null
      console.log(
        `[CloudKVStore:${this.instanceId}] GET ${key} -> ${value ? 'found' : 'null'}`
      )
      return value
    } catch (error) {
      console.error(
        `[CloudKVStore:${this.instanceId}] GET ${key} -> ERROR:`,
        error
      )
      throw error
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await this.kv.set(key, value)
      console.log(`[CloudKVStore:${this.instanceId}] SET ${key} -> stored`)
    } catch (error) {
      console.error(
        `[CloudKVStore:${this.instanceId}] SET ${key} -> ERROR:`,
        error
      )
      throw error
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.kv.del(key)
      console.log(`[CloudKVStore:${this.instanceId}] DEL ${key} -> deleted`)
    } catch (error) {
      console.error(
        `[CloudKVStore:${this.instanceId}] DEL ${key} -> ERROR:`,
        error
      )
      throw error
    }
  }

  getImplementationName(): string {
    return `CloudKVStore:${this.instanceId}`
  }
}
