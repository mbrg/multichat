import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudApiKeys } from '../cloudApiKeys'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('CloudApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('getApiKeyStatus', () => {
    it('should fetch and return API key status', async () => {
      const mockStatus = {
        openai: true,
        anthropic: false,
        google: true,
        mistral: false,
        together: false,
      }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ status: mockStatus }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const status = await CloudApiKeys.getApiKeyStatus()

      expect(mockFetch).toHaveBeenCalledWith('/api/apikeys', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      expect(status).toEqual(mockStatus)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        })
      )

      await expect(CloudApiKeys.getApiKeyStatus()).rejects.toThrow(
        'Failed to get API key status: Unauthorized'
      )
    })
  })

  describe('setApiKey', () => {
    it('should set API key and return updated status', async () => {
      const mockStatus = {
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ status: mockStatus }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const status = await CloudApiKeys.setApiKey('openai', 'sk-123')

      expect(mockFetch).toHaveBeenCalledWith('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey: 'sk-123' }),
      })
      expect(status).toEqual(mockStatus)
    })

    it('should handle empty API key', async () => {
      const mockStatus = {
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ status: mockStatus }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const status = await CloudApiKeys.setApiKey('openai', '')

      expect(mockFetch).toHaveBeenCalledWith('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey: '' }),
      })
      expect(status.openai).toBe(false)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue(
        new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
      )

      await expect(CloudApiKeys.setApiKey('invalid', 'key')).rejects.toThrow(
        'Failed to set API key: Bad Request'
      )
    })
  })

  describe('deleteApiKey', () => {
    it('should delete specific API key', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await CloudApiKeys.deleteApiKey('openai')

      expect(mockFetch).toHaveBeenCalledWith('/api/apikeys?provider=openai', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('should throw error on failed deletion', async () => {
      mockFetch.mockResolvedValue(
        new Response('Not Found', { status: 404, statusText: 'Not Found' })
      )

      await expect(CloudApiKeys.deleteApiKey('openai')).rejects.toThrow(
        'Failed to delete API key: Not Found'
      )
    })
  })

  describe('deleteAllApiKeys', () => {
    it('should delete all API keys', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await CloudApiKeys.deleteAllApiKeys()

      expect(mockFetch).toHaveBeenCalledWith('/api/apikeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('should throw error on failed deletion', async () => {
      mockFetch.mockResolvedValue(
        new Response('Server Error', {
          status: 500,
          statusText: 'Server Error',
        })
      )

      await expect(CloudApiKeys.deleteAllApiKeys()).rejects.toThrow(
        'Failed to delete all API keys: Server Error'
      )
    })
  })
})
