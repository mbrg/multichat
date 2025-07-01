'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ApiKeysPanel from './ApiKeysPanel'
import SystemInstructionsPanel from './SystemInstructionsPanel'
import TemperaturesPanel from './TemperaturesPanel'
import ErrorBoundary from './ErrorBoundary'
import { CloudSettings } from '../utils/cloudSettings'
import { useApiKeys } from '../hooks/useApiKeys'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: 'api-keys' | 'system-instructions' | 'temperatures'
}

type SettingsSection = 'api-keys' | 'system-instructions' | 'temperatures'

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  initialSection,
}) => {
  const { data: session, status } = useSession()
  const { clearAllKeys } = useApiKeys()

  const [activeSection, setActiveSection] = useState<SettingsSection>(
    initialSection || 'api-keys'
  )

  const sections = [
    { id: 'api-keys' as const, label: 'API Keys', icon: '🔑' },
    {
      id: 'system-instructions' as const,
      label: 'System Instructions',
      icon: '📝',
    },
    { id: 'temperatures' as const, label: 'Temperatures', icon: '🌡️' },
  ]

  // Update active section when initialSection changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

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
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-bold text-[#e0e0e0] flex items-center gap-2">
            <span>{sections.find((s) => s.id === activeSection)?.icon}</span>
            <span>{sections.find((s) => s.id === activeSection)?.label}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Auth Warning */}
        {status !== 'loading' && !session && (
          <div className="px-6 py-4 bg-amber-900/20 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span>⚠️</span>
              <span>Sign in to securely store your settings.</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1">
          <ErrorBoundary>
            {activeSection === 'api-keys' && <ApiKeysPanel />}
            {activeSection === 'system-instructions' && (
              <SystemInstructionsPanel />
            )}
            {activeSection === 'temperatures' && <TemperaturesPanel />}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default Settings
