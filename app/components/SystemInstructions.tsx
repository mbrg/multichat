import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { StorageService } from '../services/storage'
import { ApiKeyStorage } from '../types/storage'

interface SystemInstructionsProps {
  isOpen: boolean
  onClose: () => void
}

const SystemInstructions: React.FC<SystemInstructionsProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: session, status } = useSession()
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.'
  )
  const [storage, setStorage] = useState<ApiKeyStorage | null>(null)

  // Load settings on mount - only for authenticated users
  useEffect(() => {
    if (status !== 'loading' && session?.user && isOpen) {
      loadSettings()
    }
  }, [session, status, isOpen])

  const loadSettings = async () => {
    try {
      // Get storage instance
      const storageInstance = await StorageService.getStorage()
      setStorage(storageInstance)

      // Load system prompt from cloud storage
      const savedPrompt = await storageInstance.getSecret('systemPrompt')
      if (savedPrompt) {
        setSystemPrompt(savedPrompt)
      }
    } catch (error) {
      console.warn('Failed to load system prompt from cloud storage:', error)
    }
  }

  const handleSystemPromptChange = async (value: string) => {
    setSystemPrompt(value)
    if (storage) {
      try {
        await storage.storeSecret('systemPrompt', value)
      } catch (error) {
        console.error('Failed to save system prompt to cloud storage:', error)
      }
    }
  }

  const handleRevertToDefaults = async () => {
    const defaultPrompt =
      'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.'
    setSystemPrompt(defaultPrompt)
    if (storage) {
      try {
        await storage.storeSecret('systemPrompt', defaultPrompt)
      } catch (error) {
        console.error(
          'Failed to save default system prompt to cloud storage:',
          error
        )
      }
    }
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
            System Instructions
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Revert to defaults button */}
          <div className="flex justify-end pb-4 border-b border-[#2a2a2a]">
            <button
              onClick={handleRevertToDefaults}
              className="px-4 py-2 text-sm text-[#aaa] hover:text-[#e0e0e0] bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
            >
              Revert to defaults
            </button>
          </div>

          {/* System Instructions */}
          <div>
            <h3 className="text-base font-bold text-[#e0e0e0] mb-4">
              Customize AI Behavior
            </h3>
            <p className="text-sm text-[#888] mb-4">
              Define how the AI should behave and respond to your messages. This
              will be applied to all conversations.
            </p>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#666]">
                  {systemPrompt.length} / 1000
                </span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
                placeholder="You are a helpful AI assistant..."
                maxLength={1000}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[#e0e0e0] text-sm resize-y min-h-[120px] max-h-[300px] focus:outline-none focus:border-[#667eea] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemInstructions
