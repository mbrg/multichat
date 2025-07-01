import { createClient, RedisClientType } from 'redis'
import { IKVStore } from './IKVStore'

export class RedisKVStore implements IKVStore {
  private client: RedisClientType
  private readonly instanceId: string

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl })
    this.client.on('error', (err) =>
      console.error(`[RedisKVStore] Client error`, err)
    )
    this.client.connect().catch((err) => {
      console.error('[RedisKVStore] Connection error', err)
      throw err
    })
    this.instanceId = Math.random().toString(36).substring(2, 8)
    console.log(`[RedisKVStore:${this.instanceId}] Initialized Redis store`)
  }

  async get<T = any>(key: string): Promise<T | null> {
    const raw = await this.client.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  }

  async set(key: string, value: any): Promise<void> {
    await this.client.set(key, JSON.stringify(value))
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  getImplementationName(): string {
    return `RedisKVStore:${this.instanceId}`
  }
}
