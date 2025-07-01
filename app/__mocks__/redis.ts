export type RedisClientType = {
  connect: () => Promise<void>
  on: (...args: any[]) => void
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
  del: (key: string) => Promise<void>
}

export const createClient = (_options?: any): RedisClientType => ({
  connect: async () => undefined,
  on: () => undefined,
  get: async () => null,
  set: async () => undefined,
  del: async () => undefined,
})
