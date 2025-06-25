import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { UserSettings } from '@/types/settings'

interface UseSettingsResult {
  settings: UserSettings | null
  loading: boolean
  error: Error | null
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  deleteSettings: (key?: keyof UserSettings) => Promise<void>
  refresh: () => Promise<void>
}

export function useSettings(): UseSettingsResult {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSettings = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!session?.user?.id) {
      setLoading(false)
      setSettings(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/settings')

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }

      const data = await response.json()
      setSettings(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      // Don't update if user is not authenticated
      if (!session?.user?.id) {
        throw new Error('Authentication required to update settings')
      }

      try {
        setError(null)

        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error(`Failed to update settings: ${response.status}`)
        }

        const updatedSettings = await response.json()
        setSettings(updatedSettings)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        console.error('Failed to update settings:', error)
        throw error
      }
    },
    [session?.user?.id]
  )

  const deleteSettings = useCallback(
    async (key?: keyof UserSettings) => {
      // Don't delete if user is not authenticated
      if (!session?.user?.id) {
        throw new Error('Authentication required to delete settings')
      }

      try {
        setError(null)

        const url = key ? `/api/settings?key=${key}` : '/api/settings'
        const response = await fetch(url, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error(`Failed to delete settings: ${response.status}`)
        }

        const result = await response.json()

        if (key && result.settings) {
          setSettings(result.settings)
        } else {
          setSettings(null)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        console.error('Failed to delete settings:', error)
        throw error
      }
    },
    [session?.user?.id]
  )

  const refresh = useCallback(async () => {
    await fetchSettings()
  }, [fetchSettings])

  // Fetch settings when session is available and user is authenticated
  useEffect(() => {
    // Only fetch when we have session data (not loading) and user is authenticated
    if (status !== 'loading') {
      fetchSettings()
    }
  }, [fetchSettings, status])

  return {
    settings,
    loading,
    error,
    updateSettings,
    deleteSettings,
    refresh,
  }
}
