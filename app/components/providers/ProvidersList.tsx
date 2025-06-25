'use client'
import React from 'react'
import { ProviderConfig } from './ProviderConfig'

interface Provider {
  id: string
  name: string
  icon: string
  description: string
  enabled: boolean
}

interface ProvidersListProps {
  providers: Provider[]
  configuredProviders: Provider[]
  validationStatus: Record<string, 'valid' | 'invalid' | 'validating' | null>
  isAuthenticated: boolean
  showAddForm: boolean
  onShowAddForm: () => void
  onToggleProvider: (providerId: string) => void
  onRemoveApiKey: (providerId: string) => void
}

/**
 * List of configured API key providers
 * Handles empty states and provider listing
 */
export const ProvidersList: React.FC<ProvidersListProps> = ({
  configuredProviders,
  validationStatus,
  isAuthenticated,
  showAddForm,
  onShowAddForm,
  onToggleProvider,
  onRemoveApiKey,
}) => {
  if (configuredProviders.length === 0 && !showAddForm) {
    return (
      <div className="text-center py-8">
        <div className="text-[#666] text-sm mb-2">No API keys configured</div>
        {isAuthenticated ? (
          <button
            onClick={onShowAddForm}
            className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
          >
            Add your first API key
          </button>
        ) : (
          <div className="text-xs text-[#666]">Sign in to add API keys</div>
        )}
      </div>
    )
  }

  if (configuredProviders.length === 0 && showAddForm) {
    return null // Don't render anything when form is open and no providers configured
  }

  return (
    <div className="space-y-3">
      {configuredProviders.map((provider) => (
        <ProviderConfig
          key={provider.id}
          provider={provider}
          validationStatus={validationStatus[provider.id]}
          onToggle={onToggleProvider}
          onRemove={onRemoveApiKey}
        />
      ))}
    </div>
  )
}
