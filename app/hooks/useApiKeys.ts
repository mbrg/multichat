import { useState, useEffect, useRef } from 'react'
import { StorageService } from '../services/storage'
import { ApiKeyStorage } from '../types/storage'
import { useSession } from 'next-auth/react'

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
  const [isLoading, setIsLoading] = useState(true)
  const [storage, setStorage] = useState<ApiKeyStorage | null>(null)
  const hasInitialized = useRef(false)

  // Load API keys and settings on mount
  useEffect(() => {
    if (status !== 'loading' && !hasInitialized.current) {
      hasInitialized.current = true
      loadApiKeys()
    }
  }, [session, status])

  const loadApiKeys = async () => {
    setIsLoading(true)
    try {
      const providers = ['openai', 'anthropic', 'google', 'mistral', 'together']
      const keys: ApiKeys = {}

      // Get appropriate storage implementation
      const storageInstance = await StorageService.getStorage()
      setStorage(storageInstance)

      try {
        const allKeys = await storageInstance.getAllApiKeys()
        Object.assign(keys, allKeys)
        console.log(`Loaded API keys for: ${Object.keys(allKeys).join(', ')}`)
      } catch (error) {
        console.warn('Failed to load keys from storage:', error)
      }

      setApiKeys(keys)

      // Auto-enable providers that have API keys, load manual settings from cloud storage
      let parsed: Partial<EnabledProviders> = {}
      try {
        const savedProviders =
          await storageInstance.getSecret('enabledProviders')
        parsed = savedProviders ? JSON.parse(savedProviders) : {}
      } catch (error) {
        console.warn(
          'Failed to load provider settings from cloud storage:',
          error
        )
      }

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
    if (!storage) {
      console.error('Storage not initialized')
      return
    }

    try {
      if (key.trim()) {
        await storage.storeApiKey(provider, key)
        setApiKeys((prev) => ({ ...prev, [provider]: key }))
        // Auto-enable when API key is added
        setEnabledProviders((prev) => ({ ...prev, [provider]: true }))
      } else {
        // Remove empty key
        await storage.removeApiKey(provider)
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

  const toggleProvider = async (provider: keyof EnabledProviders) => {
    const newEnabledProviders = {
      ...enabledProviders,
      [provider]: !enabledProviders[provider],
    }
    setEnabledProviders(newEnabledProviders)
    if (storage) {
      try {
        await storage.storeSecret(
          'enabledProviders',
          JSON.stringify(newEnabledProviders)
        )
      } catch (error) {
        console.error(
          'Failed to save provider settings to cloud storage:',
          error
        )
      }
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
    if (!storage) {
      console.error('Storage not initialized')
      return
    }

    console.log('Clearing all API keys...')

    try {
      await storage.clearAllSecrets()

      setApiKeys({})
      try {
        await storage.removeSecret('enabledProviders')
      } catch (error) {
        console.warn(
          'Failed to remove provider settings from cloud storage:',
          error
        )
      }
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
    toggleProvider,
    getApiKey,
    isProviderEnabled,
    hasApiKey,
    clearAllKeys,
    loadApiKeys,
    isAuthenticated: Boolean(session?.user),
    storage,
  }
}
