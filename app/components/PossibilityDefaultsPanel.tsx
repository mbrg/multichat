'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../utils/cloudSettings'
import type { PossibilityDefaults } from '../types/settings'
import { TOKEN_LIMITS, DEFAULT_INITIAL_POSSIBILITIES } from '../services/ai/config'

const defaultValues: PossibilityDefaults = {
  maxInitial: DEFAULT_INITIAL_POSSIBILITIES,
  tokensPerPossibility: TOKEN_LIMITS.POSSIBILITY_DEFAULT,
  tokensReasoning: TOKEN_LIMITS.POSSIBILITY_REASONING,
  tokensContinuation: TOKEN_LIMITS.CONTINUATION_DEFAULT,
}

const PossibilityDefaultsPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const [values, setValues] = useState<PossibilityDefaults>(defaultValues)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status !== 'loading' && session?.user) {
      load()
    } else if (status !== 'loading') {
      setIsLoading(false)
    }
  }, [session, status])

  const load = async () => {
    try {
      setIsLoading(true)
      const saved = await CloudSettings.getPossibilityDefaults()
      setValues(saved)
    } catch (err) {
      console.warn('Failed to load possibility defaults:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (key: keyof PossibilityDefaults, val: number) => {
    setValues({ ...values, [key]: val })
  }

  const handleSave = async () => {
    try {
      await CloudSettings.setPossibilityDefaults(values)
    } catch (err) {
      console.error('Error saving defaults:', err)
    }
  }

  const handleReset = async () => {
    try {
      await CloudSettings.setPossibilityDefaults(defaultValues)
      setValues(defaultValues)
    } catch (err) {
      console.error('Error resetting defaults:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#2a2a2a] rounded w-3/4"></div>
          <div className="h-32 bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="text-center py-8">
        <div className="text-[#666] text-sm">Sign in to adjust defaults</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="w-56 text-sm text-[#e0e0e0]">Initial possibilities</label>
          <input
            type="number"
            min={1}
            value={values.maxInitial}
            onChange={(e) => handleChange('maxInitial', Number(e.target.value))}
            className="bg-[#111] border border-[#333] rounded px-2 py-1 w-24 text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="w-56 text-sm text-[#e0e0e0]">Tokens per possibility</label>
          <input
            type="number"
            min={1}
            value={values.tokensPerPossibility}
            onChange={(e) => handleChange('tokensPerPossibility', Number(e.target.value))}
            className="bg-[#111] border border-[#333] rounded px-2 py-1 w-24 text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="w-56 text-sm text-[#e0e0e0]">Tokens for reasoning models</label>
          <input
            type="number"
            min={1}
            value={values.tokensReasoning}
            onChange={(e) => handleChange('tokensReasoning', Number(e.target.value))}
            className="bg-[#111] border border-[#333] rounded px-2 py-1 w-24 text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="w-56 text-sm text-[#e0e0e0]">Tokens for continuations</label>
          <input
            type="number"
            min={1}
            value={values.tokensContinuation}
            onChange={(e) => handleChange('tokensContinuation', Number(e.target.value))}
            className="bg-[#111] border border-[#333] rounded px-2 py-1 w-24 text-sm"
          />
        </div>
      </div>
      <div className="pt-4 border-t border-[#2a2a2a] flex justify-end gap-2">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-[#555] hover:text-[#777] bg-transparent hover:bg-[#1a1a1a] rounded-md transition-colors border border-[#333] hover:border-[#444]"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm text-white bg-[#667eea] hover:bg-[#5a6fd8] rounded-md transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default PossibilityDefaultsPanel
