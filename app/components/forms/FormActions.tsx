import React from 'react'

export interface FormAction {
  label: string
  onClick: () => void
  type?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export interface FormActionsProps {
  actions: FormAction[]
  className?: string
}

/**
 * Reusable form actions component with consistent button styling
 * Follows DRY principle and provides consistent UX
 */
const FormActions: React.FC<FormActionsProps> = ({
  actions,
  className = '',
}) => {
  const getButtonStyles = (type: FormAction['type'] = 'primary') => {
    const baseStyles =
      'px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:cursor-not-allowed'

    switch (type) {
      case 'primary':
        return `${baseStyles} bg-[#667eea] text-white hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666]`
      case 'secondary':
        return `${baseStyles} text-[#aaa] hover:text-[#e0e0e0] bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-50`
      case 'danger':
        return `${baseStyles} text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 disabled:opacity-50`
      default:
        return `${baseStyles} bg-[#667eea] text-white hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666]`
    }
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          disabled={action.disabled}
          className={getButtonStyles(action.type)}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export default FormActions
