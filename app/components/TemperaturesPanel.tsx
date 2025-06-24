'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../utils/cloudSettings'
import { Temperature } from '../types/settings'

const TemperaturesPanel: React.FC = () => {
  const { data: session, status } = useSession()

  const [temperatures, setTemperatures] = useState<Temperature[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTemperatureValue, setNewTemperatureValue] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load temperatures on mount
  useEffect(() => {
    if (status !== 'loading' && session?.user) {
      loadTemperatures()
    } else if (status !== 'loading') {
      setIsLoading(false)
    }
  }, [session, status])

  const loadTemperatures = async () => {
    try {
      setIsLoading(true)
      const temps = await CloudSettings.getTemperatures()
      setTemperatures(temps)
    } catch (error) {
      console.warn('Failed to load temperatures:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTemperatureLabel = (value: number): string => {
    if (value === 0) return 'Focused'
    if (value <= 0.3) return 'Conservative'
    if (value <= 0.7) return 'Balanced'
    if (value <= 1.0) return 'Creative'
    return 'Very Creative'
  }

  const getTemperatureDescription = (value: number): string => {
    if (value === 0) return 'Deterministic'
    if (value <= 0.3) return 'Predictable'
    if (value <= 0.7) return 'Balanced'
    if (value <= 1.0) return 'Creative'
    return 'Diverse'
  }

  const handleAddTemperature = async () => {
    setError('')

    const value = parseFloat(newTemperatureValue)
    if (isNaN(value) || value < 0 || value > 1) {
      setError('Temperature must be a number between 0 and 1')
      return
    }

    if (temperatures.length >= 3) {
      setError('Maximum of 3 temperatures allowed')
      return
    }

    if (temperatures.some((temp) => temp.value === value)) {
      setError('Temperature value already exists')
      return
    }

    const newTemperature: Temperature = {
      id: Date.now().toString(),
      value: value,
    }

    try {
      const updatedTemperatures = [...temperatures, newTemperature]
      await CloudSettings.setTemperatures(updatedTemperatures)
      setTemperatures(updatedTemperatures)
      setShowAddForm(false)
      setNewTemperatureValue('')
    } catch (error) {
      setError('Failed to add temperature')
      console.error('Error adding temperature:', error)
    }
  }

  const handleDeleteTemperature = async (id: string) => {
    try {
      const updatedTemperatures = temperatures.filter((temp) => temp.id !== id)
      await CloudSettings.setTemperatures(updatedTemperatures)
      setTemperatures(updatedTemperatures)
    } catch (error) {
      console.error('Error deleting temperature:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#2a2a2a] rounded w-3/4"></div>
          <div className="h-16 bg-[#2a2a2a] rounded"></div>
          <div className="h-16 bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="text-center py-8">
        <div className="text-[#666] text-sm">
          Sign in to manage temperatures
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#e0e0e0]">
          Temperatures ({temperatures.length}/3)
        </h3>
        {temperatures.length < 3 && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
          >
            + Add Temperature
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-900/20 border border-blue-400/20 rounded-md">
        <div className="text-blue-400 text-sm">
          Lower values (0.1-0.3) = focused, higher values (0.7-1.0) = creative.
        </div>
      </div>

      {/* Temperatures List */}
      <div className="space-y-3">
        {temperatures.map((temperature) => (
          <div
            key={temperature.id}
            className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono text-[#667eea]">
                {temperature.value}
              </div>
              <div>
                <div className="text-sm font-medium text-[#e0e0e0]">
                  {getTemperatureLabel(temperature.value)}
                </div>
                <div className="text-xs text-[#888]">
                  {getTemperatureDescription(temperature.value)}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDeleteTemperature(temperature.id)}
              className="p-1.5 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
              title="Remove temperature"
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
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[#e0e0e0]">
              Add Temperature
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewTemperatureValue('')
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
              Temperature Value (0.0 - 1.0)
            </label>
            <div className="space-y-3">
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={newTemperatureValue}
                onChange={(e) => setNewTemperatureValue(e.target.value)}
                placeholder="e.g., 0.7"
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea] focus:outline-none"
              />

              {/* Quick presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: '0.1', label: 'Focused' },
                  { value: '0.3', label: 'Conservative' },
                  { value: '0.7', label: 'Balanced' },
                  { value: '0.9', label: 'Creative' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewTemperatureValue(preset.value)}
                    className={`p-2 text-xs border rounded-md transition-colors ${
                      newTemperatureValue === preset.value
                        ? 'border-[#667eea] bg-[#667eea]/10 text-[#667eea]'
                        : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#aaa] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="font-mono">{preset.value}</div>
                    <div>{preset.label}</div>
                  </button>
                ))}
              </div>

              {newTemperatureValue &&
                !isNaN(parseFloat(newTemperatureValue)) && (
                  <div className="text-xs text-[#888]">
                    {getTemperatureDescription(parseFloat(newTemperatureValue))}
                  </div>
                )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddTemperature}
              disabled={!newTemperatureValue.trim()}
              className="px-4 py-2 bg-[#667eea] text-white rounded-md hover:bg-[#5a6fd8] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed transition-colors"
            >
              Add Temperature
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {temperatures.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <div className="text-[#666] text-sm mb-2">
            No temperatures configured
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
          >
            Add your first temperature
          </button>
        </div>
      )}

      {/* Reset Section Button */}
      {temperatures.length > 0 && (
        <div className="pt-4 border-t border-[#2a2a2a] flex justify-end">
          <button
            onClick={async () => {
              try {
                const defaultTemperatures = [
                  {
                    id: 'default',
                    value: 0.7,
                  },
                ]
                await CloudSettings.setTemperatures(defaultTemperatures)
                setTemperatures(defaultTemperatures)
              } catch (error) {
                console.error('Error resetting temperatures:', error)
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

export default TemperaturesPanel
