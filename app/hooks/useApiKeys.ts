import { useState, useEffect, useRef } from 'react'
import { SecureStorage } from '../utils/crypto'

export interface ApiKeys {
  openai?: string
  anthropic?: string
  google?: string
  mistral?: string
  together?: string
}

export interface EnabledProviders {
  openai: boolean
  anthropic: boolean
  google: boolean
  mistral: boolean
  together: boolean
}

const loadEnvDefaults = async (
  keys: ApiKeys,
  providers: string[],
  loadedFromStorage: string[]
) => {
  // Only load env vars as defaults when no stored keys exist
  // Must use NEXT_PUBLIC_ prefix for Next.js to expose them to the browser
  const envKeys: Record<string, string | undefined> = {
    openai: process.env.NEXT_PUBLIC_OPENAI,
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC,
    google: process.env.NEXT_PUBLIC_GOOGLE,
    mistral: process.env.NEXT_PUBLIC_MISTRAL,
    together: process.env.NEXT_PUBLIC_TOGETHER,
  }

  const loadedProviders: string[] = []

  for (const provider of providers) {
    const envKey = envKeys[provider]
    // Only use env key if no stored key exists for this provider
    if (
      envKey &&
      !keys[provider as keyof ApiKeys] &&
      !loadedFromStorage.includes(provider)
    ) {
      try {
        await SecureStorage.encryptAndStore(`apiKey_${provider}`, envKey)
        keys[provider as keyof ApiKeys] = envKey
        loadedProviders.push(provider)
      } catch (error) {
        console.warn(
          'Failed to store environment key in secure storage:',
          error
        )
        // Still use the key even if storage fails
        keys[provider as keyof ApiKeys] = envKey
        loadedProviders.push(provider)
      }
    }
  }

  if (loadedProviders.length > 0) {
    console.log(
      `Development mode: Loaded API keys from environment for: ${loadedProviders.join(', ')}`
    )
  } else {
    // Check if we have any env vars defined
    const hasAnyEnvVars = Object.values(envKeys).some(
      (key) => key !== undefined
    )
    const skippedProviders = providers.filter(
      (p) =>
        envKeys[p] &&
        (keys[p as keyof ApiKeys] || loadedFromStorage.includes(p))
    )

    if (hasAnyEnvVars) {
      if (skippedProviders.length > 0) {
        console.log(
          `Environment variables found but not loaded for: ${skippedProviders.join(', ')} (keys already exist)`
        )
      } else {
        console.log('No environment variables to load')
      }
    } else {
      console.log('No environment variables defined')
    }
  }
}

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [enabledProviders, setEnabledProviders] = useState<EnabledProviders>({
    openai: false,
    anthropic: false,
    google: false,
    mistral: false,
    together: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const hasInitialized = useRef(false)

  // Load API keys and settings on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      loadApiKeys()
    }
  }, [])

  const loadApiKeys = async () => {
    setIsLoading(true)
    try {
      const providers = ['openai', 'anthropic', 'google', 'mistral', 'together']
      const keys: ApiKeys = {}
      const loadedFromStorage: string[] = []

      // Load API keys from secure storage only
      for (const provider of providers) {
        try {
          const storedKey = await SecureStorage.decryptAndRetrieve(
            `apiKey_${provider}`
          )
          if (storedKey) {
            keys[provider as keyof ApiKeys] = storedKey
            loadedFromStorage.push(provider)
          }
        } catch (error) {
          console.warn(`Failed to decrypt ${provider} key:`, error)
        }
      }

      if (loadedFromStorage.length > 0) {
        console.log(
          `Loaded API keys from secure storage for: ${loadedFromStorage.join(', ')}`
        )
      }

      // In development, pre-populate from env vars if no stored keys exist
      if (process.env.NODE_ENV === 'development') {
        await loadEnvDefaults(keys, providers, loadedFromStorage)
      }

      setApiKeys(keys)

      // Auto-enable providers that have API keys, load manual settings from localStorage
      const savedProviders = localStorage.getItem('enabledProviders')
      const parsed = savedProviders ? JSON.parse(savedProviders) : {}

      // Auto-enable providers that have keys, unless explicitly disabled
      const newEnabledProviders: EnabledProviders = {
        openai: Boolean(keys.openai) && parsed.openai !== false,
        anthropic: Boolean(keys.anthropic) && parsed.anthropic !== false,
        google: Boolean(keys.google) && parsed.google !== false,
        mistral: Boolean(keys.mistral) && parsed.mistral !== false,
        together: Boolean(keys.together) && parsed.together !== false,
      }

      setEnabledProviders(newEnabledProviders)
    } catch (error) {
      console.error('Error loading API keys:', error)
    }
    setIsLoading(false)
  }

  const saveApiKey = async (provider: keyof ApiKeys, key: string) => {
    try {
      if (key.trim()) {
        await SecureStorage.encryptAndStore(`apiKey_${provider}`, key)
        setApiKeys((prev) => ({ ...prev, [provider]: key }))
        // Auto-enable when API key is added
        setEnabledProviders((prev) => ({ ...prev, [provider]: true }))
      } else {
        // Remove empty key from storage
        localStorage.removeItem(`apiKey_${provider}`)
        setApiKeys((prev) => {
          const newKeys = { ...prev }
          delete newKeys[provider]
          return newKeys
        })
        // Auto-disable when API key is removed
        setEnabledProviders((prev) => ({ ...prev, [provider]: false }))
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      throw error
    }
  }

  const toggleProvider = (provider: keyof EnabledProviders) => {
    const newEnabledProviders = {
      ...enabledProviders,
      [provider]: !enabledProviders[provider],
    }
    setEnabledProviders(newEnabledProviders)
    localStorage.setItem(
      'enabledProviders',
      JSON.stringify(newEnabledProviders)
    )
  }

  const getApiKey = (provider: keyof ApiKeys): string | undefined => {
    return apiKeys[provider]
  }

  const isProviderEnabled = (provider: keyof EnabledProviders): boolean => {
    return enabledProviders[provider]
  }

  const hasApiKey = (provider: keyof ApiKeys): boolean => {
    return Boolean(apiKeys[provider])
  }

  const clearAllKeys = async () => {
    console.log('Reverting to defaults, loading from environment...')

    // Clear all storage
    SecureStorage.clearAll()
    setApiKeys({})
    localStorage.removeItem('enabledProviders')
    setEnabledProviders({
      openai: false,
      anthropic: false,
      google: false,
      mistral: false,
      together: false,
    })

    // In development, force reload from environment after clearing
    if (process.env.NODE_ENV === 'development') {
      // Small delay to ensure storage is cleared
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Force reload - this time loadEnvDefaults should find no existing keys
      await loadApiKeys()
    }
  }

  return {
    apiKeys,
    enabledProviders,
    isLoading,
    saveApiKey,
    toggleProvider,
    getApiKey,
    isProviderEnabled,
    hasApiKey,
    clearAllKeys,
    loadApiKeys,
  }
}
