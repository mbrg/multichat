import { useState, useEffect } from 'react'
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

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [enabledProviders, setEnabledProviders] = useState<EnabledProviders>({
    openai: false,
    anthropic: false,
    google: false,
    mistral: false,
    together: false
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load API keys and settings on mount
  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    setIsLoading(true)
    try {
      const providers = ['openai', 'anthropic', 'google', 'mistral', 'together']
      const keys: ApiKeys = {}
      
      // Load API keys from secure storage
      for (const provider of providers) {
        const key = await SecureStorage.decryptAndRetrieve(`apiKey_${provider}`)
        if (key) {
          keys[provider as keyof ApiKeys] = key
        }
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
        together: Boolean(keys.together) && parsed.together !== false
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
        setApiKeys(prev => ({ ...prev, [provider]: key }))
        // Auto-enable when API key is added
        setEnabledProviders(prev => ({ ...prev, [provider]: true }))
      } else {
        // Remove empty key from storage
        localStorage.removeItem(`apiKey_${provider}`)
        setApiKeys(prev => {
          const newKeys = { ...prev }
          delete newKeys[provider]
          return newKeys
        })
        // Auto-disable when API key is removed
        setEnabledProviders(prev => ({ ...prev, [provider]: false }))
      }
    } catch (error) {
      console.error(`Error saving ${provider} API key:`, error)
      throw error
    }
  }

  const toggleProvider = (provider: keyof EnabledProviders) => {
    const newEnabledProviders = {
      ...enabledProviders,
      [provider]: !enabledProviders[provider]
    }
    setEnabledProviders(newEnabledProviders)
    localStorage.setItem('enabledProviders', JSON.stringify(newEnabledProviders))
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

  const clearAllKeys = () => {
    SecureStorage.clearAll()
    setApiKeys({})
    localStorage.removeItem('enabledProviders')
    setEnabledProviders({
      openai: false,
      anthropic: false,
      google: false,
      mistral: false,
      together: false
    })
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
    loadApiKeys
  }
}