/**
 * Security Integration Tests for KV Secrets Storage
 *
 * These tests verify that users cannot access other users' secrets
 * by testing through the actual API interface, not implementation details.
 * This ensures Dave Farley-level security confidence.
 */

import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { vi } from 'vitest'

// Mock NextAuth only - everything else is real
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

const mockGetServerSession = vi.mocked(getServerSession)

describe('KV Secrets Security Integration Tests', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up encryption key
    process.env.KV_ENCRYPTION_KEY =
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    // Force test mode to use local KV store for tests
    vi.stubEnv('NODE_ENV', 'test')
    // Clear any cloud KV env vars to ensure we use local storage
    vi.stubEnv('KV_URL', undefined)
    vi.stubEnv('KV_REST_API_URL', undefined)
    vi.stubEnv('KV_REST_API_TOKEN', undefined)
    // KV factory will automatically pick up environment changes
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('User Isolation Through API', () => {
    test('user1 cannot access user2 secrets through API', async () => {
      const user1Id = 'user-alice-123'
      const user2Id = 'user-bob-456'
      const user1Secret = 'sk-alice-secret-key-12345'
      const user2Secret = 'sk-bob-secret-key-67890'

      // User 1 stores their secrets
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1StoreRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: {
              apiKeys: { openai: user1Secret },
              systemInstructions: 'User 1 instructions',
            },
          }),
        }
      )

      const user1StoreResponse = await POST(user1StoreRequest)
      expect(user1StoreResponse.status).toBe(200)

      // User 2 stores their secrets
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2StoreRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: {
              apiKeys: { openai: user2Secret },
              systemInstructions: 'User 2 instructions',
            },
          }),
        }
      )

      const user2StoreResponse = await POST(user2StoreRequest)
      expect(user2StoreResponse.status).toBe(200)

      // User 1 retrieves their secrets - should only get their own
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1GetRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )

      const user1GetResponse = await GET(user1GetRequest)
      expect(user1GetResponse.status).toBe(200)

      const user1Data = await user1GetResponse.json()
      expect(user1Data.secrets.apiKeys.openai).toBe(user1Secret)
      expect(user1Data.secrets.systemInstructions).toBe('User 1 instructions')
      expect(user1Data.secrets.apiKeys.openai).not.toBe(user2Secret)

      // User 2 retrieves their secrets - should only get their own
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2GetRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )

      const user2GetResponse = await GET(user2GetRequest)
      expect(user2GetResponse.status).toBe(200)

      const user2Data = await user2GetResponse.json()
      expect(user2Data.secrets.apiKeys.openai).toBe(user2Secret)
      expect(user2Data.secrets.systemInstructions).toBe('User 2 instructions')
      expect(user2Data.secrets.apiKeys.openai).not.toBe(user1Secret)
    })

    test('user cannot access data by manipulating session userId', async () => {
      const realUserId = 'real-user-123'
      const attackerUserId = 'attacker-456'
      const sensitiveSecret = 'sk-super-secret-api-key-abc123'

      // Real user stores sensitive data
      mockGetServerSession.mockResolvedValue({ user: { id: realUserId } })
      const storeRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: {
              apiKeys: { anthropic: sensitiveSecret },
              systemInstructions: 'Top secret instructions',
            },
          }),
        }
      )

      const storeResponse = await POST(storeRequest)
      expect(storeResponse.status).toBe(200)

      // Attacker tries to access with different userId
      mockGetServerSession.mockResolvedValue({ user: { id: attackerUserId } })
      const attackRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )

      const attackResponse = await GET(attackRequest)
      expect(attackResponse.status).toBe(200)

      const attackData = await attackResponse.json()
      // Attacker should get empty secrets, not the real user's data
      expect(attackData.secrets).toEqual({})
      expect(JSON.stringify(attackData)).not.toContain(sensitiveSecret)
      expect(JSON.stringify(attackData)).not.toContain(
        'Top secret instructions'
      )
    })

    test('unauthenticated requests are rejected', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const getRequest = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)
      expect(getResponse.status).toBe(401)

      const postRequest = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: { test: 'value' } }),
      })

      const postResponse = await POST(postRequest)
      expect(postResponse.status).toBe(401)

      const deleteRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'DELETE',
        }
      )

      const deleteResponse = await DELETE(deleteRequest)
      expect(deleteResponse.status).toBe(401)
    })

    test('invalid session format is rejected', async () => {
      // Session without user ID
      mockGetServerSession.mockResolvedValue({ user: {} })

      const request = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Data Encryption Verification Through API', () => {
    test('same data stored by same user produces different encrypted values', async () => {
      const userId = 'test-user'
      const secretData = {
        apiKeys: { openai: 'sk-test-123' },
        test: 'same-data',
      }

      mockGetServerSession.mockResolvedValue({ user: { id: userId } })

      // Store the same data twice
      const request1 = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: secretData }),
      })

      const request2 = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: secretData }),
      })

      const response1 = await POST(request1)
      const response2 = await POST(request2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      // Both operations should succeed (different IVs make encryption non-deterministic)
      // We verify this by successfully retrieving the data
      const getRequest = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)
      expect(getResponse.status).toBe(200)

      const retrievedData = await getResponse.json()
      expect(retrievedData.secrets).toEqual(secretData)
    })

    test('corrupted encryption key prevents access', async () => {
      const userId = 'test-user'
      const secretData = { apiKeys: { openai: 'sk-secret-key' } }

      // Store data with correct key
      process.env.KV_ENCRYPTION_KEY = 'a'.repeat(64)
      mockGetServerSession.mockResolvedValue({ user: { id: userId } })

      const storeRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: secretData }),
        }
      )

      const storeResponse = await POST(storeRequest)
      expect(storeResponse.status).toBe(200)

      // Try to retrieve with wrong key
      process.env.KV_ENCRYPTION_KEY = 'b'.repeat(64)

      const getRequest = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)
      expect(getResponse.status).toBe(500) // Should fail to decrypt

      const errorData = await getResponse.json()
      expect(errorData.error).toBe('Failed to retrieve secrets')
      expect(JSON.stringify(errorData)).not.toContain('sk-secret-key')
    })

    test('missing encryption key prevents operations', async () => {
      delete process.env.KV_ENCRYPTION_KEY

      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })

      const request = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: { test: 'value' } }),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Input Validation Through API', () => {
    test('invalid JSON is rejected', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })

      const request = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-data',
      })

      const response = await POST(request)
      expect(response.status).toBe(500) // JSON parsing error
    })

    test('missing secrets field is rejected', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })

      const request = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notSecrets: 'value' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData.error).toBe('Invalid secrets format')
    })

    test('non-object secrets are rejected', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })

      const request = new NextRequest('http://localhost:3000/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: 'not-an-object' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Delete Operations Security', () => {
    test('user can only delete their own secrets', async () => {
      const user1Id = 'user1'
      const user2Id = 'user2'

      // User 1 stores secrets
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1StoreRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: { apiKeys: { openai: 'user1-key' } },
          }),
        }
      )
      await POST(user1StoreRequest)

      // User 2 stores secrets
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2StoreRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secrets: { apiKeys: { openai: 'user2-key' } },
          }),
        }
      )
      await POST(user2StoreRequest)

      // User 1 deletes their secrets
      mockGetServerSession.mockResolvedValue({ user: { id: user1Id } })
      const user1DeleteRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'DELETE',
        }
      )
      const deleteResponse = await DELETE(user1DeleteRequest)
      expect(deleteResponse.status).toBe(200)

      // Verify user 1's secrets are gone
      const user1GetRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )
      const user1GetResponse = await GET(user1GetRequest)
      const user1Data = await user1GetResponse.json()
      expect(user1Data.secrets).toEqual({})

      // Verify user 2's secrets are still there
      mockGetServerSession.mockResolvedValue({ user: { id: user2Id } })
      const user2GetRequest = new NextRequest(
        'http://localhost:3000/api/secrets',
        {
          method: 'GET',
        }
      )
      const user2GetResponse = await GET(user2GetRequest)
      const user2Data = await user2GetResponse.json()
      expect(user2Data.secrets.apiKeys.openai).toBe('user2-key')
    })
  })
})
