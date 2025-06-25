'use client'
import React from 'react'
import { Temperature } from '../../types/settings'
import { TemperatureCard } from './TemperatureCard'

interface TemperaturesListProps {
  temperatures: Temperature[]
  isAuthenticated: boolean
  onShowAddForm: () => void
  onDeleteTemperature: (id: string) => void
}

/**
 * List of configured temperature settings
 * Handles empty states and temperature listing
 */
export const TemperaturesList: React.FC<TemperaturesListProps> = ({
  temperatures,
  isAuthenticated,
  onShowAddForm,
  onDeleteTemperature,
}) => {
  if (temperatures.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-[#666] text-sm mb-2">
          No temperatures configured
        </div>
        {isAuthenticated ? (
          <button
            onClick={onShowAddForm}
            className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors"
          >
            Add your first temperature
          </button>
        ) : (
          <div className="text-xs text-[#666]">
            Sign in to manage temperatures
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {temperatures.map((temperature) => (
        <TemperatureCard
          key={temperature.id}
          temperature={temperature}
          onDelete={onDeleteTemperature}
        />
      ))}
    </div>
  )
}
