import { useState, useCallback } from 'react'
import { SYSTEM_INSTRUCTION_LIMITS } from '@/constants/defaults'

export interface ValidationRule {
  validator: (value: any, formData?: Record<string, any>) => boolean
  message: string
}

export interface FieldConfig {
  required?: boolean
  rules?: ValidationRule[]
}

export interface FormConfig {
  [key: string]: FieldConfig
}

export interface UseFormValidationReturn {
  errors: Record<string, string>
  isValid: boolean
  validate: (
    field: string,
    value: any,
    formData?: Record<string, any>
  ) => string | null
  validateForm: (formData: Record<string, any>) => boolean
  setError: (field: string, message: string) => void
  clearError: (field: string) => void
  clearAllErrors: () => void
}

/**
 * Hook for form validation with configurable rules
 * Follows Single Responsibility Principle - only handles validation logic
 */
export const useFormValidation = (
  config: FormConfig
): UseFormValidationReturn => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(
    (
      field: string,
      value: any,
      formData?: Record<string, any>
    ): string | null => {
      const fieldConfig = config[field]
      if (!fieldConfig) return null

      // Required validation
      if (
        fieldConfig.required &&
        (!value || (typeof value === 'string' && !value.trim()))
      ) {
        return 'This field is required'
      }

      // Custom rules validation
      if (fieldConfig.rules) {
        for (const rule of fieldConfig.rules) {
          if (!rule.validator(value, formData)) {
            return rule.message
          }
        }
      }

      return null
    },
    [config]
  )

  const validateForm = useCallback(
    (formData: Record<string, any>): boolean => {
      const newErrors: Record<string, string> = {}
      let isFormValid = true

      Object.keys(config).forEach((field) => {
        const error = validate(field, formData[field], formData)
        if (error) {
          newErrors[field] = error
          isFormValid = false
        }
      })

      setErrors(newErrors)
      return isFormValid
    },
    [config, validate]
  )

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }))
  }, [])

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev
      return rest
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const isValid = Object.keys(errors).length === 0

  return {
    errors,
    isValid,
    validate,
    validateForm,
    setError,
    clearError,
    clearAllErrors,
  }
}

/**
 * System instruction validation rules
 */
export const createSystemInstructionValidation = (
  existingInstructions: Array<{ id: string; name: string }> = [],
  excludeId?: string
) => ({
  name: {
    required: true,
    rules: [
      {
        validator: (value: string) => value === value.toLowerCase(),
        message: 'Name must be lowercase',
      },
      {
        validator: (value: string) => value.length <= 20,
        message: 'Name must be 20 characters or less',
      },
      {
        validator: (value: string) => /^[a-z0-9\-_]+$/.test(value),
        message:
          'Name can only contain lowercase letters, numbers, hyphens, and underscores',
      },
      {
        validator: (value: string) => {
          return !existingInstructions.some(
            (inst) => inst.name === value && inst.id !== excludeId
          )
        },
        message: 'Name must be unique',
      },
    ],
  },
  content: {
    required: true,
    rules: [
      {
        validator: (value: string) =>
          value.length <= SYSTEM_INSTRUCTION_LIMITS.MAX_CONTENT_CHARS,
        message: `Content must be ${SYSTEM_INSTRUCTION_LIMITS.MAX_CONTENT_CHARS} characters or less`,
      },
    ],
  },
})

/**
 * API key validation rules
 */
export const createApiKeyValidation = (configuredProviders: string[] = []) => ({
  provider: {
    required: true,
    rules: [
      {
        validator: (value: string) => !configuredProviders.includes(value),
        message: 'This provider already has an API key configured',
      },
    ],
  },
  apiKey: {
    required: true,
    rules: [
      {
        validator: (value: string) => value.trim().length > 0,
        message: 'API key cannot be empty',
      },
      {
        validator: (value: string) => value.length >= 10,
        message: 'API key seems too short',
      },
    ],
  },
})
