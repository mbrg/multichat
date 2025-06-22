import { describe, it, expect } from 'vitest'

describe('SecureStorage', () => {
  it('should export the SecureStorage class', async () => {
    const { SecureStorage } = await import('../crypto')

    expect(SecureStorage).toBeDefined()
    expect(typeof SecureStorage.encryptAndStore).toBe('function')
    expect(typeof SecureStorage.decryptAndRetrieve).toBe('function')
    expect(typeof SecureStorage.clearAll).toBe('function')
    expect(typeof SecureStorage.lockNow).toBe('function')
    expect(typeof SecureStorage.isLocked).toBe('function')
  })

  it('should have required Web APIs available', () => {
    expect(crypto).toBeDefined()
    expect(crypto.subtle).toBeDefined()
    expect(localStorage).toBeDefined()
  })
})
