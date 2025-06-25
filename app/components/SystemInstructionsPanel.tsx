'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../utils/cloudSettings'
import { SystemInstruction } from '../types/settings'
import {
  SYSTEM_INSTRUCTION_LIMITS,
  ERROR_MESSAGES,
  VALIDATION_PATTERNS,
} from '../constants/defaults'

const SYSTEM_INSTRUCTION_MAX_CHARS = SYSTEM_INSTRUCTION_LIMITS.MAX_CONTENT_CHARS

const SystemInstructionsPanel: React.FC = () => {
  const { data: session, status } = useSession()

  const [systemInstructions, setSystemInstructions] = useState<
    SystemInstruction[]
  >([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingInstruction, setEditingInstruction] =
    useState<SystemInstruction | null>(null)
  const [newInstructionName, setNewInstructionName] = useState('')
  const [newInstructionContent, setNewInstructionContent] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load system instructions on mount
  useEffect(() => {
    if (status !== 'loading' && session?.user) {
      loadSystemInstructions()
    } else if (status !== 'loading') {
      setIsLoading(false)
    }
  }, [session, status])

  const loadSystemInstructions = async () => {
    try {
      setIsLoading(true)
      const instructions = await CloudSettings.getSystemInstructions()
      setSystemInstructions(instructions)
    } catch (error) {
      console.warn('Failed to load system instructions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Validation helper for instruction names
  const validateInstructionName = (
    name: string,
    excludeId?: string
  ): string | null => {
    if (!name.trim()) {
      return ERROR_MESSAGES.NAME_REQUIRED
    }
    if (name !== name.toLowerCase()) {
      return ERROR_MESSAGES.NAME_MUST_BE_LOWERCASE
    }
    if (name.length > SYSTEM_INSTRUCTION_LIMITS.MAX_NAME_CHARS) {
      return ERROR_MESSAGES.NAME_TOO_LONG
    }
    if (!VALIDATION_PATTERNS.SYSTEM_INSTRUCTION_NAME.test(name)) {
      return ERROR_MESSAGES.NAME_INVALID_FORMAT
    }
    const existingInstruction = systemInstructions.find(
      (inst) => inst.name === name && inst.id !== excludeId
    )
    if (existingInstruction) {
      return ERROR_MESSAGES.NAME_MUST_BE_UNIQUE
    }
    return null
  }

  // Validation helper for instruction content
  const validateInstructionContent = (content: string): string | null => {
    if (!content.trim()) {
      return ERROR_MESSAGES.CONTENT_REQUIRED
    }
    if (content.length > SYSTEM_INSTRUCTION_MAX_CHARS) {
      return ERROR_MESSAGES.CONTENT_TOO_LONG
    }
    return null
  }

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
      setShowAddForm(false)
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

  const startEdit = (instruction: SystemInstruction) => {
    setEditingInstruction(instruction)
    setNewInstructionName(instruction.name)
    setNewInstructionContent(instruction.content)
    setError('')
  }

  const cancelEdit = () => {
    setEditingInstruction(null)
    setNewInstructionName('')
    setNewInstructionContent('')
    setError('')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#2a2a2a] rounded w-3/4"></div>
          <div className="h-20 bg-[#2a2a2a] rounded"></div>
          <div className="h-20 bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="text-center py-8">
        <div className="text-[#666] text-sm">
          Sign in to manage system instructions
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#e0e0e0]">
          System Instructions ({systemInstructions.length}/3)
        </h3>
        {systemInstructions.length < 3 &&
          !showAddForm &&
          !editingInstruction && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
            >
              + Add Instruction
            </button>
          )}
      </div>

      {/* Instructions List */}
      <div className="space-y-3">
        {systemInstructions.map((instruction) => (
          <div
            key={instruction.id}
            className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleSystemInstruction(instruction.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    instruction.enabled ? 'bg-[#667eea]' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-[#0a0a0a] rounded-full transition-transform ${
                      instruction.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <div>
                  <h4 className="text-sm font-medium text-[#e0e0e0]">
                    {instruction.name}
                  </h4>
                  <p className="text-xs text-[#666]">
                    {instruction.enabled ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(instruction)}
                  className="p-1.5 text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors"
                  title="Edit instruction"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteSystemInstruction(instruction.id)}
                  className="p-1.5 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                  title="Delete instruction"
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
            <div className="text-sm text-[#ccc] leading-relaxed">
              {instruction.content}
            </div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[#e0e0e0]">
              Add System Instruction
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false)
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

          <div>
            <label className="block text-xs text-[#aaa] mb-2">
              Name (lowercase, max 20 chars)
            </label>
            <input
              type="text"
              value={newInstructionName}
              onChange={(e) => setNewInstructionName(e.target.value)}
              placeholder="e.g., creative-writer, technical-expert"
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#aaa] mb-2">
              Content ({newInstructionContent.length}/
              {SYSTEM_INSTRUCTION_MAX_CHARS})
            </label>
            <textarea
              value={newInstructionContent}
              onChange={(e) => setNewInstructionContent(e.target.value)}
              placeholder="Describe how the AI should behave..."
              rows={6}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea] focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddSystemInstruction}
              disabled={
                !newInstructionName.trim() || !newInstructionContent.trim()
              }
              className="px-4 py-2 bg-[#667eea] text-white rounded-md hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed transition-colors"
            >
              Add Instruction
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingInstruction && (
        <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[#e0e0e0]">
              Edit System Instruction
            </h4>
            <button
              onClick={cancelEdit}
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

          <div>
            <label className="block text-xs text-[#aaa] mb-2">
              Name (lowercase, max 20 chars)
            </label>
            <input
              type="text"
              value={newInstructionName}
              onChange={(e) => setNewInstructionName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] focus:border-[#667eea] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#aaa] mb-2">
              Content ({newInstructionContent.length}/
              {SYSTEM_INSTRUCTION_MAX_CHARS})
            </label>
            <textarea
              value={newInstructionContent}
              onChange={(e) => setNewInstructionContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] focus:border-[#667eea] focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleEditSystemInstruction}
              disabled={
                !newInstructionName.trim() || !newInstructionContent.trim()
              }
              className="px-4 py-2 bg-[#667eea] text-white rounded-md hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-[#aaa] hover:text-[#e0e0e0] bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {systemInstructions.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <div className="text-[#666] text-sm mb-2">
            No system instructions configured
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
          >
            Add your first instruction
          </button>
        </div>
      )}

      {/* Reset Section Button */}
      {systemInstructions.length > 0 && (
        <div className="pt-4 border-t border-[#2a2a2a] flex justify-end">
          <button
            onClick={async () => {
              try {
                const defaultInstructions = [
                  {
                    id: 'default',
                    name: 'default',
                    content:
                      'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.',
                    enabled: true,
                  },
                ]
                await CloudSettings.setSystemInstructions(defaultInstructions)
                setSystemInstructions(defaultInstructions)
              } catch (error) {
                console.error('Error resetting system instructions:', error)
              }
            }}
            className="px-4 py-2 text-sm text-[#555] hover:text-[#777] bg-transparent hover:bg-[#1a1a1a] rounded-md transition-colors border border-[#333] hover:border-[#444]"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}

export default SystemInstructionsPanel
