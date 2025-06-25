import React from 'react'
import { SystemInstruction } from '../types/settings'

export interface SystemInstructionCardProps {
  instruction: SystemInstruction
  onToggle: (id: string) => void
  onEdit: (instruction: SystemInstruction) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

/**
 * Card component for displaying individual system instructions
 * Follows Single Responsibility Principle - only handles instruction display and actions
 */
const SystemInstructionCard: React.FC<SystemInstructionCardProps> = ({
  instruction,
  onToggle,
  onEdit,
  onDelete,
  disabled = false,
}) => {
  return (
    <div className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggle(instruction.id)}
            disabled={disabled}
            className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
            onClick={() => onEdit(instruction)}
            disabled={disabled}
            className="p-1.5 text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={() => onDelete(instruction.id)}
            disabled={disabled}
            className="p-1.5 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}

export default SystemInstructionCard
