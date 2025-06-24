import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApiKeys } from '../useApiKeys'
import { SecureStorage } from '../../utils/crypto'

// Mock SecureStorage
vi.mock('../../utils/crypto', () => ({
  SecureStorage: {
    encryptAndStore: vi.fn(),
    decryptAndRetrieve: vi.fn(),
    clearAll: vi.fn(),
  },
}))

// Mock the environment
vi.stubEnv('NEXT_PUBLIC_OPENAI', 'sk-env-openai')
vi.stubEnv('NEXT_PUBLIC_ANTHROPIC', 'sk-env-anthropic')
vi.stubEnv('NODE_ENV', 'development')

const mockedSecureStorage = vi.mocked(SecureStorage)

describe('useApiKeys Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })

    // Default mock implementations
    mockedSecureStorage.decryptAndRetrieve.mockResolvedValue(null)
    mockedSecureStorage.encryptAndStore.mockResolvedValue(undefined)
  })

  it('initializes with default values', async () => {
    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // In dev mode with env vars, keys will be loaded from environment
    expect(result.current.apiKeys).toEqual({
      openai: 'sk-env-openai',
      anthropic: 'sk-env-anthropic',
    })
    expect(result.current.enabledProviders).toEqual({
      openai: true,
      anthropic: true,
      google: false,
      mistral: false,
      together: false,
    })
  })

  it('loads API keys from secure storage on mount', async () => {
    mockedSecureStorage.decryptAndRetrieve.mockImplementation((key: string) => {
      if (key === 'apiKey_openai') return Promise.resolve('sk-test-key')
      if (key === 'apiKey_anthropic') return Promise.resolve('sk-ant-test')
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.apiKeys).toEqual({
      openai: 'sk-test-key',
      anthropic: 'sk-ant-test',
    })
  })

  it('auto-enables providers that have API keys', async () => {
    mockedSecureStorage.decryptAndRetrieve.mockImplementation((key: string) => {
      if (key === 'apiKey_openai') return Promise.resolve('sk-test-key')
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.enabledProviders.openai).toBe(true)
    expect(result.current.enabledProviders.anthropic).toBe(true) // Loaded from env
  })

  it('saves API key to secure storage', async () => {
    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.saveApiKey('openai', 'sk-new-key')
    })

    expect(mockedSecureStorage.encryptAndStore).toHaveBeenCalledWith(
      'apiKey_openai',
      'sk-new-key'
    )
    expect(result.current.apiKeys.openai).toBe('sk-new-key')
    expect(result.current.enabledProviders.openai).toBe(true) // Auto-enabled
  })

  it('removes API key when empty string is provided', async () => {
    // Start with an existing key
    mockedSecureStorage.decryptAndRetrieve.mockImplementation((key: string) => {
      if (key === 'apiKey_openai') return Promise.resolve('sk-existing-key')
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.saveApiKey('openai', '')
    })

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('apiKey_openai')
    expect(result.current.apiKeys.openai).toBeUndefined()
    expect(result.current.enabledProviders.openai).toBe(false) // Auto-disabled
  })

  it('toggles provider enabled state', async () => {
    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // OpenAI is already enabled from env vars
    expect(result.current.enabledProviders.openai).toBe(true)

    // Toggle it off
    act(() => {
      result.current.toggleProvider('openai')
    })

    expect(result.current.enabledProviders.openai).toBe(false)
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'enabledProviders',
      JSON.stringify({
        openai: false,
        anthropic: true, // Still enabled from env
        google: false,
        mistral: false,
        together: false,
      })
    )
  })

  it('returns correct API key with getApiKey', async () => {
    mockedSecureStorage.decryptAndRetrieve.mockImplementation((key: string) => {
      if (key === 'apiKey_openai') return Promise.resolve('sk-test-key')
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.getApiKey('openai')).toBe('sk-test-key')
    expect(result.current.getApiKey('anthropic')).toBe('sk-env-anthropic') // From env
  })

  it('clears all keys and resets state', async () => {
    // Start with some keys and settings
    mockedSecureStorage.decryptAndRetrieve.mockImplementation((key: string) => {
      if (key === 'apiKey_openai') return Promise.resolve('sk-test-key')
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear all
    act(() => {
      result.current.clearAllKeys()
    })

    expect(mockedSecureStorage.clearAll).toHaveBeenCalled()
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(
      'enabledProviders'
    )
    expect(result.current.apiKeys).toEqual({})
    expect(result.current.enabledProviders).toEqual({
      openai: false,
      anthropic: false,
      google: false,
      mistral: false,
      together: false,
    })
  })

  it('handles errors when saving API keys', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useApiKeys())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Now set up the mock to fail for the saveApiKey call
    mockedSecureStorage.encryptAndStore.mockRejectedValue(
      new Error('Storage error')
    )

    await expect(async () => {
      await act(async () => {
        await result.current.saveApiKey('openai', 'sk-test-key')
      })
    }).rejects.toThrow('Storage error')

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving API key:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })
})
