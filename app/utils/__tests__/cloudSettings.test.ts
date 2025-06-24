import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudSettings } from '../cloudSettings'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('CloudSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('getSettings', () => {
    it('should fetch and return user settings', async () => {
      const mockSettings = {
        systemPrompt: 'You are helpful',
        enabledProviders: '{"openai":true}',
        customSetting: 'value',
      }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockSettings), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const settings = await CloudSettings.getSettings()

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      expect(settings).toEqual(mockSettings)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        })
      )

      await expect(CloudSettings.getSettings()).rejects.toThrow(
        'Failed to get settings: Unauthorized'
      )
    })
  })

  describe('updateSettings', () => {
    it('should update settings and return updated data', async () => {
      const updates = { systemPrompt: 'New prompt' }
      const mockResponse = {
        systemPrompt: 'New prompt',
        enabledProviders: '{"openai":true}',
      }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await CloudSettings.updateSettings(updates)

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle partial updates', async () => {
      const updates = { customSetting: 'new value' }
      const mockResponse = {
        systemPrompt: 'Existing prompt',
        customSetting: 'new value',
      }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await CloudSettings.updateSettings(updates)

      expect(result).toEqual(mockResponse)
    })

    it('should throw error on failed update', async () => {
      mockFetch.mockResolvedValue(
        new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
      )

      await expect(
        CloudSettings.updateSettings({ invalid: 'data' })
      ).rejects.toThrow('Failed to update settings: Bad Request')
    })
  })

  describe('deleteSetting', () => {
    it('should delete specific setting', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await CloudSettings.deleteSetting('systemPrompt')

      expect(mockFetch).toHaveBeenCalledWith('/api/settings?key=systemPrompt', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    })
  })

  describe('deleteAllSettings', () => {
    it('should delete all settings', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await CloudSettings.deleteAllSettings()

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    })
  })

  describe('convenience methods', () => {
    describe('getSystemPrompt', () => {
      it('should return system prompt from settings', async () => {
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ systemPrompt: 'You are helpful' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )

        const prompt = await CloudSettings.getSystemPrompt()
        expect(prompt).toBe('You are helpful')
      })

      it('should return undefined if no system prompt', async () => {
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )

        const prompt = await CloudSettings.getSystemPrompt()
        expect(prompt).toBeUndefined()
      })
    })

    describe('setSystemPrompt', () => {
      it('should update system prompt', async () => {
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ systemPrompt: 'New prompt' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )

        await CloudSettings.setSystemPrompt('New prompt')

        expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: 'New prompt' }),
        })
      })
    })

    describe('getEnabledProviders', () => {
      it('should return enabled providers from settings', async () => {
        const enabledProviders = '{"openai":true,"anthropic":false}'
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ enabledProviders }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )

        const providers = await CloudSettings.getEnabledProviders()
        expect(providers).toBe(enabledProviders)
      })
    })

    describe('setEnabledProviders', () => {
      it('should update enabled providers', async () => {
        const providers = '{"openai":true,"anthropic":true}'
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ enabledProviders: providers }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )

        await CloudSettings.setEnabledProviders(providers)

        expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabledProviders: providers }),
        })
      })
    })
  })
})
