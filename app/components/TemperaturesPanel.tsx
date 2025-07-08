'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../utils/cloudSettings'
import { Temperature } from '../types/settings'
import { TemperaturesList } from './temperatures/TemperaturesList'
import { TemperatureForm } from './temperatures/TemperatureForm'

/**
 * Temperature settings panel
 * Manages temperature configurations for AI model responses
 */
const TemperaturesPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const [temperatures, setTemperatures] = useState<Temperature[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleSaveTemperature = async (value: number) => {
    const newTemperature: Temperature = {
      id: Date.now().toString(),
      value: value,
    }

    const updatedTemperatures = [...temperatures, newTemperature]
    await CloudSettings.setTemperatures(updatedTemperatures)
    setTemperatures(updatedTemperatures)
    setShowAddForm(false)
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

  const isAuthenticated = !!session?.user

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#e0e0e0]">
          Temperatures ({temperatures.length}/3)
        </h3>
        {isAuthenticated && temperatures.length < 3 && !showAddForm && (
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
      <TemperaturesList
        temperatures={temperatures}
        isAuthenticated={isAuthenticated}
        onShowAddForm={() => setShowAddForm(true)}
        onDeleteTemperature={handleDeleteTemperature}
      />

      {/* Add Form */}
      {showAddForm && isAuthenticated && (
        <TemperatureForm
          temperatures={temperatures}
          onSave={handleSaveTemperature}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Reset Button */}
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
