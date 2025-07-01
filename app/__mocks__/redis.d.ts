declare module 'redis' {
  export interface RedisClientType {
    connect: () => Promise<void>
    on: (...args: any[]) => void
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    del: (key: string) => Promise<void>
  }

  export function createClient(options?: any): RedisClientType
}
