import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ChatMessage } from '../types/api'
import { UserSettings } from '../types/settings'
import {
  PossibilityMetadataService,
  PossibilityMetadata,
} from '../services/ai/PossibilityMetadataService'
import { getDefaultTokenLimit } from '../services/ai/config'

// Connection pooling to prevent resource overload
const MAX_CONCURRENT_CONNECTIONS = 6
let activeConnections = 0
const connectionQueue: (() => void)[] = []

interface PossibilityState {
  id: string
  content: string
  isComplete: boolean
  metadata: PossibilityMetadata
  probability: number | null
  error: string | null
}

export function useSimplePossibilities(
  messages: ChatMessage[],
  settings: UserSettings | null
) {
  // Generate metadata once - never changes during a session
  const metadata = useMemo(() => {
    if (!settings) return []
    const service = new PossibilityMetadataService()
    return service.generatePrioritizedMetadata(settings)
  }, [settings])

  // Simple state - no complex maps or sets
  const [possibilities, setPossibilities] = useState<PossibilityState[]>([])

  // Simple loading state
  const [isLoading, setIsLoading] = useState(false)

  // Track loading states to prevent duplicates
  const loadingRef = useRef<Set<string>>(new Set())

  // Track abort controllers for cleanup
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // Only cancel requests on unmount to clean up properly
  useEffect(() => {
    const abortControllers = abortControllersRef.current
    const loadingSet = loadingRef.current

    return () => {
      // Cancel all active requests on unmount
      abortControllers.forEach((controller) => {
        controller.abort()
      })
      abortControllers.clear()
      // Clear loading state so requests can be retried on remount
      loadingSet.clear()
    }
  }, [])

  // Store messages and metadata in refs to avoid recreating loadPossibility
  const messagesRef = useRef(messages)
  const metadataRef = useRef(metadata)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    metadataRef.current = metadata
  }, [metadata])

  const loadPossibility = useCallback(
    async (possibilityId: string) => {
      // Don't load if settings are not available
      if (!settings) return
      const meta = metadata.find(
        (m: PossibilityMetadata) => m.id === possibilityId
      )
      if (!meta) return

      // Check if already loading or loaded to prevent duplicates
      if (loadingRef.current.has(possibilityId)) {
        return
      }

      // Mark as loading immediately
      loadingRef.current.add(possibilityId)

      // Add to state immediately - user sees it right away
      setPossibilities((prev) => [
        ...prev,
        {
          id: possibilityId,
          content: '',
          isComplete: false,
          metadata: meta,
          probability: null,
          error: null,
        },
      ])

      // Connection pooling: queue request if too many active
      const executeRequest = async () => {
        const abortController = new AbortController()
        abortControllersRef.current.set(possibilityId, abortController)

        try {
          activeConnections++
          setIsLoading(true)

          // Use existing API - it already works
          const maxTokens = getDefaultTokenLimit(meta.model, {
            possibilityTokens: settings.possibilityTokens,
            reasoningTokens: settings.reasoningTokens,
          })

          const response = await fetch(`/api/possibility/${possibilityId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages,
              permutation: meta,
              options: { maxTokens },
            }),
            signal: abortController.signal,
          })

          if (!response.body) throw new Error('No response body')

          const reader = response.body.getReader()
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value)
            const lines = text.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const event = JSON.parse(line.slice(6))

                if (event.type === 'token') {
                  // Update content immediately - char by char
                  setPossibilities((prev) =>
                    prev.map((p) =>
                      p.id === possibilityId
                        ? { ...p, content: p.content + event.data.token }
                        : p
                    )
                  )
                } else if (event.type === 'probability') {
                  // Update probability when received
                  setPossibilities((prev) =>
                    prev.map((p) =>
                      p.id === possibilityId
                        ? { ...p, probability: event.data.probability }
                        : p
                    )
                  )
                } else if (event.type === 'error') {
                  // Mark as failed with short message
                  setPossibilities((prev) =>
                    prev.map((p) =>
                      p.id === possibilityId
                        ? {
                            ...p,
                            isComplete: true,
                            error: event.data.message || 'Error',
                          }
                        : p
                    )
                  )
                }
              }
            }
          }

          // Mark complete and keep in loading set (don't show as available)
          setPossibilities((prev) =>
            prev.map((p) =>
              p.id === possibilityId ? { ...p, isComplete: true } : p
            )
          )
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            // Remove from loading set so it can be retried
            loadingRef.current.delete(possibilityId)
          } else {
            console.error(`Error loading possibility ${possibilityId}:`, error)
            setPossibilities((prev) =>
              prev.map((p) =>
                p.id === possibilityId
                  ? {
                      ...p,
                      isComplete: true,
                      error:
                        error instanceof Error
                          ? error.message
                          : 'Unknown error',
                    }
                  : p
              )
            )
          }
        } finally {
          activeConnections--
          abortControllersRef.current.delete(possibilityId)
          setIsLoading(false)

          // Process next item in queue
          if (connectionQueue.length > 0) {
            const nextRequest = connectionQueue.shift()
            nextRequest!()
          }
        }
      }

      // Execute immediately if under connection limit, otherwise queue
      if (activeConnections < MAX_CONCURRENT_CONNECTIONS) {
        executeRequest()
      } else {
        connectionQueue.push(executeRequest)
      }
    },
    [messages, metadata, settings]
  )

  // Extract completed possibilities for publishing
  const getCompletedPossibilities = useCallback(() => {
    return possibilities
      .filter((p) => p.isComplete && !p.error && p.content.trim())
      .map((p) => ({
        id: p.id,
        provider: p.metadata.provider,
        model: p.metadata.model,
        content: p.content,
        temperature: p.metadata.temperature,
        systemInstruction: p.metadata.systemInstruction?.name,
        probability: p.probability,
        timestamp: new Date(),
        metadata: {
          permutationId: p.id,
          hasLogprobs: false,
        },
      }))
  }, [possibilities])

  // Clear all possibilities (called when user selects one)
  const clearPossibilities = useCallback(() => {
    setPossibilities([])
    loadingRef.current.clear()
    // Cancel any active requests
    abortControllersRef.current.forEach((controller) => {
      controller.abort()
    })
    abortControllersRef.current.clear()
  }, [])

  return {
    possibilities,
    availableMetadata: metadata.filter(
      (m: PossibilityMetadata) =>
        !possibilities.find((p) => p.id === m.id) &&
        !loadingRef.current.has(m.id)
    ),
    loadPossibility,
    isLoading,
    getCompletedPossibilities,
    clearPossibilities,
  }
}
