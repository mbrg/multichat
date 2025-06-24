import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApiKeys } from '../useApiKeys'
import { StorageService } from '../../services/storage'
import { ApiKeyStorage } from '../../types/storage'
import { useSession } from 'next-auth/react'

// Mock dependencies
vi.mock('../../services/storage')
vi.mock('next-auth/react')

const storageService = vi.mocked(StorageService)
const sessionHook = vi.mocked(useSession)

describe('useApiKeys', () => {
  let storage: ApiKeyStorage

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a mock storage that implements the interface
    storage = {
      storeApiKey: vi.fn(),
      getApiKey: vi.fn(),
      getAllApiKeys: vi.fn().mockResolvedValue({}),
      removeApiKey: vi.fn(),
      clearAllSecrets: vi.fn(),
      isAuthenticated: vi.fn().mockResolvedValue(false),
    }

    storageService.getStorage.mockResolvedValue(storage)

    sessionHook.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })
  })

  describe('Storage Interface Integration', () => {
    it('should use storage service to get appropriate storage implementation', async () => {
      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(storageService.getStorage).toHaveBeenCalled()
      expect(storage.getAllApiKeys).toHaveBeenCalled()
      expect(result.current.storage).toBe(storage)
    })

    it('should load API keys from storage', async () => {
      storage.getAllApiKeys = vi.fn().mockResolvedValue({
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.apiKeys.openai).toBe('test-openai-key')
      expect(result.current.apiKeys.anthropic).toBe('test-anthropic-key')
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

      expect(storage.storeApiKey).toHaveBeenCalledWith(
        'openai',
        'new-openai-key'
      )
      expect(result.current.apiKeys.openai).toBe('new-openai-key')
      expect(result.current.enabledProviders.openai).toBe(true)
    })

    it('should remove API key through storage interface', async () => {
      storage.getAllApiKeys = vi.fn().mockResolvedValue({
        openai: 'existing-key',
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.saveApiKey('openai', '')
      })

      expect(storage.removeApiKey).toHaveBeenCalledWith('openai')
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

      expect(storage.clearAllSecrets).toHaveBeenCalled()
      expect(result.current.apiKeys).toEqual({})
    })
  })

  describe('Provider Management', () => {
    it('should enable/disable providers correctly', async () => {
      storage.getAllApiKeys = vi.fn().mockResolvedValue({
        openai: 'test-key',
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
      storage.getAllApiKeys = vi.fn().mockResolvedValue({
        openai: 'test-key',
      })

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.getApiKey('openai')).toBe('test-key')
      expect(result.current.getApiKey('anthropic')).toBeUndefined()
      expect(result.current.hasApiKey('openai')).toBe(true)
      expect(result.current.hasApiKey('anthropic')).toBe(false)
      expect(result.current.isProviderEnabled('openai')).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle storage failures gracefully', async () => {
      storage.getAllApiKeys = vi
        .fn()
        .mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not crash and should have empty keys
      expect(result.current.apiKeys).toEqual({})
    })

    it('should handle uninitialized storage', async () => {
      storageService.getStorage.mockRejectedValue(
        new Error('Storage init failed')
      )

      const { result } = renderHook(() => useApiKeys())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should handle saveApiKey gracefully when storage is null
      await act(async () => {
        await result.current.saveApiKey('openai', 'test-key')
      })

      // Should not crash
      expect(result.current.storage).toBeNull()
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
