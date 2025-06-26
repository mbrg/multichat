/**
 * Chat Service
 *
 * Core business logic for AI chat operations, following Dave Farley's principles:
 * - Single Responsibility: Handles only chat completion and streaming
 * - Dependency Injection: Accepts external dependencies for testability
 * - Observable Pattern: Emits events for UI to react to
 */

import type { ChatMessage } from '../../types/api'
import type { UserSettings } from '../../types/settings'
import type {
  ChatCompletionRequest,
  PossibilityResponse,
  StreamEvent,
  PossibilityStartEvent,
  TokenEvent,
  ProbabilityEvent,
  PossibilityCompleteEvent,
  ErrorEvent,
} from '../../types/api'
import { LoggingService } from '../LoggingService'
import { ConnectionPoolService } from '../ConnectionPoolService'
import { NetworkError, ValidationError, TimeoutError } from '../../types/errors'

export interface PossibilityState {
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

export interface ChatServiceEvents {
  onPossibilityStart: (possibility: PossibilityState) => void
  onTokenReceived: (id: string, token: string) => void
  onProbabilityReceived: (
    id: string,
    probability: number,
    logprobs?: any
  ) => void
  onPossibilityComplete: (possibility: PossibilityResponse) => void
  onError: (error: Error) => void
  onStreamComplete: () => void
}

export interface ChatServiceDependencies {
  connectionPool?: ConnectionPoolService
  logger?: LoggingService
  fetchFn?: typeof fetch
}

export class ChatService {
  private readonly connectionPool: ConnectionPoolService
  private readonly logger: LoggingService
  private readonly fetchFn: typeof fetch
  private possibilities: Map<string, PossibilityState> = new Map()

  constructor(dependencies: ChatServiceDependencies = {}) {
    this.connectionPool =
      dependencies.connectionPool ?? new ConnectionPoolService()
    this.logger = dependencies.logger ?? LoggingService.getInstance()
    this.fetchFn = dependencies.fetchFn ?? fetch
  }

  /**
   * Generate AI possibilities with streaming support
   */
  async generatePossibilities(
    messages: ChatMessage[],
    settings: UserSettings,
    events: ChatServiceEvents,
    signal?: AbortSignal
  ): Promise<void> {
    const startTime = Date.now()
    this.logger.logBusinessMetric('chat_generation_started', 1, {
      messageCount: messages.length,
      providers: this.extractEnabledProviders(settings).length,
    })

    try {
      // Reset state
      this.possibilities.clear()

      // Validate inputs
      this.validateInputs(messages, settings)

      // Prepare request
      const request = this.buildChatRequest(messages, settings)

      // Execute with connection pooling
      await this.connectionPool.enqueue({
        id: `chat-${Date.now()}`,
        priority: 'high', // Chat generation is high priority
        execute: () => this.executeStreamingRequest(request, events, signal),
      })

      this.logger.logPerformance({
        operation: 'chat_generation',
        duration: Date.now() - startTime,
        success: true,
      })
    } catch (error) {
      this.logger.logBusinessMetric('chat_generation_failed', 1)

      // Convert to appropriate error type
      const chatError = this.convertToServiceError(error)
      events.onError(chatError)
      throw chatError
    }
  }

  /**
   * Get current possibilities state
   */
  getPossibilities(): PossibilityState[] {
    return Array.from(this.possibilities.values())
  }

  /**
   * Clear current possibilities
   */
  clearPossibilities(): void {
    this.possibilities.clear()
  }

  private validateInputs(
    messages: ChatMessage[],
    settings: UserSettings
  ): void {
    if (!messages || messages.length === 0) {
      throw new ValidationError('messages', messages, 'cannot be empty')
    }

    const enabledProviders = this.extractEnabledProviders(settings)
    if (enabledProviders.length === 0) {
      throw new ValidationError(
        'enabledProviders',
        enabledProviders,
        'at least one provider must be enabled'
      )
    }
  }

