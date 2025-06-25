import React from 'react'

export interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  id?: string
}

/**
 * Reusable form field component with consistent styling and error handling
 * Follows DRY principle and provides consistent UX across forms
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-xs text-[#aaa]">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {children}

      {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
    </div>
  )
}

export default FormField
