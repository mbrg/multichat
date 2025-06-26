import { useCallback, useState } from 'react'
import type { Message } from '@/types/chat'
import type { ChatMessage } from '@/types/api'
import type {
  ChatCompletionRequest,
  PossibilityResponse,
  StreamEvent,
  PossibilityStartEvent,
  TokenEvent,
  ProbabilityEvent,
  PossibilityCompleteEvent,
  ErrorEvent,
} from '@/types/api'
import type { UserSettings } from '@/types/settings'

interface UseAIChatOptions {
  onPossibilityUpdate?: (possibility: PossibilityResponse) => void
  onError?: (error: Error) => void
}

interface PossibilityState {
  [id: string]: {
    id: string
    provider: string
    model: string
    content: string
    temperature: number
    systemInstruction?: string
    probability: number | null
    logprobs?: any
    isComplete: boolean
    timestamp: Date
  }
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [possibilities, setPossibilities] = useState<PossibilityState>({})
  const [error, setError] = useState<Error | null>(null)

  // Extract callbacks to avoid stale closure issues - use useCallback to prevent infinite loops
  const onPossibilityUpdate = useCallback(
    (possibility: PossibilityResponse) => {
      if (options.onPossibilityUpdate) {
        options.onPossibilityUpdate(possibility)
      }
    },
    [options]
  )
  const onError = useCallback(
    (error: Error) => {
      if (options.onError) {
        options.onError(error)
      }
    },
    [options]
  )

  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case 'possibility_start': {
          const data = event.data as PossibilityStartEvent['data']
          setPossibilities((prev) => ({
            ...prev,
            [data.id]: {
              id: data.id,
              provider: data.provider,
              model: data.model,
              content: '',
              temperature: data.temperature,
              systemInstruction: data.systemInstruction,
              probability: null,
              isComplete: false,
              timestamp: new Date(),
            },
          }))
          break
        }

        case 'token': {
          const data = event.data as TokenEvent['data']
          setPossibilities((prev) => {
            const possibility = prev[data.id]
            if (!possibility) return prev

            return {
              ...prev,
              [data.id]: {
                ...possibility,
                content: possibility.content + data.token,
              },
            }
          })
          break
        }

        case 'probability': {
          const data = event.data as ProbabilityEvent['data']
          setPossibilities((prev) => {
            const possibility = prev[data.id]
            if (!possibility) return prev

            return {
              ...prev,
              [data.id]: {
                ...possibility,
                probability: data.probability,
                logprobs: data.logprobs,
              },
            }
          })
          break
        }

        case 'possibility_complete': {
          const data = event.data as PossibilityCompleteEvent['data']
          setPossibilities((prev) => {
            const possibility = prev[data.id]
            if (!possibility) return prev

            const completedPossibility = {
              ...possibility,
              isComplete: true,
            }

            // Notify callback
            if (onPossibilityUpdate) {
              const response: PossibilityResponse = {
                id: completedPossibility.id,
                provider: completedPossibility.provider,
                model: completedPossibility.model,
                content: completedPossibility.content,
                temperature: completedPossibility.temperature,
                systemInstruction: completedPossibility.systemInstruction,
                probability: completedPossibility.probability,
                logprobs: completedPossibility.logprobs,
                timestamp: completedPossibility.timestamp,
                metadata: {
                  permutationId: completedPossibility.id,
                  hasLogprobs: !!completedPossibility.logprobs,
                },
              }
              onPossibilityUpdate(response)
            }

            return {
              ...prev,
              [data.id]: completedPossibility,
            }
          })
          break
        }

        case 'error': {
          const data = event.data as ErrorEvent['data']
          console.error('Stream error:', data.message)
          if (data.id) {
            setPossibilities((prev) => {
              const { [data.id!]: _, ...rest } = prev
              return rest
            })
          }
          break
        }

        case 'done': {
          // All possibilities have been generated
          break
        }
      }
    },
    [onPossibilityUpdate]
  )

  const generatePossibilities = useCallback(
    async (messages: ChatMessage[], settings: UserSettings) => {
      setIsGenerating(true)
      setError(null)
      setPossibilities({})

      try {
        // Parse enabled providers and convert to array of strings
        const enabledProvidersObj = settings.enabledProviders
          ? JSON.parse(settings.enabledProviders)
          : {}
        const enabledProviders = Object.keys(enabledProvidersObj).filter(
          (key) => enabledProvidersObj[key] === true
        )

        // Prepare request
        const request: ChatCompletionRequest = {
          messages,
          settings: {
            systemPrompt: settings.systemPrompt,
            enabledProviders,
            systemInstructions: settings.systemInstructions || [],
            temperatures: settings.temperatures?.map((t) => t.value) || [
              0.3, 0.7, 1.0,
            ],
          },
          options: {
            maxTokens: 100,
            stream: true,
            mode: 'possibilities',
          },
        }

        // Make the request
        const response = await fetch('/api/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Set up SSE streaming
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            if (!line.startsWith('data: ')) continue

            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const event: StreamEvent = JSON.parse(data)
              handleStreamEvent(event)
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        onError?.(error)
      } finally {
        setIsGenerating(false)
      }
    },
    [handleStreamEvent, onError]
  )

  const continuePossibility = useCallback(
    async (
      messages: ChatMessage[],
      possibilityId: string,
      settings: UserSettings
    ) => {
      setIsGenerating(true)
      setError(null)

      try {
        const enabledProviders = settings.enabledProviders
          ? JSON.parse(settings.enabledProviders)
          : []

        const request: ChatCompletionRequest = {
          messages,
          settings: {
            systemPrompt: settings.systemPrompt,
            enabledProviders,
            systemInstructions: settings.systemInstructions || [],
            temperatures: settings.temperatures?.map((t) => t.value) || [
              0.3, 0.7, 1.0,
            ],
          },
          options: {
            maxTokens: 1000,
            stream: true,
            mode: 'continuation',
            continuationId: possibilityId,
          },
        }

        const response = await fetch('/api/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Set up SSE streaming for continuation
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            if (!line.startsWith('data: ')) continue

            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const event: StreamEvent = JSON.parse(data)
              // Handle continuation events - they should update the specific possibility
              if (event.type === 'token' && event.data.id === possibilityId) {
                // Update the continued possibility content
                // This would be handled by a separate callback or state management
                console.log('Continuation token:', event.data.token)
              }
            } catch (e) {
              console.error('Failed to parse continuation SSE event:', e)
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        onError?.(error)
      } finally {
        setIsGenerating(false)
      }
    },
    [onError]
  )

  const reset = useCallback(() => {
    setPossibilities({})
    setError(null)
    setIsGenerating(false)
  }, [])

  // Convert possibilities to Message format for UI compatibility
  const getPossibilitiesAsMessages = useCallback((): Message[] => {
    return Object.values(possibilities)
      .filter((p) => p.isComplete)
      .map((p) => ({
        id: p.id,
        role: 'assistant' as const,
        content: p.content,
        model: p.model,
        probability: p.probability,
        temperature: p.temperature,
        systemInstruction: p.systemInstruction,
        timestamp: p.timestamp,
        isPossibility: true,
      }))
  }, [possibilities])

  return {
    generatePossibilities,
    continuePossibility,
    possibilities: getPossibilitiesAsMessages(),
    isGenerating,
    error,
    reset,
  }
}
