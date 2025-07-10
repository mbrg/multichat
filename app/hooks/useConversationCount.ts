import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export const useConversationCount = () => {
  const { data: session } = useSession()
  const [count, setCount] = useState(0)
  const [maxCount, setMaxCount] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCount = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/conversations/list')
        if (!response.ok) {
          throw new Error('Failed to fetch conversation count')
        }
        const data = await response.json()
        setCount(data.count || 0)
        setMaxCount(data.maxCount || 100)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load conversation count'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
  }, [session])

  const refresh = async () => {
    if (!session?.user) return

    setLoading(true)
    try {
      const response = await fetch('/api/conversations/list')
      if (!response.ok) {
        throw new Error('Failed to fetch conversation count')
      }
      const data = await response.json()
      setCount(data.count || 0)
      setMaxCount(data.maxCount || 100)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversation count'
      )
    } finally {
      setLoading(false)
    }
  }

  return {
    count,
    maxCount,
    loading,
    error,
    hasReachedLimit: count >= maxCount,
    refresh,
  }
}
