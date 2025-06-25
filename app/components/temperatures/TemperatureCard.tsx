'use client'
import React from 'react'
import { Temperature } from '../../types/settings'

interface TemperatureCardProps {
  temperature: Temperature
  onDelete: (id: string) => void
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

/**
 * Individual temperature display card
 * Shows temperature value, label, and delete action
 */
export const TemperatureCard: React.FC<TemperatureCardProps> = ({
  temperature,
  onDelete,
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col items-center gap-1">
          <div className="text-lg font-mono text-[#e0e0e0]">
            {temperature.value.toFixed(1)}
          </div>
          <div className="text-xs text-[#666]">temp</div>
        </div>
        <div className="flex-1">
          <div className="text-sm text-[#e0e0e0] font-medium">
            {getTemperatureLabel(temperature.value)}
          </div>
          <div className="text-xs text-[#666]">
            {getTemperatureDescription(temperature.value)}
          </div>
        </div>
        <div className="flex-1 max-w-32">
          <div className="relative w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-orange-500 transition-all"
              style={{ width: `${temperature.value * 100}%` }}
            />
          </div>
        </div>
      </div>
      <button
        onClick={() => onDelete(temperature.id)}
        className="p-1.5 text-[#888] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors ml-3"
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
  )
}