  private extractEnabledProviders(settings: UserSettings): string[] {
    try {
      const enabledProvidersObj = settings.enabledProviders
        ? JSON.parse(settings.enabledProviders)
        : {}
      return Object.keys(enabledProvidersObj).filter(
        (key) => enabledProvidersObj[key] === true
      )
    } catch (error) {
      throw new ValidationError(
        'enabledProviders',
        settings.enabledProviders,
        'invalid JSON format'
      )
    }
  }

  private buildChatRequest(
    messages: ChatMessage[],
    settings: UserSettings
  ): ChatCompletionRequest {
    const enabledProviders = this.extractEnabledProviders(settings)

    return {
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
  }

  private async executeStreamingRequest(
    request: ChatCompletionRequest,
    events: ChatServiceEvents,
    signal?: AbortSignal
  ): Promise<void> {
    const response = await this.fetchFn('/api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })

    if (!response.ok) {
      throw new NetworkError(`HTTP error! status: ${response.status}`)
    }

    await this.processStreamingResponse(response, events, signal)
  }

  private async processStreamingResponse(
    response: Response,
    events: ChatServiceEvents,
    signal?: AbortSignal
  ): Promise<void> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new NetworkError('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        // Check for cancellation
        if (signal?.aborted) {
          throw new Error('Request aborted')
        }

        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6)
          if (data === '[DONE]') {
            events.onStreamComplete()
            return
          }

          try {
            const event: StreamEvent = JSON.parse(data)
            this.handleStreamEvent(event, events)
          } catch (error) {
            this.logger.logBusinessMetric('stream_parse_error', 1, {
              data,
              error: error instanceof Error ? error.message : 'Unknown',
            })
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private handleStreamEvent(
    event: StreamEvent,
    events: ChatServiceEvents
  ): void {
    switch (event.type) {
      case 'possibility_start': {
        const data = event.data as PossibilityStartEvent['data']
        const possibility: PossibilityState = {
          id: data.id,
          provider: data.provider,
          model: data.model,
          content: '',
          temperature: data.temperature,
          systemInstruction: data.systemInstruction,
          probability: null,
          isComplete: false,
          timestamp: new Date(),
        }

        this.possibilities.set(data.id, possibility)
        events.onPossibilityStart(possibility)
        break
      }

      case 'token': {
        const data = event.data as TokenEvent['data']
        const possibility = this.possibilities.get(data.id)
        if (possibility) {
          possibility.content += data.token
          events.onTokenReceived(data.id, data.token)
        }
        break
      }

      case 'probability': {
        const data = event.data as ProbabilityEvent['data']
        const possibility = this.possibilities.get(data.id)
        if (possibility) {
          possibility.probability = data.probability
          possibility.logprobs = data.logprobs
          events.onProbabilityReceived(
            data.id,
            data.probability ?? 0,
            data.logprobs
          )
        }
        break
      }

      case 'possibility_complete': {
        const data = event.data as PossibilityCompleteEvent['data']
        const possibility = this.possibilities.get(data.id)
        if (possibility) {
          possibility.isComplete = true

          const response: PossibilityResponse = {
            id: possibility.id,
            provider: possibility.provider,
            model: possibility.model,
            content: possibility.content,
            temperature: possibility.temperature,
            systemInstruction: possibility.systemInstruction,
            probability: possibility.probability,
            logprobs: possibility.logprobs,
            timestamp: possibility.timestamp,
            metadata: {
              permutationId: possibility.id,
              hasLogprobs: !!possibility.logprobs,
            },
          }

          events.onPossibilityComplete(response)
        }
        break
      }

      case 'error': {
        const data = event.data as ErrorEvent['data']
        if (data.id) {
          this.possibilities.delete(data.id)
        }
        const error = new NetworkError(data.message)
        events.onError(error)
        break
      }

      case 'done': {
        events.onStreamComplete()
        break
      }
    }
  }

  private convertToServiceError(error: unknown): Error {
    if (error instanceof Error) {
      // Already a proper error, check if it needs wrapping
      if (error.name === 'AbortError') {
        return new TimeoutError(0) // Aborted, so 0ms timeout
      }
      if (error.message.includes('fetch')) {
        return new NetworkError(error.message)
      }
      return error
    }

    // Convert unknown errors
    return new NetworkError('Unknown error occurred during chat generation')
  }
}

export default ChatService
