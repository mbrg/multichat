'use client'
import React, { useState } from 'react'
import { Temperature } from '../../types/settings'

interface TemperatureFormProps {
  temperatures: Temperature[]
  onSave: (value: number) => Promise<void>
  onCancel: () => void
}

/**
 * Temperature addition form with validation
 * Handles form state, validation, and submission
 */
export const TemperatureForm: React.FC<TemperatureFormProps> = ({
  temperatures,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateAndSubmit = async () => {
    setError('')

    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
      setError('Temperature must be a number between 0 and 1')
      return
    }

    if (temperatures.length >= 3) {
      setError('Maximum of 3 temperatures allowed')
      return
    }

    if (temperatures.some((temp) => temp.value === numValue)) {
      setError('Temperature value already exists')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(numValue)
      // Form will be closed by parent component
    } catch (error) {
      setError('Failed to add temperature')
      console.error('Error adding temperature:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setValue('')
    setError('')
    onCancel()
  }

  const getPreviewLabel = (val: number): string => {
    if (val === 0) return 'Focused'
    if (val <= 0.3) return 'Conservative'
    if (val <= 0.7) return 'Balanced'
    if (val <= 1.0) return 'Creative'
    return 'Very Creative'
  }

  const numValue = parseFloat(value)
  const isValidNumber = !isNaN(numValue) && numValue >= 0 && numValue <= 1

  return (
    <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[#e0e0e0]">
          Add New Temperature
        </h4>
        <button
          onClick={handleCancel}
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
          Temperature Value (0.0 - 1.0)
        </label>
        <input
          type="number"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.7"
          data-testid="temperature-slider"
          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] text-base focus:outline-none focus:border-[#667eea] placeholder-[#666]"
        />
      </div>

      {/* Live Preview */}
      {isValidNumber && (
        <div className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md">
          <div className="text-xs text-[#aaa] mb-2">Preview:</div>
          <div className="flex items-center gap-3">
            <div
              className="text-sm font-mono text-[#e0e0e0]"
              data-testid="temperature-value"
            >
              {numValue.toFixed(1)}
            </div>
            <div className="flex-1">
              <div className="text-sm text-[#e0e0e0]">
                {getPreviewLabel(numValue)}
              </div>
              <div className="relative w-full h-1.5 bg-[#2a2a2a] rounded-full mt-1">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${numValue * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm text-[#aaa] hover:text-[#e0e0e0] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={validateAndSubmit}
          disabled={!isValidNumber || isSubmitting}
          className="px-3 py-1.5 text-sm bg-[#667eea] hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] text-white rounded-md transition-colors"
        >
          {isSubmitting ? 'Adding...' : 'Add Temperature'}
        </button>
      </div>
    </div>
  )
}
