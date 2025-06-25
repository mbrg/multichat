'use client'
import React from 'react'
import Image from 'next/image'

interface Provider {
  id: string
  name: string
  icon: string
  description: string
  enabled: boolean
}

interface ProviderSelectionProps {
  providers: Provider[]
  selectedProvider: string
  onProviderSelect: (providerId: string) => void
  isProviderConfigured: (providerId: string) => boolean
}

/**
 * Provider selection grid for API key configuration
 * Handles provider selection logic and visual states
 */
export const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  providers,
  selectedProvider,
  onProviderSelect,
  isProviderConfigured,
}) => {
  return (
    <div>
      <label className="block text-xs text-[#aaa] mb-3">Select Provider</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {providers.map((provider) => {
          const isConfigured = isProviderConfigured(provider.id)
          const isSelected = selectedProvider === provider.id
          const isDisabled = isConfigured

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => !isDisabled && onProviderSelect(provider.id)}
              disabled={isDisabled}
              title={
                isDisabled
                  ? `${provider.name.replace(' API Key', '')} is already configured. Remove the existing key first.`
                  : `Select ${provider.name.replace(' API Key', '')}`
              }
              className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${
                isDisabled
                  ? 'border-[#2a2a2a] bg-[#0a0a0a]/50 opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'border-[#667eea] bg-[#667eea]/5 text-[#e0e0e0]'
                    : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#667eea]/50 hover:bg-[#667eea]/5 text-[#e0e0e0]'
              }`}
            >
              <Image
                src={provider.icon}
                alt={provider.name}
                width={20}
                height={20}
                className={`w-5 h-5 rounded flex-shrink-0 ${
                  provider.id === 'anthropic' ? 'filter invert' : ''
                } ${isDisabled ? 'opacity-50' : ''}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {provider.name.replace(' API Key', '')}
                </div>
                <div className="text-xs text-[#666] truncate">
                  {isConfigured ? 'Already configured' : provider.description}
                </div>
              </div>
              {isSelected && !isDisabled && (
                <div className="w-2 h-2 bg-[#667eea] rounded-full flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
