import { useState, useCallback, useRef, useEffect } from 'react'
import {
  PossibilityMetadataService,
  type PossibilityMetadata,
} from '@/services/ai/PossibilityMetadataService'
import type { UserSettings } from '@/types/settings'
import type { ChatMessage, PossibilityResponse } from '@/types/api'

export type PossibilityStatus =
  | 'pending'
  | 'loading'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled'

export interface PossibilityPoolItem {
  metadata: PossibilityMetadata
  status: PossibilityStatus
  result: PossibilityResponse | null
  error: string | null
  controller: AbortController | null
  loadingStartTime: number | null
  estimatedLoadTime: number
}

export interface PossibilityPoolState {
  items: Map<string, PossibilityPoolItem>
  loadingQueue: string[]
  loadingCount: number
  totalCount: number
}

export interface UsePossibilityPoolOptions {
  maxConcurrentConnections?: number
  connectionTimeout?: number
  retryAttempts?: number
}

export interface UsePossibilityPoolReturn {
  // State
  poolState: PossibilityPoolState

  // Actions
  initializePool: (
    messages: ChatMessage[],
    settings: UserSettings,
    options?: { maxTokens?: number }
  ) => void
  queuePossibility: (id: string, priority?: 'high' | 'medium' | 'low') => void
  cancelPossibility: (id: string) => void
  retryPossibility: (id: string) => void
  clearPool: () => void

  // Getters
  getPossibilityStatus: (id: string) => PossibilityStatus
  getPossibilityResult: (id: string) => PossibilityResponse | null
  getPossibilityError: (id: string) => string | null
  getCompletedPossibilities: () => PossibilityResponse[]

  // Statistics
  getLoadingStats: () => {
    completed: number
    loading: number
    pending: number
    error: number
    total: number
  }
}

export function usePossibilityPool(
  options: UsePossibilityPoolOptions = {}
): UsePossibilityPoolReturn {
  const {
    maxConcurrentConnections = 6,
    connectionTimeout = 30000,
    retryAttempts = 2,
  } = options

  const [poolState, setPoolState] = useState<PossibilityPoolState>({
    items: new Map(),
    loadingQueue: [],
    loadingCount: 0,
    totalCount: 0,
  })

  const metadataService = useRef(new PossibilityMetadataService())
  const processingQueue = useRef(false)
  const messagesRef = useRef<ChatMessage[]>([])

  // Create a process queue function that doesn't depend on loadPossibility
  const processQueueRef = useRef<(() => Promise<void>) | undefined>(undefined)

  // Load individual possibility
  const loadPossibility = useCallback(
    async (id: string, item: PossibilityPoolItem) => {
      try {
        // Update status to streaming
        setPoolState((prevState) => {
          const newState = { ...prevState }
          const updatedItem = {
            ...item,
            status: 'streaming' as PossibilityStatus,
          }
          newState.items.set(id, updatedItem)
          return newState
        })

        // Create SSE connection to individual possibility endpoint
        const response = await fetch(`/api/possibility/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesRef.current,
            permutation: metadataService.current.metadataToPermutation(
              item.metadata
            ),
            options: {
              maxTokens: item.metadata.estimatedTokens,
              stream: true,
            },
          }),
          signal: item.controller?.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        let possibility: Partial<PossibilityResponse> = {
          id,
          provider: item.metadata.provider,
          model: item.metadata.model,
          content: '',
          temperature: item.metadata.temperature,
          systemInstruction: item.metadata.systemInstruction?.name,
          probability: null,
          logprobs: undefined,
          timestamp: new Date(),
          metadata: {
            permutationId: id,
            hasLogprobs: false,
          },
        }

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6))

                  switch (eventData.type) {
                    case 'token':
                      possibility.content += eventData.data.token
                      // Update the streaming content in real-time
                      setPoolState((prevState) => {
                        const newState = { ...prevState }
                        const currentItem = newState.items.get(id)
                        if (currentItem) {
                          const updatedItem = {
                            ...currentItem,
                            result: { ...possibility } as PossibilityResponse,
                          }
                          newState.items.set(id, updatedItem)
                        }
                        return newState
                      })
                      break

                    case 'probability':
                      possibility.probability = eventData.data.probability
                      possibility.logprobs = eventData.data.logprobs
                      possibility.metadata!.hasLogprobs =
                        !!eventData.data.logprobs
                      break

                    case 'possibility_complete':
                      // Mark as completed
                      setPoolState((prevState) => {
                        const newState = { ...prevState }
                        const updatedItem: PossibilityPoolItem = {
                          ...item,
                          status: 'complete',
                          result: possibility as PossibilityResponse,
                          controller: null,
                          loadingStartTime: null,
                        }
                        newState.items.set(id, updatedItem)
                        newState.loadingCount--
                        return newState
                      })

                      // Process queue for next possibility
                      processQueueRef.current?.()
                      return

                    case 'error':
                      throw new Error(eventData.data.message || 'Unknown error')

                    case 'done':
                      return
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE event:', line, parseError)
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      } catch (error) {
        // Handle errors
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'

        setPoolState((prevState) => {
          const newState = { ...prevState }
          const updatedItem: PossibilityPoolItem = {
            ...item,
            status: 'error',
            error: errorMessage,
            controller: null,
            loadingStartTime: null,
          }
          newState.items.set(id, updatedItem)
          newState.loadingCount--
          return newState
        })

        // Process queue for next possibility
        processQueueRef.current?.()
      }
    },
    [metadataService]
  )

  // Process the loading queue - defined after loadPossibility to avoid circular dependency
  const processQueue = useCallback(async () => {
    if (processingQueue.current) return
    processingQueue.current = true

    try {
      setPoolState((prevState) => {
        const newState = { ...prevState }
        const queue = [...newState.loadingQueue]

        // Start loading possibilities up to the concurrency limit
        while (
          queue.length > 0 &&
          newState.loadingCount < maxConcurrentConnections
        ) {
          const possibilityId = queue.shift()!
          const item = newState.items.get(possibilityId)

          if (item && item.status === 'pending') {
            // Update to loading status
            const updatedItem: PossibilityPoolItem = {
              ...item,
              status: 'loading',
              loadingStartTime: Date.now(),
              controller: new AbortController(),
            }
            newState.items.set(possibilityId, updatedItem)
            newState.loadingCount++

            // Start the actual loading asynchronously
            loadPossibility(possibilityId, updatedItem)
          }
        }

        return {
          ...newState,
          loadingQueue: queue,
        }
      })
    } finally {
      processingQueue.current = false
    }
  }, [maxConcurrentConnections, loadPossibility])

  // Set the ref to the processQueue function
  processQueueRef.current = processQueue

  // Initialize pool with metadata
  const initializePool = useCallback(
    (
      messages: ChatMessage[],
      settings: UserSettings,
      options: { maxTokens?: number } = {}
    ) => {
      messagesRef.current = messages
      const metadata = metadataService.current.generatePrioritizedMetadata(
        settings,
        options
      )

      const newItems = new Map<string, PossibilityPoolItem>()

      metadata.forEach((meta) => {
        newItems.set(meta.id, {
          metadata: meta,
          status: 'pending',
          result: null,
          error: null,
          controller: null,
          loadingStartTime: null,
          estimatedLoadTime: metadataService.current.estimateLoadingTime(meta),
        })
      })

      setPoolState({
        items: newItems,
        loadingQueue: [],
        loadingCount: 0,
        totalCount: metadata.length,
      })
    },
    []
  )

  // Queue possibility for loading
  const queuePossibility = useCallback(
    (id: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
      setPoolState((prevState) => {
        const item = prevState.items.get(id)
        if (!item || item.status !== 'pending') return prevState

        const newQueue = [...prevState.loadingQueue]

        // Insert based on priority
        if (priority === 'high') {
          newQueue.unshift(id)
        } else if (priority === 'medium') {
          // Insert in middle
          const midPoint = Math.floor(newQueue.length / 2)
          newQueue.splice(midPoint, 0, id)
        } else {
          newQueue.push(id)
        }

        return {
          ...prevState,
          loadingQueue: newQueue,
        }
      })

      // Process queue
      processQueue()
    },
    [processQueue]
  )

  // Cancel possibility
  const cancelPossibility = useCallback(
    (id: string) => {
      setPoolState((prevState) => {
        const item = prevState.items.get(id)
        if (!item) return prevState

        // Cancel if loading
        if (item.controller) {
          item.controller.abort()
        }

        const newState = { ...prevState }
        const updatedItem: PossibilityPoolItem = {
          ...item,
          status: 'cancelled',
          controller: null,
          loadingStartTime: null,
        }
        newState.items.set(id, updatedItem)

        // Remove from queue
        newState.loadingQueue = newState.loadingQueue.filter(
          (queueId) => queueId !== id
        )

        // Decrease loading count if was loading
        if (item.status === 'loading' || item.status === 'streaming') {
          newState.loadingCount--
        }

        return newState
      })

      // Process queue to start next possibility
      processQueue()
    },
    [processQueue]
  )

  // Retry possibility
  const retryPossibility = useCallback((id: string) => {
    setPoolState((prevState) => {
      const item = prevState.items.get(id)
      if (!item || (item.status !== 'error' && item.status !== 'cancelled'))
        return prevState

      const newState = { ...prevState }
      const updatedItem: PossibilityPoolItem = {
        ...item,
        status: 'pending',
        error: null,
        controller: null,
        loadingStartTime: null,
      }
      newState.items.set(id, updatedItem)

      return newState
    })
  }, [])

  // Clear pool
  const clearPool = useCallback(() => {
    // Cancel all ongoing requests
    poolState.items.forEach((item) => {
      if (item.controller) {
        item.controller.abort()
      }
    })

    setPoolState({
      items: new Map(),
      loadingQueue: [],
      loadingCount: 0,
      totalCount: 0,
    })
  }, [poolState.items])

  // Getters
  const getPossibilityStatus = useCallback(
    (id: string): PossibilityStatus => {
      return poolState.items.get(id)?.status || 'pending'
    },
    [poolState.items]
  )

  const getPossibilityResult = useCallback(
    (id: string): PossibilityResponse | null => {
      return poolState.items.get(id)?.result || null
    },
    [poolState.items]
  )

  const getPossibilityError = useCallback(
    (id: string): string | null => {
      return poolState.items.get(id)?.error || null
    },
    [poolState.items]
  )

  const getCompletedPossibilities = useCallback((): PossibilityResponse[] => {
    const completed: PossibilityResponse[] = []
    poolState.items.forEach((item) => {
      if (item.status === 'complete' && item.result) {
        completed.push(item.result)
      }
    })
    return completed.sort((a, b) => (b.probability || 0) - (a.probability || 0))
  }, [poolState.items])

  const getLoadingStats = useCallback(() => {
    let completed = 0,
      loading = 0,
      pending = 0,
      error = 0

    poolState.items.forEach((item) => {
      switch (item.status) {
        case 'complete':
          completed++
          break
        case 'loading':
        case 'streaming':
          loading++
          break
        case 'pending':
          pending++
          break
        case 'error':
        case 'cancelled':
          error++
          break
      }
    })

    return {
      completed,
      loading,
      pending,
      error,
      total: poolState.totalCount,
    }
  }, [poolState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPool()
    }
  }, [clearPool])

  return {
    poolState,
    initializePool,
    queuePossibility,
    cancelPossibility,
    retryPossibility,
    clearPool,
    getPossibilityStatus,
    getPossibilityResult,
    getPossibilityError,
    getCompletedPossibilities,
    getLoadingStats,
  }
}
