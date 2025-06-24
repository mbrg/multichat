/**
 * Encryption Verification Tests
 *
 * These tests verify that data is actually encrypted in the KV store
 * and that users cannot decrypt each other's data even with KV access.
 * Tests the actual encryption implementation without mocking.
 */

import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { getKVStore } from '../../../services/kv'
import { LocalKVStore } from '../../../services/kv/LocalKVStore'
import { vi } from 'vitest'

// Mock NextAuth only
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Force use of LocalKVStore for inspection
vi.mock('../../../services/kv', () => ({
  getKVStore: vi.fn(),
}))

const mockGetServerSession = vi.mocked(getServerSession)
const mockGetKVStore = vi.mocked(getKVStore)

describe('Encryption Verification Tests', () => {
  let kvStore: LocalKVStore
  const originalEnv = process.env

  beforeAll(() => {
    kvStore = new LocalKVStore()
    mockGetKVStore.mockResolvedValue(kvStore)
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.KV_ENCRYPTION_KEY =
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

    // Clear KV store
    if (kvStore && typeof kvStore.clear === 'function') {
      await kvStore.clear()
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Data Encryption in KV Store', () => {
    test('secrets are encrypted in KV store, not stored as plaintext', async () => {
      const userId = 'test-user-123'
      const sensitiveApiKey = 'sk-very-secret-key-that-should-not-appear-in-kv'
      const sensitiveInstructions = 'These are top secret system instructions'

      mockGetServerSession.mockResolvedValue({ user: { id: userId } })

      // Store secrets via API
      const storeRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: {
              apiKeys: { openai: sensitiveApiKey },
              systemInstructions: sensitiveInstructions,
            },
          }),
        }
      )

      const storeResponse = await POST(storeRequest)
      expect(storeResponse.status).toBe(200)

      // Directly inspect what's stored in KV
      const userKey = `secrets:${userId}`
      const encryptedData = await kvStore.get<string>(userKey)

      expect(encryptedData).toBeTruthy()
      expect(typeof encryptedData).toBe('string')

      // Verify no plaintext secrets appear in encrypted data
      expect(encryptedData).not.toContain(sensitiveApiKey)
      expect(encryptedData).not.toContain(sensitiveInstructions)
      expect(encryptedData).not.toContain('openai')
      expect(encryptedData).not.toContain('systemInstructions')
      expect(encryptedData).not.toContain('apiKeys')

      // Verify data follows encryption format (IV:ciphertext)
      expect(encryptedData).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)

      // Verify IV is 32 hex chars (16 bytes)
      const [iv, ciphertext] = encryptedData!.split(':')
      expect(iv).toHaveLength(32)
      expect(ciphertext.length).toBeGreaterThan(0)
      expect(ciphertext.length % 2).toBe(0) // Should be valid hex
    })

    test('different users have different encrypted data for same secret', async () => {
      const user1Id = 'user1'
      const user2Id = 'user2'
      const sameSecret = 'sk-identical-secret-key'

      // User 1 stores secret
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1Request = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: { apiKeys: { openai: sameSecret } },
          }),
        }
      )
      await POST(user1Request)

      // User 2 stores same secret
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2Request = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: { apiKeys: { openai: sameSecret } },
          }),
        }
      )
      await POST(user2Request)

      // Get encrypted data from KV directly
      const user1EncryptedData = await kvStore.get<string>(`secrets:${user1Id}`)
      const user2EncryptedData = await kvStore.get<string>(`secrets:${user2Id}`)

      expect(user1EncryptedData).toBeTruthy()
      expect(user2EncryptedData).toBeTruthy()

      // Encrypted data should be different even though plaintext is the same
      expect(user1EncryptedData).not.toBe(user2EncryptedData)

      // Neither should contain the plaintext
      expect(user1EncryptedData).not.toContain(sameSecret)
      expect(user2EncryptedData).not.toContain(sameSecret)
    })

    test('user cannot decrypt another users data even with KV access', async () => {
      const user1Id = 'victim-user'
      const user2Id = 'attacker-user'
      const victimSecret = 'sk-victim-secret-key-12345'

      // Victim stores secret
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const victimRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: { apiKeys: { openai: victimSecret } },
          }),
        }
      )
      await POST(victimRequest)

      // Get victim's encrypted data
      const victimEncryptedData = await kvStore.get<string>(
        `secrets:${user1Id}`
      )
      expect(victimEncryptedData).toBeTruthy()

      // Simulate attacker having KV access - they manually insert victim's data under their key
      const attackerKey = `secrets:${user2Id}`
      await kvStore.set(attackerKey, victimEncryptedData)

      // Attacker tries to read the data through API
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const attackerRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )

      const attackerResponse = await GET(attackerRequest)

      // Should fail because attacker's key can't decrypt victim's data
      expect(attackerResponse.status).toBe(500)

      const errorData = await attackerResponse.json()
      expect(errorData.error).toBe('Failed to retrieve secrets')
      expect(JSON.stringify(errorData)).not.toContain(victimSecret)
    })

    test('same user storing same data multiple times produces different ciphertexts', async () => {
      const userId = 'test-user'
      const secretData = { apiKeys: { openai: 'sk-test-key' }, test: 'data' }

      mockGetServerSession.mockResolvedValue({ user: { id: userId } })

      // Store same data first time
      const request1 = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: secretData }),
      })
      await POST(request1)
      const encrypted1 = await kvStore.get<string>(`secrets:${userId}`)

      // Store same data second time
      const request2 = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: secretData }),
      })
      await POST(request2)
      const encrypted2 = await kvStore.get<string>(`secrets:${userId}`)

      expect(encrypted1).toBeTruthy()
      expect(encrypted2).toBeTruthy()

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to same data
      const getRequest = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'GET',
      })
      const getResponse = await GET(getRequest)
      expect(getResponse.status).toBe(200)

      const retrievedData = await getResponse.json()
      expect(retrievedData.secrets).toEqual(secretData)
    })

    test('tampering with encrypted data prevents decryption', async () => {
      const userId = 'test-user'
      const originalSecret = { apiKeys: { openai: 'sk-original-key' } }

      mockGetServerSession.mockResolvedValue({ user: { id: userId } })

      // Store original data
      const storeRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: originalSecret }),
        }
      )
      await POST(storeRequest)

      // Tamper with encrypted data
      const userKey = `secrets:${userId}`
      const originalEncrypted = await kvStore.get<string>(userKey)
      expect(originalEncrypted).toBeTruthy()

      const [iv, ciphertext] = originalEncrypted!.split(':')
      // Flip one bit in the ciphertext
      const tamperedCiphertext =
        ciphertext.substring(0, 2) +
        (ciphertext[2] === '0' ? '1' : '0') +
        ciphertext.substring(3)
      const tamperedData = `${iv}:${tamperedCiphertext}`

      await kvStore.set(userKey, tamperedData)

      // Try to retrieve tampered data
      const getRequest = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'GET',
      })
      const getResponse = await GET(getRequest)

      // Should fail to decrypt
      expect(getResponse.status).toBe(500)

      const errorData = await getResponse.json()
      expect(errorData.error).toBe('Failed to retrieve secrets')
    })
  })

  describe('KV Store Key Isolation', () => {
    test('users get different KV keys based on their ID', async () => {
      const user1Id = 'alice'
      const user2Id = 'bob'

      // Store data for both users
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1Request = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: { test: 'user1-data' } }),
        }
      )
      await POST(user1Request)

      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2Request = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: { test: 'user2-data' } }),
        }
      )
      await POST(user2Request)

      // Check KV store has separate keys
      const user1Key = `secrets:${user1Id}`
      const user2Key = `secrets:${user2Id}`

      const user1Data = await kvStore.get(user1Key)
      const user2Data = await kvStore.get(user2Key)

      expect(user1Data).toBeTruthy()
      expect(user2Data).toBeTruthy()
      expect(user1Data).not.toBe(user2Data)

      // Verify keys exist in KV
      const allKeys = await kvStore.getAllKeys()
      expect(allKeys).toContain(user1Key)
      expect(allKeys).toContain(user2Key)
    })

    test('deleting one users data does not affect other users', async () => {
      const user1Id = 'user1'
      const user2Id = 'user2'

      // Both users store data
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1StoreRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: { keep: 'user1-data' } }),
        }
      )
      await POST(user1StoreRequest)

      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2StoreRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: { keep: 'user2-data' } }),
        }
      )
      await POST(user2StoreRequest)

      // User 1 deletes their data
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const deleteRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'DELETE',
        }
      )
      await DELETE(deleteRequest)

      // Verify user 1's data is gone from KV
      const user1Data = await kvStore.get(`secrets:${user1Id}`)
      expect(user1Data).toBeNull()

      // Verify user 2's data is still there
      const user2Data = await kvStore.get(`secrets:${user2Id}`)
      expect(user2Data).toBeTruthy()

      // Verify user 2 can still retrieve via API
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2GetRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )
      const user2GetResponse = await GET(user2GetRequest)
      expect(user2GetResponse.status).toBe(200)

      const retrievedData = await user2GetResponse.json()
      expect(retrievedData.secrets.keep).toBe('user2-data')
    })
  })
})
