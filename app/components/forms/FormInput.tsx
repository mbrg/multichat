import React from 'react'

export interface FormInputProps {
  type?: 'text' | 'password' | 'email'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  maxLength?: number
}

/**
 * Reusable form input component with consistent styling
 * Follows DRY principle and provides consistent UX
 */
const FormInput: React.FC<FormInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  id,
  maxLength,
}) => {
  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={`w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    />
  )
}

export default FormInput
