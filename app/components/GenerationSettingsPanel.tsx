'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../utils/cloudSettings'
import { TOKEN_LIMITS } from '../services/ai/config'

type GenerationDefaults = {
  possibilityTokens: number
  reasoningTokens: number
  continuationTokens: number
  maxInitialPossibilities: number
}

const GenerationSettingsPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const [values, setValues] = useState<GenerationDefaults>({
    possibilityTokens: TOKEN_LIMITS.POSSIBILITY_DEFAULT,
    reasoningTokens: TOKEN_LIMITS.POSSIBILITY_REASONING,
    continuationTokens: TOKEN_LIMITS.CONTINUATION_DEFAULT,
    maxInitialPossibilities: 12,
  })
  const [initialValues, setInitialValues] = useState<GenerationDefaults | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status !== 'loading') {
      CloudSettings.getGenerationDefaults()
        .then((v) => {
          setValues(v)
          setInitialValues(v)
        })
        .finally(() => setIsLoading(false))
    }
  }, [status])

  const handleChange = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const hasChanges =
    initialValues !== null &&
    (values.possibilityTokens !== initialValues.possibilityTokens ||
      values.reasoningTokens !== initialValues.reasoningTokens ||
      values.continuationTokens !== initialValues.continuationTokens ||
      values.maxInitialPossibilities !== initialValues.maxInitialPossibilities)

  const handleSave = async () => {
    setIsSaving(true)
    await CloudSettings.setGenerationDefaults(values)
    setInitialValues(values)
    setIsSaving(false)
  }

  const handleReset = async () => {
    const defaults = {
      possibilityTokens: TOKEN_LIMITS.POSSIBILITY_DEFAULT,
      reasoningTokens: TOKEN_LIMITS.POSSIBILITY_REASONING,
      continuationTokens: TOKEN_LIMITS.CONTINUATION_DEFAULT,
      maxInitialPossibilities: 12,
    }
    await CloudSettings.setGenerationDefaults(defaults)
    setValues(defaults)
    setInitialValues(defaults)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
          <div className="h-16 bg-[#2a2a2a] rounded" />
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-base text-[#e0e0e0]'

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-900/20 border border-blue-400/20 rounded-md text-blue-400 text-sm">
        Configure token limits and how many possibilities load automatically.
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Tokens per possibility</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className={inputClass}
            value={values.possibilityTokens}
            
            onChange={(e) =>
              handleChange('possibilityTokens', parseInt(e.target.value))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">
            Tokens per reasoning possibility
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className={inputClass}
            value={values.reasoningTokens}
            onChange={(e) =>
              handleChange('reasoningTokens', parseInt(e.target.value))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">
            Tokens for continued generation
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className={inputClass}
            value={values.continuationTokens}
            onChange={(e) =>
              handleChange('continuationTokens', parseInt(e.target.value))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Possibilities to load</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className={inputClass}
            value={values.maxInitialPossibilities}
            onChange={(e) =>
              handleChange('maxInitialPossibilities', parseInt(e.target.value))
            }
          />
        </div>
      </div>
      {session?.user && (
        <div className="pt-4 border-t border-[#2a2a2a] flex justify-end space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-[#555] hover:text-[#777] bg-transparent hover:bg-[#1a1a1a] rounded-md transition-colors border border-[#333] hover:border-[#444]"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 text-sm text-[#667eea] hover:text-[#5a6fd8] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-md transition-colors disabled:bg-[#2a2a2a] disabled:text-[#666]"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

export default GenerationSettingsPanel
