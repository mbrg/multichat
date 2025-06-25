import React from 'react'

export interface FormTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  rows?: number
  maxLength?: number
  showCharCount?: boolean
}

/**
 * Reusable form textarea component with consistent styling and character counting
 * Follows DRY principle and provides consistent UX
 */
const FormTextarea: React.FC<FormTextareaProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  id,
  rows = 4,
  maxLength,
  showCharCount = false,
}) => {
  return (
    <div className="space-y-1">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-colors ${className}`}
      />

      {showCharCount && maxLength && (
        <div className="text-xs text-[#666] text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  )
}

export default FormTextarea
