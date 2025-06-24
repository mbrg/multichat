import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { getKVStore } from '../../../services/kv'

// Helper to create dynamic URLs for tests
const createTestUrl = (path: string) => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}${path}`
}

// Mock dependencies
vi.mock('next-auth')
vi.mock('../../../services/kv')
vi.mock('../../../utils/crypto', () => ({
  deriveUserKey: vi.fn().mockResolvedValue(Buffer.from('test-user-key')),
  encrypt: vi
    .fn()
    .mockImplementation((data) =>
      Promise.resolve(`${'a'.repeat(32)}:${Buffer.from(data).toString('hex')}`)
    ),
  decrypt: vi.fn().mockImplementation((data) => {
    const [iv, encrypted] = data.split(':')
    return Promise.resolve(Buffer.from(encrypted, 'hex').toString())
  }),
}))

describe('/api/apikeys', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }

  const mockKVStore = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    getImplementationName: vi.fn().mockReturnValue('MockKVStore'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getKVStore).mockResolvedValue(mockKVStore)
  })

  describe('GET /api/apikeys', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/apikeys'))
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return API key status for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const mockApiKeys = {
        openai: 'sk-123',
        anthropic: 'sk-ant-456',
      }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(mockApiKeys)).toString('hex')}`
      )

      const request = new NextRequest(createTestUrl('/api/apikeys'))
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toEqual({
        openai: true,
        anthropic: true,
        google: false,
        mistral: false,
        together: false,
      })
    })

    it('should return empty status if no API keys stored', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/apikeys'))
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toEqual({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockRejectedValue(new Error('KV error'))

      const request = new NextRequest(createTestUrl('/api/apikeys'))
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to get API key status')
    })
  })

  describe('POST /api/apikeys', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: 'sk-123' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should reject invalid provider', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'POST',
        body: JSON.stringify({ provider: 'invalid', apiKey: 'sk-123' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid provider')
    })

    it('should reject non-string API key', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: 123 }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('API key must be a string')
    })

    it('should set a new API key', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockResolvedValue(null)
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: 'sk-123' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status.openai).toBe(true)

      // Verify kvStore.set was called with encrypted data
      expect(mockKVStore.set).toHaveBeenCalledWith(
        'apikeys:test-user-id',
        expect.any(String)
      )
    })

    it('should update an existing API key', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const existingKeys = { anthropic: 'sk-ant-old' }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(existingKeys)).toString('hex')}`
      )
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: 'sk-new' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status.openai).toBe(true)
      expect(data.status.anthropic).toBe(true)
    })

    it('should remove API key when empty string provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const existingKeys = { openai: 'sk-123', anthropic: 'sk-ant-456' }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(existingKeys)).toString('hex')}`
      )
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: '' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status.openai).toBe(false)
      expect(data.status.anthropic).toBe(true)
    })
  })

  describe('DELETE /api/apikeys', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'DELETE',
      })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })

    it('should delete a specific API key', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const existingKeys = { openai: 'sk-123', anthropic: 'sk-ant-456' }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(existingKeys)).toString('hex')}`
      )
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(
        createTestUrl('/api/apikeys?provider=openai'),
        {
          method: 'DELETE',
        }
      )
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify the key was removed
      const setCall = mockKVStore.set.mock.calls[0]
      expect(setCall[0]).toBe('apikeys:test-user-id')
      const [iv, encrypted] = (setCall[1] as string).split(':')
      const savedData = JSON.parse(Buffer.from(encrypted, 'hex').toString())
      expect(savedData.openai).toBeUndefined()
      expect(savedData.anthropic).toBe('sk-ant-456')
    })

    it('should reject invalid provider when deleting specific key', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest(
        createTestUrl('/api/apikeys?provider=invalid'),
        {
          method: 'DELETE',
        }
      )
      const response = await DELETE(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid provider')
    })

    it('should delete all API keys when no provider specified', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.del.mockResolvedValue(1)

      const request = new NextRequest(createTestUrl('/api/apikeys'), {
        method: 'DELETE',
      })
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(mockKVStore.del).toHaveBeenCalledWith('apikeys:test-user-id')
    })
  })
})
