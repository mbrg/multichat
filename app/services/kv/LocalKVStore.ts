/**
 * Local KV Store Implementation
 *
 * File-based implementation for development that persists data on the server.
 * Maintains the same interface as CloudKVStore while providing server-side persistence.
 * Uses JSON files in .vercel/kv/ directory to simulate KV storage.
 */

import { IKVStore } from './IKVStore'
import { promises as fs } from 'fs'
import { join } from 'path'

export class LocalKVStore implements IKVStore {
  private instanceId: string
  private kvFile: string
  private data: Record<string, any> = {}

  constructor(kvFilePath?: string) {
    this.instanceId = Math.random().toString(36).substring(2, 8)
    this.kvFile = kvFilePath || join(process.cwd(), 'kv.local')
    this.loadFromFile()
  }

  private loadFromFile(): void {
    try {
      const fileContent = require('fs').readFileSync(this.kvFile, 'utf-8')
      this.data = JSON.parse(fileContent)
    } catch (error) {
      // File doesn't exist or is invalid, start with empty data
      this.data = {}
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const fileContent = JSON.stringify(this.data, null, 2)
      await fs.writeFile(this.kvFile, fileContent, 'utf-8')
    } catch (error) {
      console.error(
        `[LocalKVStore:${this.instanceId}] Failed to save data:`,
        error
      )
      throw error
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = key in this.data ? this.data[key] : null
    return value
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    this.data[key] = value
    await this.saveToFile()
  }

  async del(key: string): Promise<void> {
    delete this.data[key]
    await this.saveToFile()
  }

  getImplementationName(): string {
    return `LocalKVStore:${this.instanceId}`
  }
}
