'use client'
import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useApiKeys } from '../hooks/useApiKeys'
import { useAuthPopup } from '../hooks/useAuthPopup'
import AuthPopup from './AuthPopup'
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

const ApiKeysPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const { isPopupOpen, checkAuthAndRun, closePopup } = useAuthPopup()
  const {
    apiKeys,
    enabledProviders,
    isLoading,
    isAuthenticated,
    saveApiKey,
    clearApiKey,
    toggleProvider,
    getApiKey,
    clearAllKeys,
  } = useApiKeys()

  // Local state for UI
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKeyProvider, setNewKeyProvider] = useState<string>('')
  const [newKeyValue, setNewKeyValue] = useState<string>('')
  const [error, setError] = useState<string>('')

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

  // Get list of providers that have API keys
  const getConfiguredProviders = () => {
    return providers.filter(
      (provider) =>
        getApiKey(provider.id as keyof typeof enabledProviders) === '***'
    )
  }

  // Check if provider is configured
  const isProviderConfigured = (providerId: string) => {
    return getApiKey(providerId as keyof typeof enabledProviders) === '***'
  }

  const handleAddApiKey = async () => {
    setError('')

    if (!newKeyProvider || !newKeyValue.trim()) {
      setError('Please select a provider and enter an API key')
      return
    }

    if (isProviderConfigured(newKeyProvider)) {
      setError(
        'This provider already has an API key configured. Remove it first.'
      )
      return
    }

    try {
      await saveApiKey(
        newKeyProvider as keyof typeof enabledProviders,
        newKeyValue.trim()
      )
      setShowAddForm(false)
      setNewKeyProvider('')
      setNewKeyValue('')
    } catch (error) {
      setError('Failed to save API key')
      console.error('Error saving API key:', error)
    }
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

        {getConfiguredProviders().length === 0 && !showAddForm ? (
          <div className="text-center py-8">
            <div className="text-[#666] text-sm mb-2">
              No API keys configured
            </div>
            {isAuthenticated ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
              >
                Add your first API key
              </button>
            ) : (
              <div className="text-xs text-[#666]">Sign in to add API keys</div>
            )}
          </div>
        ) : getConfiguredProviders().length > 0 ? (
          <div className="space-y-3">
            {getConfiguredProviders().map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={provider.icon}
                    alt={provider.name}
                    width={20}
                    height={20}
                    className={`w-5 h-5 rounded flex-shrink-0 ${provider.id === 'anthropic' ? 'filter invert' : ''}`}
                  />
                  <div>
                    <div className="text-sm text-[#e0e0e0] font-medium">
                      {provider.name.replace(' API Key', '')}
                    </div>
                    <div className="text-xs text-[#666]">
                      API key configured
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggleProvider(provider.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      provider.enabled ? 'bg-[#667eea]' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-[#0a0a0a] rounded-full transition-transform ${
                        provider.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveApiKey(provider.id)}
                    className="p-1.5 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    title="Remove API key"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Add New API Key Form */}
      {showAddForm && isAuthenticated && (
        <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[#e0e0e0]">
              Add New API Key
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewKeyProvider('')
                setNewKeyValue('')
                setError('')
              }}
              className="text-[#888] hover:text-[#e0e0e0] p-1"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-400/20 rounded-md">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-xs text-[#aaa] mb-3">
              Select Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {providers.map((provider) => {
                const isConfigured = isProviderConfigured(provider.id)
                const isSelected = newKeyProvider === provider.id
                const isDisabled = isConfigured

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() =>
                      !isDisabled && setNewKeyProvider(provider.id)
                    }
                    disabled={isDisabled}
                    title={
                      isDisabled
                        ? `${provider.name.replace(' API Key', '')} is already configured. Remove the existing key first.`
                        : `Select ${provider.name.replace(' API Key', '')}`
                    }
                    className={`p-3 border rounded-md text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? 'border-[#667eea] bg-[#667eea]/10'
                        : isDisabled
                          ? 'border-[#2a2a2a] bg-[#1a1a1a]'
                          : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={provider.icon}
                        alt={provider.name}
                        width={16}
                        height={16}
                        className={`w-4 h-4 flex-shrink-0 ${provider.id === 'anthropic' ? 'filter invert' : ''}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-[#e0e0e0] font-medium truncate">
                          {provider.name.replace(' API Key', '')}
                        </p>
                        <p className="text-xs text-[#888] truncate">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    {isConfigured && (
                      <div className="mt-2 text-xs text-amber-400">
                        Already configured
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* API Key Input */}
          {newKeyProvider && (
            <div>
              <label className="block text-xs text-[#aaa] mb-2">API Key</label>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea] focus:outline-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAddApiKey}
              disabled={!newKeyProvider || !newKeyValue.trim()}
              className="px-4 py-2 bg-[#667eea] text-white rounded-md hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed transition-colors"
            >
              Add API Key
            </button>
          </div>
        </div>
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
