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

describe('/api/settings', () => {
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

  describe('GET /api/settings', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/settings'))
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user settings for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const mockSettings = {
        systemPrompt: 'You are a helpful assistant',
        enabledProviders: '{"openai":true,"anthropic":false}',
      }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(mockSettings)).toString('hex')}`
      )

      const request = new NextRequest(createTestUrl('/api/settings'))
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockSettings)
    })

    it('should return empty object if no settings stored', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/settings'))
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({})
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockRejectedValue(new Error('KV error'))

      const request = new NextRequest(createTestUrl('/api/settings'))
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to get settings')
    })
  })

  describe('POST /api/settings', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'POST',
        body: JSON.stringify({ systemPrompt: 'New prompt' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should reject invalid settings data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'POST',
        body: JSON.stringify(null),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid settings data')
    })

    it('should update settings with partial update', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const existingSettings = {
        systemPrompt: 'Old prompt',
        enabledProviders: '{"openai":true}',
      }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(existingSettings)).toString('hex')}`
      )
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'POST',
        body: JSON.stringify({ systemPrompt: 'New prompt' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.systemPrompt).toBe('New prompt')
      expect(data.enabledProviders).toBe('{"openai":true}')

      // Verify kvStore.set was called with merged data
      expect(mockKVStore.set).toHaveBeenCalledWith(
        'settings:test-user-id',
        expect.any(String)
      )
    })

    it('should create new settings if none exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockResolvedValue(null)
      mockKVStore.set.mockResolvedValue('OK')

      const newSettings = {
        systemPrompt: 'You are helpful',
        enabledProviders: '{"openai":true,"anthropic":true}',
      }

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'POST',
        body: JSON.stringify(newSettings),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(newSettings)
    })

    it('should remove null or undefined values', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const existingSettings = {
        systemPrompt: 'Keep this',
        oldSetting: 'Remove this',
      }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(existingSettings)).toString('hex')}`
      )
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'POST',
        body: JSON.stringify({ oldSetting: null }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.systemPrompt).toBe('Keep this')
      expect(data.oldSetting).toBeUndefined()
    })
  })

  describe('DELETE /api/settings', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'DELETE',
      })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })

    it('should delete a specific setting', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      const existingSettings = {
        systemPrompt: 'Keep this',
        enabledProviders: 'Delete this',
      }
      mockKVStore.get.mockResolvedValue(
        `${'a'.repeat(32)}:${Buffer.from(JSON.stringify(existingSettings)).toString('hex')}`
      )
      mockKVStore.set.mockResolvedValue('OK')

      const request = new NextRequest(
        createTestUrl('/api/settings?key=enabledProviders'),
        {
          method: 'DELETE',
        }
      )
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.settings.systemPrompt).toBe('Keep this')
      expect(data.settings.enabledProviders).toBeUndefined()

      // Verify the setting was removed
      const setCall = mockKVStore.set.mock.calls[0]
      expect(setCall[0]).toBe('settings:test-user-id')
      const [iv, encrypted] = (setCall[1] as string).split(':')
      const savedData = JSON.parse(Buffer.from(encrypted, 'hex').toString())
      expect(savedData.systemPrompt).toBe('Keep this')
      expect(savedData.enabledProviders).toBeUndefined()
    })

    it('should delete all settings when no key specified', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.del.mockResolvedValue(1)

      const request = new NextRequest(createTestUrl('/api/settings'), {
        method: 'DELETE',
      })
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(mockKVStore.del).toHaveBeenCalledWith('settings:test-user-id')
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockKVStore.get.mockRejectedValue(new Error('KV error'))

      const request = new NextRequest(
        createTestUrl('/api/settings?key=systemPrompt'),
        {
          method: 'DELETE',
        }
      )
      const response = await DELETE(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to delete settings')
    })
  })
})
