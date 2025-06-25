import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApiKeys } from '../useApiKeys'
import { useSession } from 'next-auth/react'
import { CloudApiKeys } from '../../utils/cloudApiKeys'
import { CloudSettings } from '../../utils/cloudSettings'

// Mock dependencies
vi.mock('next-auth/react')
vi.mock('../../utils/cloudApiKeys')
vi.mock('../../utils/cloudSettings')

// Mock global fetch for validation endpoint
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ isValid: true }),
})

const sessionHook = vi.mocked(useSession)

describe('useApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock CloudApiKeys
    vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
      openai: false,
      anthropic: false,
      google: false,
      mistral: false,
      together: false,
    })
    vi.mocked(CloudApiKeys.setApiKey).mockResolvedValue({
      openai: true,
      anthropic: false,
      google: false,
      mistral: false,
      together: false,
    })
    vi.mocked(CloudApiKeys.deleteApiKey).mockResolvedValue()
    vi.mocked(CloudApiKeys.deleteAllApiKeys).mockResolvedValue()

    // Mock CloudSettings
    vi.mocked(CloudSettings.getEnabledProviders).mockResolvedValue(undefined)
    vi.mocked(CloudSettings.setEnabledProviders).mockResolvedValue()
    vi.mocked(CloudSettings.deleteAllSettings).mockResolvedValue()

    sessionHook.mockReturnValue({
      data: {
        user: { id: 'test-user', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    })
  })

  describe('Cloud API Integration', () => {
    it('should load API keys from CloudApiKeys service', async () => {
      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(CloudApiKeys.getApiKeyStatus).toHaveBeenCalled()
      expect(CloudSettings.getEnabledProviders).toHaveBeenCalled()
    })

    it('should load API keys from storage', async () => {
      // Mock API key status indicating keys are set
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: true,
        google: false,
        mistral: false,
        together: false,
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.apiKeys.openai).toBe('***')
      expect(result.current.apiKeys.anthropic).toBe('***')
      expect(result.current.enabledProviders.openai).toBe(true)
      expect(result.current.enabledProviders.anthropic).toBe(true)
    })
  })

  describe('API Key Management', () => {
    it('should store API key through storage interface', async () => {
      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.saveApiKey('openai', 'new-openai-key')
      })

      expect(CloudApiKeys.setApiKey).toHaveBeenCalledWith(
        'openai',
        'new-openai-key'
      )
      expect(result.current.apiKeys.openai).toBe('***')
      expect(result.current.enabledProviders.openai).toBe(true)
    })

    it('should remove API key through storage interface', async () => {
      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.saveApiKey('openai', '')
      })

      expect(CloudApiKeys.deleteApiKey).toHaveBeenCalledWith('openai')
      expect(result.current.apiKeys.openai).toBeUndefined()
      expect(result.current.enabledProviders.openai).toBe(false)
    })

    it('should clear all keys through storage interface', async () => {
      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.clearAllKeys()
      })

      expect(CloudApiKeys.deleteAllApiKeys).toHaveBeenCalled()
      expect(CloudSettings.deleteAllSettings).toHaveBeenCalled()
      expect(result.current.apiKeys).toEqual({})
    })
  })

  describe('Provider Management', () => {
    it('should enable/disable providers correctly', async () => {
      // Mock API key status indicating openai key is set
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.enabledProviders.openai).toBe(true)

      act(() => {
        result.current.toggleProvider('openai')
      })

      expect(result.current.enabledProviders.openai).toBe(false)

      act(() => {
        result.current.toggleProvider('openai')
      })

      expect(result.current.enabledProviders.openai).toBe(true)
    })

    it('should provide utility functions', async () => {
      // Mock API key status indicating openai key is set
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.getApiKey('openai')).toBe('***')
      expect(result.current.getApiKey('anthropic')).toBeUndefined()
      expect(result.current.hasApiKey('openai')).toBe(true)
      expect(result.current.hasApiKey('anthropic')).toBe(false)
      expect(result.current.isProviderEnabled('openai')).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle CloudApiKeys failures gracefully', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockRejectedValue(
        new Error('API error')
      )

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not crash and should have empty keys
      expect(result.current.apiKeys).toEqual({})
    })

    it('should handle CloudSettings failures gracefully', async () => {
      vi.mocked(CloudSettings.getEnabledProviders).mockRejectedValue(
        new Error('Settings error')
      )

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not crash and should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have empty providers
      expect(result.current.enabledProviders.openai).toBe(false)
    })
  })

  describe('Authentication Integration', () => {
    it('should reflect authentication state', async () => {
      const mockSession = {
        user: { id: 'user123', email: 'test@example.com' },
        expires: '2024-12-31',
      }

      sessionHook.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
