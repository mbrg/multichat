'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getAllModels } from '@/services/ai/config'
import { CloudSettings } from '@/utils/cloudSettings'
import ModelToggle from './models/ModelToggle'
import { useApiKeys } from '../hooks/useApiKeys'
import type { EnabledProviders, ApiKeys } from '../hooks/useApiKeys'

const ModelsPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const { validationStatus, isProviderEnabled, hasApiKey } = useApiKeys()
  const [enabledModels, setEnabledModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const allModels = getAllModels()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const saved = await CloudSettings.getEnabledModels()
      setEnabledModels(saved || allModels.map((m) => m.id))
    } catch (err) {
      console.warn('Failed to load model settings:', err)
      setEnabledModels(allModels.map((m) => m.id))
    } finally {
      setIsLoading(false)
    }
  }, [allModels])

  useEffect(() => {
    if (status !== 'loading') {
      if (session?.user) {
        load()
      } else {
        setIsLoading(false)
      }
    }
  }, [status, session, load])

  const toggle = async (id: string) => {
    const newModels = enabledModels.includes(id)
      ? enabledModels.filter((m) => m !== id)
      : [...enabledModels, id]
    setEnabledModels(newModels)
    try {
      await CloudSettings.setEnabledModels(newModels)
    } catch (err) {
      console.error('Failed to save model settings:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
          <div className="h-10 bg-[#2a2a2a] rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-900/20 border border-blue-400/20 rounded-md text-blue-400 text-sm">
        Select which models are used for generating possibilities. Models from
        providers that are disabled or missing a valid API key will be ignored.
      </div>
      <div className="space-y-2">
        {allModels.map((model) => {
          const provider = model.provider as keyof EnabledProviders
          const active =
            isProviderEnabled(provider) &&
            hasApiKey(provider as keyof ApiKeys) &&
            validationStatus[provider] !== 'invalid'

          return (
            <ModelToggle
              key={model.id}
              model={model}
              enabled={enabledModels.includes(model.id)}
              onToggle={toggle}
              disabled={!session?.user}
              inactive={!active}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ModelsPanel
