/**
 * Local KV Store Implementation
 *
 * In-memory implementation for development and testing.
 * Data is stored in memory and lost when the process ends.
 */

import { IKVStore } from './IKVStore'

export class LocalKVStore implements IKVStore {
  private storage = new Map<string, any>()
  private instanceId: string

  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 8)
    console.log(`[LocalKVStore:${this.instanceId}] Initialized local KV store`)
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = this.storage.get(key)
    console.log(
      `[LocalKVStore:${this.instanceId}] GET ${key} -> ${value !== undefined ? 'found' : 'null'}`
    )
    return value !== undefined ? value : null
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    this.storage.set(key, value)
    console.log(`[LocalKVStore:${this.instanceId}] SET ${key} -> stored`)
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key)
    console.log(`[LocalKVStore:${this.instanceId}] DEL ${key} -> deleted`)
  }

  getImplementationName(): string {
    return `LocalKVStore:${this.instanceId}`
  }
}
