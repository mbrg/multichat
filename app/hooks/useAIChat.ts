import { useCallback, useState, useMemo } from 'react'
import type { Message } from '@/types/chat'
import type { ChatMessage } from '@/types/api'
import type { PossibilityResponse } from '@/types/api'
import type { UserSettings } from '@/types/settings'
import {
  ChatService,
  type ChatServiceEvents,
  type PossibilityState,
} from '../services/ai/ChatService'

interface UseAIChatOptions {
  onPossibilityUpdate?: (possibility: PossibilityResponse) => void
  onError?: (error: Error) => void
  chatService?: ChatService
}

export function useAIChat(options: UseAIChatOptions = {}) {
  // Service instance (with dependency injection support)
  const chatService = useMemo(
    () => options.chatService ?? new ChatService(),
    [options.chatService]
  )

  // Simple state management
  const [isGenerating, setIsGenerating] = useState(false)
  const [possibilities, setPossibilities] = useState<
    Record<string, PossibilityState>
  >({})
  const [error, setError] = useState<Error | null>(null)

  // Service event handlers (thin adapters to maintain existing interface)
  const serviceEvents = useMemo(
    (): ChatServiceEvents => ({
      onPossibilityStart: (possibility) => {
        setPossibilities((prev) => ({
          ...prev,
          [possibility.id]: possibility,
        }))
      },
      onTokenReceived: (id, token) => {
        setPossibilities((prev) => {
          const possibility = prev[id]
          if (!possibility) return prev
          return {
            ...prev,
            [id]: {
              ...possibility,
              content: possibility.content + token,
            },
          }
        })
      },
      onProbabilityReceived: (id, probability, logprobs) => {
        setPossibilities((prev) => {
          const possibility = prev[id]
          if (!possibility) return prev
          return {
            ...prev,
            [id]: {
              ...possibility,
              probability,
              logprobs,
            },
          }
        })
      },
      onPossibilityComplete: (possibility) => {
        setPossibilities((prev) => ({
          ...prev,
          [possibility.id]: {
            ...prev[possibility.id],
            isComplete: true,
          },
        }))
        // Forward to external callback
        options.onPossibilityUpdate?.(possibility)
      },
      onError: (err) => {
        setError(err)
        options.onError?.(err)
      },
      onStreamComplete: () => {
        // Stream completed successfully
      },
    }),
    [options]
  )

  // Simplified business logic - delegate to service
  const generatePossibilities = useCallback(
    async (messages: ChatMessage[], settings: UserSettings) => {
      setIsGenerating(true)
      setError(null)
      setPossibilities({})

      try {
        await chatService.generatePossibilities(
          messages,
          settings,
          serviceEvents
        )
      } catch (err) {
        // Error already handled by service events, but ensure state is reset
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsGenerating(false)
      }
    },
    [chatService, serviceEvents]
  )

  const reset = useCallback(() => {
    chatService.clearPossibilities()
    setPossibilities({})
    setError(null)
    setIsGenerating(false)
  }, [chatService])

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
    possibilities: getPossibilitiesAsMessages(),
    isGenerating,
    error,
    reset,
  }
}
