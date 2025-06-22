import React, { useState, useEffect } from 'react'
import { useApiKeys } from '../hooks/useApiKeys'

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
  const {
    apiKeys,
    enabledProviders,
    isLoading,
    saveApiKey,
    toggleProvider,
    getApiKey
  } = useApiKeys()

  const providers: Provider[] = [
    {
      id: 'openai',
      name: 'OpenAI API Key',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
      placeholder: 'sk-...',
      enabled: enabledProviders.openai
    },
    {
      id: 'anthropic',
      name: 'Anthropic API Key',
      icon: 'https://asset.brandfetch.io/id__Lq5DDK/idHMNckids.svg',
      placeholder: 'sk-ant-...',
      enabled: enabledProviders.anthropic
    },
    {
      id: 'google',
      name: 'Google API Key',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg',
      placeholder: 'AIza...',
      enabled: enabledProviders.google
    },
    {
      id: 'mistral',
      name: 'Mistral API Key',
      icon: 'https://mistral.ai/images/logo_hubc88c4ece131b91c7cb753f40e9e1cc5_2589_256x0_resize_q97_h2_lanczos_3.webp',
      placeholder: '...',
      enabled: enabledProviders.mistral
    },
    {
      id: 'together',
      name: 'Together API Key',
      icon: 'https://assets-global.website-files.com/64f6f2c0e3f4c5a91c1e823a/6597f6c926a699b7e7e2b32b_together-logo.svg',
      placeholder: '...',
      enabled: enabledProviders.together
    }
  ]

  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.'
  )

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    // Load system prompt from localStorage
    const savedPrompt = localStorage.getItem('systemPrompt')
    if (savedPrompt) {
      setSystemPrompt(savedPrompt)
    }
  }

  const handleApiKeyChange = async (providerId: string, value: string) => {
    try {
      await saveApiKey(providerId as keyof typeof apiKeys, value)
    } catch (error) {
      console.error('Error saving API key:', error)
    }
  }

  const handleToggleProvider = (providerId: string) => {
    toggleProvider(providerId as keyof typeof enabledProviders)
  }

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value)
    localStorage.setItem('systemPrompt', value)
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
          <h2 className="text-lg font-bold text-[#e0e0e0]">API Configuration</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors"
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-6 text-center text-[#888]">
            Loading settings...
          </div>
        )}

        {/* API Keys Section */}
        {!isLoading && (
          <div className="p-6 space-y-6">
            {providers.map((provider) => (
              <div key={provider.id} className="pb-5 border-b border-[#2a2a2a] last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={provider.icon} 
                      alt={provider.name}
                      className="w-4 h-4 rounded flex-shrink-0"
                    />
                    <span className="text-sm text-[#aaa]">{provider.name}</span>
                  </div>
                  <button
                    onClick={() => handleToggleProvider(provider.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      provider.enabled ? 'bg-[#667eea]' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-[#0a0a0a] rounded-full transition-transform ${
                        provider.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <input
                  type="password"
                  placeholder={provider.placeholder}
                  value={getApiKey(provider.id as keyof typeof apiKeys) || ''}
                  onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[#e0e0e0] text-sm font-mono focus:outline-none focus:border-[#667eea] transition-colors"
                />
              </div>
            ))}

            {/* System Prompt Settings */}
            <div className="pt-6 border-t-2 border-[#2a2a2a]">
              <h3 className="text-base font-bold text-[#e0e0e0] mb-4">System Prompt</h3>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#666]">{systemPrompt.length} / 1000</span>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                  maxLength={1000}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[#e0e0e0] text-sm resize-y min-h-[100px] max-h-[200px] focus:outline-none focus:border-[#667eea] transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings