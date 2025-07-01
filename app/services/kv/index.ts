/**
 * KV Store Service
 *
 * Clean abstraction for key-value storage with multiple implementations.
 * Use this module to access KV storage throughout the application.
 */

export type { IKVStore } from './IKVStore'
export { CloudKVStore } from './CloudKVStore'
export { RedisKVStore } from './RedisKVStore'
export {
  KVStoreFactory,
  type KVStoreType,
  type KVEnvironment,
} from './KVStoreFactory'

// Convenience function for getting KV store instance
export async function getKVStore(): Promise<import('./IKVStore').IKVStore> {
  const { KVStoreFactory } = await import('./KVStoreFactory')
  return KVStoreFactory.getInstance()
}
