import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useApiKeys } from '../hooks/useApiKeys'
import AuthPopup from './AuthPopup'
import { useAuthPopup } from '../hooks/useAuthPopup'
import openaiLogo from '../assets/OpenAI-white-monoblossom.svg'
import geminiLogo from '../assets/gemini.svg'
import huggingfaceLogo from '../assets/huggingface.svg'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface Provider {
  id: string
  name: string
  icon: string
  placeholder: string
  enabled: boolean
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { data: session, status } = useSession()
  const { isPopupOpen, checkAuthAndRun, closePopup } = useAuthPopup()
  const {
    enabledProviders,
    isLoading,
    saveApiKey,
    clearApiKey,
    toggleProvider,
    getApiKey,
    clearAllKeys,
    isAuthenticated,
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
      placeholder: 'sk-...',
      enabled: enabledProviders.openai,
    },
    {
      id: 'anthropic',
      name: 'Anthropic API Key',
      icon: openaiLogo,
      placeholder: 'sk-ant-...',
      enabled: enabledProviders.anthropic,
    },
    {
      id: 'google',
      name: 'Google API Key',
      icon: geminiLogo,
      placeholder: 'AIza...',
      enabled: enabledProviders.google,
    },
    {
      id: 'mistral',
      name: 'Mistral API Key',
      icon: openaiLogo,
      placeholder: '...',
      enabled: enabledProviders.mistral,
    },
    {
      id: 'together',
      name: 'Together API Key',
      icon: huggingfaceLogo,
      placeholder: '...',
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

  // Get list of available providers (not yet configured)
  const getAvailableProviders = () => {
    return providers.filter(
      (provider) =>
        getApiKey(provider.id as keyof typeof enabledProviders) !== '***'
    )
  }

  // Handle adding a new API key
  const handleAddApiKey = async () => {
    setError('')

    if (!newKeyProvider || !newKeyValue.trim()) {
      setError('Please select a provider and enter an API key')
      return
    }

    // Check if provider already has a key
    if (getApiKey(newKeyProvider as keyof typeof enabledProviders) === '***') {
      setError(
        'This provider already has an API key. Remove the existing one first.'
      )
      return
    }

    try {
      await saveApiKey(
        newKeyProvider as keyof typeof enabledProviders,
        newKeyValue
      )
      setShowAddForm(false)
      setNewKeyProvider('')
      setNewKeyValue('')
    } catch (error) {
      setError('Failed to save API key. Please try again.')
      console.error('Error saving API key:', error)
    }
  }

  // Handle removing an API key
  const handleRemoveApiKey = async (providerId: string) => {
    try {
      await clearApiKey(providerId as keyof typeof enabledProviders)
    } catch (error) {
      console.error('Error removing API key:', error)
    }
  }

  // Handle toggling provider enabled/disabled state
  const handleToggleProvider = (providerId: string) => {
    // Only allow toggling if provider has an API key
    const hasKey =
      getApiKey(providerId as keyof typeof enabledProviders) === '***'
    if (!hasKey) return

    toggleProvider(providerId as keyof typeof enabledProviders)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-bold text-[#e0e0e0]">API Keys</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors"
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-6 text-center text-[#888]">Loading settings...</div>
        )}

        {/* Authentication Warning */}
        {!isLoading && !isAuthenticated && (
          <div className="p-6 bg-amber-900/20 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span>⚠️</span>
              <span>Sign in to securely store your API keys.</span>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="p-6 space-y-6">
            {/* Storage Status & Actions */}
            <div className="flex justify-between items-center pb-4 border-b border-[#2a2a2a]">
              <div className="text-xs text-[#666]">
                {isAuthenticated && (
                  <span className="text-green-400">
                    🔒 Stored securely in cloud
                  </span>
                )}
              </div>
              {(process.env.NODE_ENV === 'development' || isAuthenticated) && (
                <button
                  onClick={clearAllKeys}
                  className="px-4 py-2 text-sm text-[#aaa] hover:text-[#e0e0e0] bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
                >
                  {isAuthenticated ? 'Clear all keys' : 'Revert to defaults'}
                </button>
              )}
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
                    <div className="text-xs text-[#666]">
                      Sign in to add API keys
                    </div>
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
                          className="w-5 h-5 rounded flex-shrink-0"
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
                              provider.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0.5'
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
                  <div className="grid grid-cols-2 gap-2">
                    {providers.map((provider) => {
                      const isConfigured =
                        getApiKey(
                          provider.id as keyof typeof enabledProviders
                        ) === '***'
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
                          className={`relative p-3 border rounded-lg transition-all duration-200 ${
                            isSelected
                              ? 'border-[#667eea] bg-[#667eea]/10'
                              : isDisabled
                                ? 'border-[#2a2a2a] bg-[#1a1a1a] opacity-50 cursor-not-allowed'
                                : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a] hover:bg-[#1a1a1a]'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Image
                              src={provider.icon}
                              alt={provider.name}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded flex-shrink-0"
                            />
                            <span
                              className={`text-xs font-medium ${
                                isSelected
                                  ? 'text-[#667eea]'
                                  : isDisabled
                                    ? 'text-[#666]'
                                    : 'text-[#e0e0e0]'
                              }`}
                            >
                              {provider.name.replace(' API Key', '')}
                            </span>
                          </div>
                          {isConfigured && (
                            <div
                              className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full"
                              title="Already configured"
                            />
                          )}
                          {isSelected && !isDisabled && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-[#667eea] rounded-full" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-xs text-[#aaa] mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder={
                      newKeyProvider
                        ? providers.find((p) => p.id === newKeyProvider)
                            ?.placeholder
                        : 'Enter API key...'
                    }
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e0e0e0] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#667eea]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddApiKey}
                    disabled={!newKeyProvider || !newKeyValue.trim()}
                    className="px-4 py-2 text-sm text-white bg-[#667eea] hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    Add Key
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setNewKeyProvider('')
                      setNewKeyValue('')
                      setError('')
                    }}
                    className="px-4 py-2 text-sm text-[#aaa] hover:text-[#e0e0e0] bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default Settings
