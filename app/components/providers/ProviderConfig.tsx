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

interface ProviderConfigProps {
  provider: Provider
  validationStatus?: 'valid' | 'invalid' | 'validating' | null
  onToggle: (providerId: string) => void
  onRemove: (providerId: string) => void
}

/**
 * Single provider configuration component
 * Handles display and actions for one API key provider
 */
export const ProviderConfig: React.FC<ProviderConfigProps> = ({
  provider,
  validationStatus,
  onToggle,
  onRemove,
}) => {
  const getValidationDisplay = () => {
    switch (validationStatus) {
      case 'validating':
        return (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            Validating...
          </div>
        )
      case 'valid':
        return (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            Valid API key
          </div>
        )
      case 'invalid':
        return (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            Invalid API key
          </div>
        )
      default:
        return <div className="text-xs text-[#666]">API key configured</div>
    }
  }
  return (
    <div
      data-testid={`provider-${provider.id}`}
      className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
    >
      <div className="flex items-center gap-3">
        <Image
          src={provider.icon}
          alt={provider.name}
          width={20}
          height={20}
          className={`w-5 h-5 rounded flex-shrink-0 ${
            provider.id === 'anthropic' ? 'filter invert' : ''
          }`}
        />
        <div>
          <div className="text-sm text-[#e0e0e0] font-medium">
            {provider.name.replace(' API Key', '')}
          </div>
          {getValidationDisplay()}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Enable/Disable Toggle */}
        <button
          onClick={() => onToggle(provider.id)}
          disabled={validationStatus === 'invalid'}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            validationStatus === 'invalid'
              ? 'bg-[#2a2a2a] opacity-50 cursor-not-allowed'
              : provider.enabled
                ? 'bg-[#667eea]'
                : 'bg-[#2a2a2a]'
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
          onClick={() => onRemove(provider.id)}
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
  )
}
