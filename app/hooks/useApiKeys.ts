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
  xai?: string
}

export interface EnabledProviders {
  openai: boolean
  anthropic: boolean
  google: boolean
  mistral: boolean
  together: boolean
  xai: boolean
}

interface ApiKeyValidationStatus {
  openai?: 'valid' | 'invalid' | 'validating' | null
  anthropic?: 'valid' | 'invalid' | 'validating' | null
  google?: 'valid' | 'invalid' | 'validating' | null
  mistral?: 'valid' | 'invalid' | 'validating' | null
  together?: 'valid' | 'invalid' | 'validating' | null
  xai?: 'valid' | 'invalid' | 'validating' | null
}

export const useApiKeys = (onSettingsChange?: () => void) => {
  const { data: session, status } = useSession()
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [enabledProviders, setEnabledProviders] = useState<EnabledProviders>({
    openai: false,
    anthropic: false,
    google: false,
    mistral: false,
    together: false,
    xai: false,
  })
  const [validationStatus, setValidationStatus] =
    useState<ApiKeyValidationStatus>({})
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
      const providers = [
        'openai',
        'anthropic',
        'google',
        'mistral',
        'together',
        'xai',
      ]
      const keys: ApiKeys = {}

      setApiKeys(keys)

      // Get API key status from the new endpoint
      let apiKeyStatus = {
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
        xai: false,
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
        xai: apiKeyStatus.xai && parsed.xai !== false,
      }

      // Update keys object to show masked values for set API keys
      if (apiKeyStatus.openai) keys.openai = '***'
      if (apiKeyStatus.anthropic) keys.anthropic = '***'
      if (apiKeyStatus.google) keys.google = '***'
      if (apiKeyStatus.mistral) keys.mistral = '***'
      if (apiKeyStatus.together) keys.together = '***'
      if (apiKeyStatus.xai) keys.xai = '***'

      setEnabledProviders(newEnabledProviders)
    } catch (error) {
      console.error('Error loading API keys:', error)
    }
    setIsLoading(false)
  }

  const validateApiKey = async (provider: keyof ApiKeys) => {
    try {
      setValidationStatus((prev) => ({ ...prev, [provider]: 'validating' }))

      const response = await fetch('/api/apikeys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      if (!response.ok) {
        throw new Error('Validation request failed')
      }

      const { isValid } = await response.json()
      const status = isValid ? 'valid' : 'invalid'

      setValidationStatus((prev) => ({ ...prev, [provider]: status }))

      // If invalid, disable the provider
      if (!isValid) {
        const newEnabledProviders = { ...enabledProviders, [provider]: false }
        setEnabledProviders(newEnabledProviders)
        await CloudSettings.setEnabledProviders(
          JSON.stringify(newEnabledProviders)
        )
      }

      return isValid
    } catch (error) {
      console.error('Error validating API key:', error)
      setValidationStatus((prev) => ({ ...prev, [provider]: 'invalid' }))
      return false
    }
  }

  const saveApiKey = async (provider: keyof ApiKeys, key: string) => {
    try {
      if (key.trim()) {
        // Store API key via CloudApiKeys and get updated status
        const updatedStatus = await CloudApiKeys.setApiKey(provider, key)

        // Update local state with actual server response
        const keys: ApiKeys = {}
        if (updatedStatus.openai) keys.openai = '***'
        if (updatedStatus.anthropic) keys.anthropic = '***'
        if (updatedStatus.google) keys.google = '***'
        if (updatedStatus.mistral) keys.mistral = '***'
        if (updatedStatus.together) keys.together = '***'
        setApiKeys(keys)

        // Validate the API key after saving
        const isValid = await validateApiKey(provider)

        // Only auto-enable if the key is valid
        if (isValid) {
          const newEnabledProviders = { ...enabledProviders, [provider]: true }
          setEnabledProviders(newEnabledProviders)
          await CloudSettings.setEnabledProviders(
            JSON.stringify(newEnabledProviders)
          )
          // Notify about settings change
          onSettingsChange?.()
        }
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

      // Refresh API key status from server to ensure consistency
      await loadApiKeys()

      // Clear validation status
      setValidationStatus((prev) => ({ ...prev, [provider]: null }))

      // Auto-disable when API key is removed (update settings separately)
      const newEnabledProviders = { ...enabledProviders, [provider]: false }
      setEnabledProviders(newEnabledProviders)
      await CloudSettings.setEnabledProviders(
        JSON.stringify(newEnabledProviders)
      )
      // Notify about settings change
      onSettingsChange?.()
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
      // Notify about settings change
      onSettingsChange?.()
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
        xai: false,
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
    validationStatus,
    isLoading,
    saveApiKey,
    clearApiKey,
    toggleProvider,
    getApiKey,
    isProviderEnabled,
    hasApiKey,
    clearAllKeys,
    loadApiKeys,
    validateApiKey,
    isAuthenticated: Boolean(session?.user),
  }
}
