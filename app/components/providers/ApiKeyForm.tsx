'use client'
import React, { useState } from 'react'
import { ProviderSelection } from './ProviderSelection'

interface Provider {
  id: string
  name: string
  icon: string
  description: string
  enabled: boolean
}

interface ApiKeyFormProps {
  providers: Provider[]
  isProviderConfigured: (providerId: string) => boolean
  onSave: (providerId: string, apiKey: string) => Promise<void>
  onCancel: () => void
}

/**
 * API key addition form with validation
 * Handles form state, validation, and submission
 */
export const ApiKeyForm: React.FC<ApiKeyFormProps> = ({
  providers,
  isProviderConfigured,
  onSave,
  onCancel,
}) => {
  const [selectedProvider, setSelectedProvider] = useState('')
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setError('')

    if (!selectedProvider || !apiKeyValue.trim()) {
      setError('Please select a provider and enter an API key')
      return
    }

    if (isProviderConfigured(selectedProvider)) {
      setError(
        'This provider already has an API key configured. Remove it first.'
      )
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(selectedProvider, apiKeyValue.trim())
      // Form will be closed by parent component
    } catch (error) {
      setError('Failed to save API key')
      console.error('Error saving API key:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedProvider('')
    setApiKeyValue('')
    setError('')
    onCancel()
  }

  return (
    <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[#e0e0e0]">Add New API Key</h4>
        <button
          onClick={handleCancel}
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

      <ProviderSelection
        providers={providers}
        selectedProvider={selectedProvider}
        onProviderSelect={setSelectedProvider}
        isProviderConfigured={isProviderConfigured}
      />

      {/* API Key Input */}
      {selectedProvider && (
        <div>
          <label className="block text-xs text-[#aaa] mb-2">API Key</label>
          <input
            type="password"
            value={apiKeyValue}
            onChange={(e) => setApiKeyValue(e.target.value)}
            placeholder="Enter your API key..."
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] text-base focus:outline-none focus:border-[#667eea] placeholder-[#666]"
          />
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm text-[#aaa] hover:text-[#e0e0e0] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedProvider || !apiKeyValue.trim() || isSubmitting}
          className="px-3 py-1.5 text-sm bg-[#667eea] hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] text-white rounded-md transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save API Key'}
        </button>
      </div>
    </div>
  )
}
