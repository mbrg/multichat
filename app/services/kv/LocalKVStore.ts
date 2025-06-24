/**
 * Local KV Store Implementation
 *
 * In-memory key-value store for local development and testing.
 * Data is lost when the process restarts.
 */

import { IKVStore } from './IKVStore'

export class LocalKVStore implements IKVStore {
  private store: Map<string, any> = new Map()
  private readonly instanceId: string

  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 8)
    console.log(
      `[LocalKVStore:${this.instanceId}] Initialized in-memory KV store`
    )
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = this.store.has(key) ? this.store.get(key) : null
    console.log(
      `[LocalKVStore:${this.instanceId}] GET ${key} -> ${value !== null ? 'found' : 'null'}`
    )
    return value
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value)
    console.log(`[LocalKVStore:${this.instanceId}] SET ${key} -> stored`)
  }

  async del(key: string): Promise<void> {
    const existed = this.store.has(key)
    this.store.delete(key)
    console.log(
      `[LocalKVStore:${this.instanceId}] DEL ${key} -> ${existed ? 'deleted' : 'not found'}`
    )
  }

  getImplementationName(): string {
    return `LocalKVStore:${this.instanceId}`
  }

  // Development helpers
  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys())
  }

  async clear(): Promise<void> {
    this.store.clear()
    console.log(`[LocalKVStore:${this.instanceId}] CLEAR -> all data cleared`)
  }

  async size(): Promise<number> {
    return this.store.size
  }
}
