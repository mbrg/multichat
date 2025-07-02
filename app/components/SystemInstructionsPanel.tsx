'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../utils/cloudSettings'
import { SystemInstruction } from '../types/settings'
import SystemInstructionCard from './SystemInstructionCard'
import SystemInstructionForm from './forms/SystemInstructionForm'
import { SYSTEM_INSTRUCTION_LIMITS } from '../constants/defaults'

const SystemInstructionsPanel: React.FC = () => {
  const { data: session, status } = useSession()

  const [systemInstructions, setSystemInstructions] = useState<
    SystemInstruction[]
  >([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingInstruction, setEditingInstruction] =
    useState<SystemInstruction | null>(null)
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

  const handleAddSystemInstruction = async (name: string, content: string) => {
    if (
      systemInstructions.length >= SYSTEM_INSTRUCTION_LIMITS.MAX_INSTRUCTIONS
    ) {
      throw new Error(
        `Maximum of ${SYSTEM_INSTRUCTION_LIMITS.MAX_INSTRUCTIONS} system instructions allowed`
      )
    }

    const newInstruction: SystemInstruction = {
      id: Date.now().toString(),
      name,
      content,
      enabled: true,
    }

    const updatedInstructions = [...systemInstructions, newInstruction]
    await CloudSettings.setSystemInstructions(updatedInstructions)
    setSystemInstructions(updatedInstructions)
    setShowAddForm(false)
  }

  const handleEditSystemInstruction = async (name: string, content: string) => {
    if (!editingInstruction) return

    const updatedInstructions = systemInstructions.map((inst) =>
      inst.id === editingInstruction.id ? { ...inst, name, content } : inst
    )
    await CloudSettings.setSystemInstructions(updatedInstructions)
    setSystemInstructions(updatedInstructions)
    setEditingInstruction(null)
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

  const handleResetToDefaults = async () => {
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
          System Instructions ({systemInstructions.length}/
          {SYSTEM_INSTRUCTION_LIMITS.MAX_INSTRUCTIONS})
        </h3>
        {systemInstructions.length <
          SYSTEM_INSTRUCTION_LIMITS.MAX_INSTRUCTIONS &&
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
          <SystemInstructionCard
            key={instruction.id}
            instruction={instruction}
            onToggle={handleToggleSystemInstruction}
            onEdit={setEditingInstruction}
            onDelete={handleDeleteSystemInstruction}
            disabled={isLoading}
          />
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <SystemInstructionForm
          mode="add"
          existingInstructions={systemInstructions}
          onSubmit={handleAddSystemInstruction}
          onCancel={() => setShowAddForm(false)}
          isLoading={isLoading}
        />
      )}

      {/* Edit Form */}
      {editingInstruction && (
        <SystemInstructionForm
          mode="edit"
          instruction={editingInstruction}
          existingInstructions={systemInstructions}
          onSubmit={handleEditSystemInstruction}
          onCancel={() => setEditingInstruction(null)}
          isLoading={isLoading}
        />
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
            onClick={handleResetToDefaults}
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
