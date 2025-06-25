import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { CloudApiKeys } from '../utils/cloudApiKeys'
import { CloudSettings } from '../utils/cloudSettings'

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

export const useApiKeys = () => {
  const { data: session, status } = useSession()
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [enabledProviders, setEnabledProviders] = useState<EnabledProviders>({
    openai: false,
    anthropic: false,
    google: false,
    mistral: false,
    together: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const hasInitialized = useRef(false)

  // Load API keys and settings on mount - only for authenticated users
  useEffect(() => {
    if (status !== 'loading' && !hasInitialized.current && session?.user) {
      hasInitialized.current = true
      loadApiKeys()
    }
  }, [session, status])

  const loadApiKeys = async () => {
    setIsLoading(true)
    try {
      const providers = ['openai', 'anthropic', 'google', 'mistral', 'together']
      const keys: ApiKeys = {}

      setApiKeys(keys)

      // Get API key status from the new endpoint
      let apiKeyStatus = {
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      }

      try {
        apiKeyStatus = await CloudApiKeys.getApiKeyStatus()
      } catch (error) {
        console.warn('Failed to load API key status:', error)
      }

      // Load enabled providers from settings
      let parsed: Partial<EnabledProviders> = {}
      try {
        const savedProviders = await CloudSettings.getEnabledProviders()
        parsed = savedProviders ? JSON.parse(savedProviders) : {}
      } catch (error) {
        console.warn(
          'Failed to load provider settings from cloud storage:',
          error
        )
      }

      // Auto-enable providers that have keys, unless explicitly disabled
      const newEnabledProviders: EnabledProviders = {
        openai: apiKeyStatus.openai && parsed.openai !== false,
        anthropic: apiKeyStatus.anthropic && parsed.anthropic !== false,
        google: apiKeyStatus.google && parsed.google !== false,
        mistral: apiKeyStatus.mistral && parsed.mistral !== false,
        together: apiKeyStatus.together && parsed.together !== false,
      }

      // Update keys object to show masked values for set API keys
      if (apiKeyStatus.openai) keys.openai = '***'
      if (apiKeyStatus.anthropic) keys.anthropic = '***'
      if (apiKeyStatus.google) keys.google = '***'
      if (apiKeyStatus.mistral) keys.mistral = '***'
      if (apiKeyStatus.together) keys.together = '***'

      setEnabledProviders(newEnabledProviders)
    } catch (error) {
      console.error('Error loading API keys:', error)
    }
    setIsLoading(false)
  }

  const saveApiKey = async (provider: keyof ApiKeys, key: string) => {
    try {
      if (key.trim()) {
        // Store API key via CloudApiKeys only
        await CloudApiKeys.setApiKey(provider, key)

        // Update local state
        setApiKeys((prev) => ({ ...prev, [provider]: '***' }))

        // Auto-enable when API key is added (update settings separately)
        const newEnabledProviders = { ...enabledProviders, [provider]: true }
        setEnabledProviders(newEnabledProviders)
        await CloudSettings.setEnabledProviders(
          JSON.stringify(newEnabledProviders)
        )
      } else {
        // Remove empty key
        await clearApiKey(provider)
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      throw error
    }
  }

  const clearApiKey = async (provider: keyof ApiKeys) => {
    try {
      // Remove API key via CloudApiKeys only
      await CloudApiKeys.deleteApiKey(provider)

      // Update local state
      setApiKeys((prev) => {
        const newKeys = { ...prev }
        delete newKeys[provider]
        return newKeys
      })

      // Auto-disable when API key is removed (update settings separately)
      const newEnabledProviders = { ...enabledProviders, [provider]: false }
      setEnabledProviders(newEnabledProviders)
      await CloudSettings.setEnabledProviders(
        JSON.stringify(newEnabledProviders)
      )
    } catch (error) {
      console.error('Error clearing API key:', error)
      throw error
    }
  }

  const toggleProvider = async (provider: keyof EnabledProviders) => {
    // Only update settings, not API keys
    const newEnabledProviders = {
      ...enabledProviders,
      [provider]: !enabledProviders[provider],
    }
    setEnabledProviders(newEnabledProviders)

    try {
      // Only update settings via CloudSettings, not CloudApiKeys
      await CloudSettings.setEnabledProviders(
        JSON.stringify(newEnabledProviders)
      )
    } catch (error) {
      console.error('Failed to save provider settings:', error)
      // Revert local state on error
      setEnabledProviders(enabledProviders)
    }
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
    console.log('Clearing all API keys...')

    try {
      // Clear both API keys and settings
      await Promise.all([
        CloudApiKeys.deleteAllApiKeys(),
        CloudSettings.deleteAllSettings(),
      ])

      setApiKeys({})
      setEnabledProviders({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      // Reload keys after clearing (will get env vars if in dev mode)
      await loadApiKeys()
    } catch (error) {
      console.error('Error clearing API keys:', error)
      throw error
    }
  }

  return {
    apiKeys,
    enabledProviders,
    isLoading,
    saveApiKey,
    clearApiKey,
    toggleProvider,
    getApiKey,
    isProviderEnabled,
    hasApiKey,
    clearAllKeys,
    loadApiKeys,
    isAuthenticated: Boolean(session?.user),
  }
}
