import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useApiKeys } from '../hooks/useApiKeys'
import AuthPopup from './AuthPopup'
import { useAuthPopup } from '../hooks/useAuthPopup'
import {
  CloudSettings,
  SystemInstruction,
  Temperature,
} from '../utils/cloudSettings'
import openaiLogo from '../assets/OpenAI-white-monoblossom.svg'
import geminiLogo from '../assets/gemini.svg'
import huggingfaceLogo from '../assets/huggingface.svg'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: 'api-keys' | 'system-instructions' | 'temperatures'
}

interface Provider {
  id: string
  name: string
  icon: string
  placeholder: string
  enabled: boolean
}

type SettingsSection = 'api-keys' | 'system-instructions' | 'temperatures'

const SYSTEM_INSTRUCTION_MAX_CHARS = 6000

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  initialSection,
}) => {
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
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    initialSection || 'api-keys'
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKeyProvider, setNewKeyProvider] = useState<string>('')
  const [newKeyValue, setNewKeyValue] = useState<string>('')
  const [error, setError] = useState<string>('')

  // System instructions state
  const [systemInstructions, setSystemInstructions] = useState<
    SystemInstruction[]
  >([])
  const [showAddInstructionForm, setShowAddInstructionForm] = useState(false)
  const [editingInstruction, setEditingInstruction] =
    useState<SystemInstruction | null>(null)
  const [newInstructionName, setNewInstructionName] = useState('')
  const [newInstructionContent, setNewInstructionContent] = useState('')

  // Temperatures state
  const [temperatures, setTemperatures] = useState<Temperature[]>([])
  const [showAddTemperatureForm, setShowAddTemperatureForm] = useState(false)
  const [newTemperatureValue, setNewTemperatureValue] = useState('')

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

  const sections = [
    { id: 'api-keys' as const, label: 'API Keys', icon: '⚙️' },
    {
      id: 'system-instructions' as const,
      label: 'System Instructions',
      icon: '📝',
    },
    { id: 'temperatures' as const, label: 'Temperatures', icon: '🌡️' },
  ]

  // Load settings on mount
  useEffect(() => {
    if (status !== 'loading' && session?.user && isOpen) {
      loadSettings()
    }
  }, [session, status, isOpen])

  // Update active section when initialSection changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

  const loadSettings = async () => {
    try {
      const [instructions, temps] = await Promise.all([
        CloudSettings.getSystemInstructions(),
        CloudSettings.getTemperatures(),
      ])
      setSystemInstructions(instructions)
      setTemperatures(temps)
    } catch (error) {
      console.warn('Failed to load settings:', error)
    }
  }

  // Validation helper for instruction names
  const validateInstructionName = (
    name: string,
    excludeId?: string
  ): string | null => {
    if (!name.trim()) {
      return 'Name is required'
    }
    if (name !== name.toLowerCase()) {
      return 'Name must be lowercase'
    }
    if (name.length > 20) {
      return 'Name must be 20 characters or less'
    }
    if (!/^[a-z0-9-_]+$/.test(name)) {
      return 'Name can only contain lowercase letters, numbers, hyphens, and underscores'
    }
    const existingInstruction = systemInstructions.find(
      (inst) => inst.name === name && inst.id !== excludeId
    )
    if (existingInstruction) {
      return 'Name must be unique'
    }
    return null
  }

  // Validation helper for instruction content
  const validateInstructionContent = (content: string): string | null => {
    if (!content.trim()) {
      return 'Content is required'
    }
    if (content.length > SYSTEM_INSTRUCTION_MAX_CHARS) {
      return `Content must be ${SYSTEM_INSTRUCTION_MAX_CHARS} characters or less`
    }
    return null
  }

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

  // System instructions handlers
  const handleAddSystemInstruction = async () => {
    setError('')

    const nameError = validateInstructionName(newInstructionName)
    if (nameError) {
      setError(nameError)
      return
    }

    const contentError = validateInstructionContent(newInstructionContent)
    if (contentError) {
      setError(contentError)
      return
    }

    if (systemInstructions.length >= 3) {
      setError('Maximum of 3 system instructions allowed')
      return
    }

    const newInstruction: SystemInstruction = {
      id: Date.now().toString(),
      name: newInstructionName.trim(),
      content: newInstructionContent.trim(),
      enabled: true,
    }

    try {
      const updatedInstructions = [...systemInstructions, newInstruction]
      await CloudSettings.setSystemInstructions(updatedInstructions)
      setSystemInstructions(updatedInstructions)
      setShowAddInstructionForm(false)
      setNewInstructionName('')
      setNewInstructionContent('')
    } catch (error) {
      setError('Failed to add system instruction')
      console.error('Error adding system instruction:', error)
    }
  }

  const handleEditSystemInstruction = async () => {
    if (!editingInstruction) return

    setError('')

    const nameError = validateInstructionName(
      newInstructionName,
      editingInstruction.id
    )
    if (nameError) {
      setError(nameError)
      return
    }

    const contentError = validateInstructionContent(newInstructionContent)
    if (contentError) {
      setError(contentError)
      return
    }

    try {
      const updatedInstructions = systemInstructions.map((inst) =>
        inst.id === editingInstruction.id
          ? {
              ...inst,
              name: newInstructionName.trim(),
              content: newInstructionContent.trim(),
            }
          : inst
      )
      await CloudSettings.setSystemInstructions(updatedInstructions)
      setSystemInstructions(updatedInstructions)
      setEditingInstruction(null)
      setNewInstructionName('')
      setNewInstructionContent('')
    } catch (error) {
      setError('Failed to update system instruction')
      console.error('Error updating system instruction:', error)
    }
  }

  const handleDeleteSystemInstruction = async (id: string) => {
    try {
      const updatedInstructions = systemInstructions.filter(
        (inst) => inst.id !== id
      )
      await CloudSettings.setSystemInstructions(updatedInstructions)
      setSystemInstructions(updatedInstructions)
    } catch (error) {
      console.error('Error deleting system instruction:', error)
    }
  }

  const handleToggleSystemInstruction = async (id: string) => {
    try {
      const updatedInstructions = systemInstructions.map((inst) =>
        inst.id === id ? { ...inst, enabled: !inst.enabled } : inst
      )
      await CloudSettings.setSystemInstructions(updatedInstructions)
      setSystemInstructions(updatedInstructions)
    } catch (error) {
      console.error('Error toggling system instruction:', error)
    }
  }

  // Temperature handlers
  const handleAddTemperature = async () => {
    setError('')

    const value = parseFloat(newTemperatureValue)
    if (isNaN(value) || value < 0 || value > 1) {
      setError('Temperature must be a number between 0 and 1')
      return
    }

    if (temperatures.length >= 3) {
      setError('Maximum of 3 temperatures allowed')
      return
    }

    if (temperatures.some((temp) => temp.value === value)) {
      setError('Temperature value already exists')
      return
    }

    const newTemperature: Temperature = {
      id: Date.now().toString(),
      value: value,
    }

    try {
      const updatedTemperatures = [...temperatures, newTemperature]
      await CloudSettings.setTemperatures(updatedTemperatures)
      setTemperatures(updatedTemperatures)
      setShowAddTemperatureForm(false)
      setNewTemperatureValue('')
    } catch (error) {
      setError('Failed to add temperature')
      console.error('Error adding temperature:', error)
    }
  }

  const handleDeleteTemperature = async (id: string) => {
    try {
      const updatedTemperatures = temperatures.filter((temp) => temp.id !== id)
      await CloudSettings.setTemperatures(updatedTemperatures)
      setTemperatures(updatedTemperatures)
    } catch (error) {
      console.error('Error deleting temperature:', error)
    }
  }

  // Reset all settings to defaults
  const handleResetToDefaults = async () => {
    try {
      await Promise.all([clearAllKeys(), CloudSettings.resetToDefaults()])
      await loadSettings()
    } catch (error) {
      console.error('Error resetting to defaults:', error)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getTemperatureLabel = (value: number): string => {
    if (value === 0) return 'Focused'
    if (value <= 0.3) return 'Conservative'
    if (value <= 0.7) return 'Balanced'
    if (value <= 1.0) return 'Creative'
    return 'Very Creative'
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-bold text-[#e0e0e0] flex items-center gap-2">
            <span>{sections.find((s) => s.id === activeSection)?.icon}</span>
            <span>{sections.find((s) => s.id === activeSection)?.label}</span>
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
              <span>Sign in to securely store your settings.</span>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="p-6">
            {/* API Keys Section */}
            {activeSection === 'api-keys' && (
              <div className="space-y-6">
                {/* Storage Status */}
                <div className="text-xs text-green-400">
                  {isAuthenticated && (
                    <span>🔒 API keys stored securely in cloud</span>
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
                                provider.enabled
                                  ? 'bg-[#667eea]'
                                  : 'bg-[#2a2a2a]'
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

            {/* System Instructions Section */}
            {activeSection === 'system-instructions' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#e0e0e0]">
                      System Instructions ({systemInstructions.length}/3)
                    </h3>
                    {isAuthenticated &&
                      !showAddInstructionForm &&
                      !editingInstruction &&
                      systemInstructions.length < 3 && (
                        <button
                          onClick={() => setShowAddInstructionForm(true)}
                          className="px-3 py-1.5 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
                        >
                          + Add Instruction
                        </button>
                      )}
                  </div>

                  {systemInstructions.length === 0 &&
                  !showAddInstructionForm ? (
                    <div className="text-center py-8">
                      <div className="text-[#666] text-sm mb-2">
                        No system instructions configured
                      </div>
                      {isAuthenticated ? (
                        <button
                          onClick={() => setShowAddInstructionForm(true)}
                          className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
                        >
                          Add your first instruction
                        </button>
                      ) : (
                        <div className="text-xs text-[#666]">
                          Sign in to add system instructions
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {systemInstructions.map((instruction) => (
                        <div
                          key={instruction.id}
                          className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-[#e0e0e0]">
                                  {instruction.name}
                                </h4>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    instruction.enabled
                                      ? 'bg-green-900/30 text-green-400'
                                      : 'bg-gray-700/30 text-gray-400'
                                  }`}
                                >
                                  {instruction.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-[#888] line-clamp-2">
                                {instruction.content} (
                                {instruction.content.length} chars)
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {/* Enable/Disable Toggle */}
                              <button
                                onClick={() =>
                                  handleToggleSystemInstruction(instruction.id)
                                }
                                className={`relative w-8 h-4 rounded-full transition-colors ${
                                  instruction.enabled
                                    ? 'bg-[#667eea]'
                                    : 'bg-[#2a2a2a]'
                                }`}
                                title={
                                  instruction.enabled ? 'Disable' : 'Enable'
                                }
                              >
                                <div
                                  className={`absolute top-0.5 w-3 h-3 bg-[#0a0a0a] rounded-full transition-transform ${
                                    instruction.enabled
                                      ? 'translate-x-4'
                                      : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setEditingInstruction(instruction)
                                  setNewInstructionName(instruction.name)
                                  setNewInstructionContent(instruction.content)
                                }}
                                className="p-1 text-[#888] hover:text-[#667eea] hover:bg-[#667eea]/10 rounded-md transition-colors"
                                title="Edit instruction"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              {/* Delete Button */}
                              <button
                                onClick={() =>
                                  handleDeleteSystemInstruction(instruction.id)
                                }
                                className="p-1 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                title="Delete instruction"
                              >
                                <svg
                                  className="w-3 h-3"
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add/Edit System Instruction Form */}
                {(showAddInstructionForm || editingInstruction) &&
                  isAuthenticated && (
                    <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[#e0e0e0]">
                          {editingInstruction
                            ? 'Edit System Instruction'
                            : 'Add New System Instruction'}
                        </h4>
                        <button
                          onClick={() => {
                            setShowAddInstructionForm(false)
                            setEditingInstruction(null)
                            setNewInstructionName('')
                            setNewInstructionContent('')
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

                      {/* Name Input */}
                      <div>
                        <label className="block text-xs text-[#aaa] mb-2">
                          Name (lowercase, max 20 chars, unique)
                        </label>
                        <input
                          type="text"
                          value={newInstructionName}
                          onChange={(e) =>
                            setNewInstructionName(e.target.value)
                          }
                          placeholder="assistant-helper"
                          maxLength={20}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e0e0e0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#667eea]"
                        />
                      </div>

                      {/* Content Input */}
                      <div>
                        <label className="block text-xs text-[#aaa] mb-2">
                          Content ({newInstructionContent.length}/
                          {SYSTEM_INSTRUCTION_MAX_CHARS})
                        </label>
                        <textarea
                          value={newInstructionContent}
                          onChange={(e) =>
                            setNewInstructionContent(e.target.value)
                          }
                          placeholder="You are a helpful AI assistant..."
                          rows={4}
                          maxLength={SYSTEM_INSTRUCTION_MAX_CHARS}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e0e0e0] rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:border-[#667eea]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={
                            editingInstruction
                              ? handleEditSystemInstruction
                              : handleAddSystemInstruction
                          }
                          disabled={
                            !newInstructionName.trim() ||
                            !newInstructionContent.trim()
                          }
                          className="px-4 py-2 text-sm text-white bg-[#667eea] hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed rounded-md transition-colors"
                        >
                          {editingInstruction ? 'Update' : 'Add'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddInstructionForm(false)
                            setEditingInstruction(null)
                            setNewInstructionName('')
                            setNewInstructionContent('')
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

            {/* Temperatures Section */}
            {activeSection === 'temperatures' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#e0e0e0]">
                      Temperatures ({temperatures.length}/3)
                    </h3>
                    {isAuthenticated &&
                      !showAddTemperatureForm &&
                      temperatures.length < 3 && (
                        <button
                          onClick={() => setShowAddTemperatureForm(true)}
                          className="px-3 py-1.5 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
                        >
                          + Add Temperature
                        </button>
                      )}
                  </div>

                  {temperatures.length === 0 && !showAddTemperatureForm ? (
                    <div className="text-center py-8">
                      <div className="text-[#666] text-sm mb-2">
                        No temperatures configured
                      </div>
                      {isAuthenticated ? (
                        <button
                          onClick={() => setShowAddTemperatureForm(true)}
                          className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
                        >
                          Add your first temperature
                        </button>
                      ) : (
                        <div className="text-xs text-[#666]">
                          Sign in to add temperatures
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {temperatures.map((temperature) => (
                        <div
                          key={temperature.id}
                          className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-mono text-[#e0e0e0]">
                              {temperature.value}
                            </div>
                            <div className="text-xs text-[#666]">
                              {getTemperatureLabel(temperature.value)}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleDeleteTemperature(temperature.id)
                            }
                            className="p-1.5 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                            title="Delete temperature"
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
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Temperature Form */}
                {showAddTemperatureForm && isAuthenticated && (
                  <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#e0e0e0]">
                        Add New Temperature
                      </h4>
                      <button
                        onClick={() => {
                          setShowAddTemperatureForm(false)
                          setNewTemperatureValue('')
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

                    {/* Temperature Input */}
                    <div>
                      <label className="block text-xs text-[#aaa] mb-2">
                        Temperature (0.0 - 1.0)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={newTemperatureValue}
                        onChange={(e) => setNewTemperatureValue(e.target.value)}
                        placeholder="0.7"
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e0e0e0] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#667eea]"
                      />
                      <div className="text-xs text-[#666] mt-1">
                        0.0 = Focused, 0.7 = Balanced, 1.0 = Creative
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTemperature}
                        disabled={!newTemperatureValue.trim()}
                        className="px-4 py-2 text-sm text-white bg-[#667eea] hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed rounded-md transition-colors"
                      >
                        Add Temperature
                      </button>
                      <button
                        onClick={() => {
                          setShowAddTemperatureForm(false)
                          setNewTemperatureValue('')
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
        )}

        {/* Reset to defaults button at bottom */}
        {!isLoading && isAuthenticated && (
          <div className="p-6 pt-0">
            <div className="pt-4 border-t border-[#2a2a2a] flex justify-end">
              <button
                onClick={handleResetToDefaults}
                className="px-3 py-1.5 text-xs text-[#aaa] hover:text-[#e0e0e0] bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default Settings
