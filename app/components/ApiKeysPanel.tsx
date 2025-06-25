'use client'
import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useApiKeys } from '../hooks/useApiKeys'
import { useAuthPopup } from '../hooks/useAuthPopup'
import AuthPopup from './AuthPopup'
import { ProvidersList } from './providers/ProvidersList'
import { ApiKeyForm } from './providers/ApiKeyForm'
import openaiLogo from '../assets/OpenAI-white-monoblossom.svg'
import anthropicLogo from '../assets/anthropic.png'
import geminiLogo from '../assets/gemini.svg'
import mistralLogo from '../assets/mistral.png'
import huggingfaceLogo from '../assets/huggingface.svg'

interface Provider {
  id: string
  name: string
  icon: string
  description: string
  enabled: boolean
}

/**
 * Main API Keys management panel
 * Orchestrates provider configuration and API key management
 */
const ApiKeysPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const { isPopupOpen, checkAuthAndRun, closePopup } = useAuthPopup()
  const {
    apiKeys,
    enabledProviders,
    validationStatus,
    isLoading,
    isAuthenticated,
    saveApiKey,
    clearApiKey,
    toggleProvider,
    getApiKey,
    clearAllKeys,
  } = useApiKeys()

  const [showAddForm, setShowAddForm] = useState(false)

  const providers: Provider[] = [
    {
      id: 'openai',
      name: 'OpenAI API Key',
      icon: openaiLogo,
      description: 'GPT-4, GPT-3.5-Turbo',
      enabled: enabledProviders.openai,
    },
    {
      id: 'anthropic',
      name: 'Anthropic API Key',
      icon: anthropicLogo,
      description: 'Claude Models',
      enabled: enabledProviders.anthropic,
    },
    {
      id: 'google',
      name: 'Google API Key',
      icon: geminiLogo,
      description: 'Gemini Models',
      enabled: enabledProviders.google,
    },
    {
      id: 'mistral',
      name: 'Mistral API Key',
      icon: mistralLogo,
      description: 'Mistral Models',
      enabled: enabledProviders.mistral,
    },
    {
      id: 'together',
      name: 'Together API Key',
      icon: huggingfaceLogo,
      description: 'Open Source Models',
      enabled: enabledProviders.together,
    },
  ]

  const getConfiguredProviders = () => {
    return providers.filter(
      (provider) =>
        getApiKey(provider.id as keyof typeof enabledProviders) === '***'
    )
  }

  const isProviderConfigured = (providerId: string) => {
    return getApiKey(providerId as keyof typeof enabledProviders) === '***'
  }

  const handleSaveApiKey = async (providerId: string, apiKey: string) => {
    await saveApiKey(providerId as keyof typeof enabledProviders, apiKey)
    setShowAddForm(false)
  }

  const handleRemoveApiKey = async (providerId: string) => {
    try {
      await clearApiKey(providerId as keyof typeof enabledProviders)
    } catch (error) {
      console.error('Error removing API key:', error)
    }
  }

  const handleToggleProvider = (providerId: string) => {
    toggleProvider(providerId as keyof typeof enabledProviders)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#2a2a2a] rounded w-3/4"></div>
          <div className="h-10 bg-[#2a2a2a] rounded"></div>
          <div className="h-10 bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Storage Status */}
      <div className="text-xs text-[#666]">
        {isAuthenticated && <span>🔒 API keys stored securely in cloud</span>}
      </div>

      {/* Configured API Keys List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#e0e0e0]">
            Configured API Keys
          </h3>
          {isAuthenticated && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
            >
              + Add Key
            </button>
          )}
        </div>

        <ProvidersList
          providers={providers}
          configuredProviders={getConfiguredProviders()}
          validationStatus={validationStatus}
          isAuthenticated={isAuthenticated}
          showAddForm={showAddForm}
          onShowAddForm={() => setShowAddForm(true)}
          onToggleProvider={handleToggleProvider}
          onRemoveApiKey={handleRemoveApiKey}
        />
      </div>

      {/* Add New API Key Form */}
      {showAddForm && isAuthenticated && (
        <ApiKeyForm
          providers={providers}
          isProviderConfigured={isProviderConfigured}
          onSave={handleSaveApiKey}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Clear All Button */}
      {(process.env.NODE_ENV === 'development' || isAuthenticated) &&
        getConfiguredProviders().length > 0 && (
          <div className="pt-4 border-t border-[#2a2a2a] flex justify-end">
            <button
              onClick={clearAllKeys}
              className="px-4 py-2 text-sm text-[#555] hover:text-[#777] bg-transparent hover:bg-[#1a1a1a] rounded-md transition-colors border border-[#333] hover:border-[#444]"
            >
              Reset to defaults
            </button>
          </div>
        )}

      {/* Auth Popup */}
      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default ApiKeysPanel
