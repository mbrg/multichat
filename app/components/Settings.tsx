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
    toggleProvider,
    getApiKey,
    clearAllKeys,
    isAuthenticated,
  } = useApiKeys()

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

  const handleApiKeyChange = async (providerId: string, value: string) => {
    try {
      await saveApiKey(providerId as keyof typeof enabledProviders, value)
    } catch (error) {
      console.error('Error saving API key:', error)
    }
  }

  const handleToggleProvider = (providerId: string) => {
    // Don't allow enabling if no API key is provided
    const hasKey = getApiKey(providerId as keyof typeof enabledProviders)
    if (
      !hasKey &&
      !enabledProviders[providerId as keyof typeof enabledProviders]
    ) {
      return // Don't enable without API key
    }
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
          <h2 className="text-lg font-bold text-[#e0e0e0]">
            API Configuration
          </h2>
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
              <span>
                Sign in to securely store your API keys.
              </span>
            </div>
          </div>
        )}

        {/* API Keys Section */}
        {!isLoading && (
          <div className="p-6 space-y-6">
            {/* Storage Status & Actions */}
            <div className="flex justify-between items-center pb-4 border-b border-[#2a2a2a]">
              <div className="text-xs text-[#666]">
                {isAuthenticated ? (
                  <span className="text-green-400">
                    🔒 Stored securely in cloud
                  </span>
                ) : (
                  <span className="text-amber-400">
                    ⚠️ Environment variables only
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

            {providers.map((provider) => (
              <div
                key={provider.id}
                className="pb-5 border-b border-[#2a2a2a] last:border-b-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image
                      src={provider.icon}
                      alt={provider.name}
                      width={16}
                      height={16}
                      className="w-4 h-4 rounded flex-shrink-0"
                    />
                    <span className="text-sm text-[#aaa]">{provider.name}</span>
                  </div>
                  <button
                    onClick={() => handleToggleProvider(provider.id)}
                    disabled={
                      !getApiKey(
                        provider.id as keyof typeof enabledProviders
                      ) && !provider.enabled
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      provider.enabled ? 'bg-[#667eea]' : 'bg-[#2a2a2a]'
                    } ${!getApiKey(provider.id as keyof typeof enabledProviders) && !provider.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-[#0a0a0a] rounded-full transition-transform ${
                        provider.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder={
                      isAuthenticated
                        ? provider.placeholder
                        : `${provider.placeholder} (env var only)`
                    }
                    value={
                      getApiKey(provider.id as keyof typeof enabledProviders) ||
                      ''
                    }
                    onChange={(e) =>
                      handleApiKeyChange(provider.id, e.target.value)
                    }
                    disabled={!isAuthenticated}
                    className={`w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none transition-colors ${
                      isAuthenticated
                        ? 'bg-[#0a0a0a] border-[#2a2a2a] text-[#e0e0e0] focus:border-[#667eea]'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#666] cursor-not-allowed'
                    }`}
                  />
                  {!isAuthenticated &&
                    getApiKey(provider.id as keyof typeof enabledProviders) && (
                      <div className="absolute right-2 top-2 text-xs text-amber-400">
                        ENV
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default Settings
