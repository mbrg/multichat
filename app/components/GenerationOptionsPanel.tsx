'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSettings } from '@/hooks/useSettings'
import { TOKEN_LIMITS, GENERATION_CONFIG } from '@/services/ai/config'

const GenerationOptionsPanel: React.FC = () => {
  const { data: session } = useSession()
  const { settings, updateSettings } = useSettings()

  const [maxInitial, setMaxInitial] = useState<number>(
    GENERATION_CONFIG.MAX_INITIAL_POSSIBILITIES
  )
  const [possTokens, setPossTokens] = useState<number>(
    TOKEN_LIMITS.POSSIBILITY_DEFAULT
  )
  const [reasonTokens, setReasonTokens] = useState<number>(
    TOKEN_LIMITS.POSSIBILITY_REASONING
  )
  const [contTokens, setContTokens] = useState<number>(
    TOKEN_LIMITS.CONTINUATION_DEFAULT
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setMaxInitial(
        settings.maxInitialPossibilities ??
          GENERATION_CONFIG.MAX_INITIAL_POSSIBILITIES
      )
      setPossTokens(
        settings.maxPossibilityTokens ?? TOKEN_LIMITS.POSSIBILITY_DEFAULT
      )
      setReasonTokens(
        settings.maxReasoningTokens ?? TOKEN_LIMITS.POSSIBILITY_REASONING
      )
      setContTokens(
        settings.continuationTokens ?? TOKEN_LIMITS.CONTINUATION_DEFAULT
      )
    }
  }, [settings])

  const handleSave = async () => {
    if (!session?.user) return
    setSaving(true)
    try {
      await updateSettings({
        maxInitialPossibilities: maxInitial,
        maxPossibilityTokens: possTokens,
        maxReasoningTokens: reasonTokens,
        continuationTokens: contTokens,
      })
    } finally {
      setSaving(false)
    }
  }

  const isAuthenticated = !!session?.user

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#e0e0e0]">
        Adjust how many suggestions are created and how many tokens each can
        use.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[#aaa] mb-2">
            Max Initial Possibilities
          </label>
          <input
            type="number"
            min="1"
            value={maxInitial}
            onChange={(e) => setMaxInitial(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] text-sm focus:outline-none focus:border-[#667eea]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#aaa] mb-2">
            Tokens per Possibility
          </label>
          <input
            type="number"
            min="1"
            value={possTokens}
            onChange={(e) => setPossTokens(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] text-sm focus:outline-none focus:border-[#667eea]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#aaa] mb-2">
            Tokens for Reasoning Models
          </label>
          <input
            type="number"
            min="1"
            value={reasonTokens}
            onChange={(e) => setReasonTokens(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] text-sm focus:outline-none focus:border-[#667eea]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#aaa] mb-2">
            Tokens for Continuations
          </label>
          <input
            type="number"
            min="1"
            value={contTokens}
            onChange={(e) => setContTokens(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e0e0e0] text-sm focus:outline-none focus:border-[#667eea]"
          />
        </div>
      </div>
      {isAuthenticated && (
        <div className="pt-4 flex justify-end border-t border-[#2a2a2a]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[#667eea] hover:bg-[#5a6fd8] text-white rounded-md disabled:bg-[#2a2a2a]"
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

export default GenerationOptionsPanel
