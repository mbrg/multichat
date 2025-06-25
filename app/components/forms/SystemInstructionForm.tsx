import React, { useState, useEffect } from 'react'
import { SystemInstruction } from '../../types/settings'
import {
  useFormValidation,
  createSystemInstructionValidation,
} from '../../hooks/useFormValidation'
import { SYSTEM_INSTRUCTION_LIMITS } from '../../constants/defaults'
import FormField from './FormField'
import FormInput from './FormInput'
import FormTextarea from './FormTextarea'
import FormActions from './FormActions'

export interface SystemInstructionFormProps {
  mode: 'add' | 'edit'
  instruction?: SystemInstruction
  existingInstructions: SystemInstruction[]
  onSubmit: (name: string, content: string) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

/**
 * Reusable form component for adding/editing system instructions
 * Follows Single Responsibility Principle and DRY principle
 */
const SystemInstructionForm: React.FC<SystemInstructionFormProps> = ({
  mode,
  instruction,
  existingInstructions,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with instruction data for edit mode
  useEffect(() => {
    if (mode === 'edit' && instruction) {
      setName(instruction.name)
      setContent(instruction.content)
    } else {
      setName('')
      setContent('')
    }
  }, [mode, instruction])

  // Set up validation
  const validationConfig = createSystemInstructionValidation(
    existingInstructions,
    instruction?.id
  )
  const { errors, validateForm, clearAllErrors } =
    useFormValidation(validationConfig)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = { name: name.trim(), content: content.trim() }

    if (!validateForm(formData)) {
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(formData.name, formData.content)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    clearAllErrors()
    onCancel()
  }

  const isFormDisabled = isLoading || isSubmitting
  const canSubmit = name.trim() && content.trim() && !isFormDisabled

  return (
    <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[#e0e0e0]">
          {mode === 'add'
            ? 'Add System Instruction'
            : 'Edit System Instruction'}
        </h4>
        <button
          onClick={handleCancel}
          disabled={isFormDisabled}
          className="text-[#888] hover:text-[#e0e0e0] p-1 disabled:opacity-50"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Name (lowercase, max 20 chars)"
          error={errors.name}
          required
          id="instruction-name"
        >
          <FormInput
            id="instruction-name"
            value={name}
            onChange={setName}
            placeholder="e.g., creative-writer, technical-expert"
            disabled={isFormDisabled}
            maxLength={SYSTEM_INSTRUCTION_LIMITS.MAX_NAME_CHARS}
          />
        </FormField>

        <FormField
          label={`Content (${content.length}/${SYSTEM_INSTRUCTION_LIMITS.MAX_CONTENT_CHARS})`}
          error={errors.content}
          required
          id="instruction-content"
        >
          <FormTextarea
            id="instruction-content"
            value={content}
            onChange={setContent}
            placeholder="Describe how the AI should behave..."
            disabled={isFormDisabled}
            rows={6}
            maxLength={SYSTEM_INSTRUCTION_LIMITS.MAX_CONTENT_CHARS}
            showCharCount={false}
          />
        </FormField>

        <FormActions
          actions={[
            {
              label: mode === 'add' ? 'Add Instruction' : 'Save Changes',
              onClick: () => handleSubmit(new Event('submit') as any),
              type: 'primary',
              disabled: !canSubmit,
            },
            {
              label: 'Cancel',
              onClick: handleCancel,
              type: 'secondary',
              disabled: isSubmitting,
            },
          ]}
        />
      </form>
    </div>
  )
}

export default SystemInstructionForm
