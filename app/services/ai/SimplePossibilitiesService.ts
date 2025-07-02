/**
 * Simple Possibilities Service
 *
 * Handles concurrent possibility generation with priority queuing.
 * Follows Dave Farley's principles:
 * - Single Responsibility: Only handles simple possibility generation
 * - Dependency Injection: Configurable dependencies for testing
 * - Observable Pattern: Provides callbacks for state updates
 */

import { ChatMessage } from '../../types/api'
import { UserSettings } from '../../types/settings'
import {
  PossibilityMetadataService,
  PossibilityMetadata,
} from './PossibilityMetadataService'
import { getDefaultTokenLimit } from './config'
import { ConnectionPoolService } from '../ConnectionPoolService'
import { LoggingService } from '../LoggingService'
import { NetworkError, TimeoutError } from '../../types/errors'

export interface SimplePossibilityState {
  id: string
  content: string
  isComplete: boolean
  metadata: PossibilityMetadata
  probability: number | null
}

export interface SimplePossibilitiesEvents {
  onPossibilityUpdate: (possibility: SimplePossibilityState) => void
  onError: (error: Error) => void
}

export interface SimplePossibilitiesServiceDependencies {
  connectionPool?: ConnectionPoolService
  metadataService?: PossibilityMetadataService
  logger?: LoggingService
  fetchFn?: typeof fetch
}

export class SimplePossibilitiesService {
  private readonly connectionPool: ConnectionPoolService
  private readonly metadataService: PossibilityMetadataService
  private readonly logger: LoggingService
  private readonly fetchFn: typeof fetch

  private possibilities: Map<string, SimplePossibilityState> = new Map()
  private activeRequests: Map<string, AbortController> = new Map()

  constructor(dependencies: SimplePossibilitiesServiceDependencies = {}) {
    this.connectionPool =
      dependencies.connectionPool ?? new ConnectionPoolService()
    this.metadataService =
      dependencies.metadataService ?? new PossibilityMetadataService()
    this.logger = dependencies.logger ?? LoggingService.getInstance()
    this.fetchFn = dependencies.fetchFn ?? fetch
  }

  /**
   * Generate prioritized possibilities based on metadata
   */
  async generatePossibilities(
    messages: ChatMessage[],
    settings: UserSettings,
    events: SimplePossibilitiesEvents
  ): Promise<void> {
    const startTime = Date.now()

    try {
      // Clear previous state
      this.clearPossibilities()

      // Generate metadata for all possibilities
      const metadata =
        this.metadataService.generatePrioritizedMetadata(settings)

      this.logger.logBusinessMetric('simple_possibilities_started', 1, {
        messageCount: messages.length,
        possibilityCount: metadata.length,
      })

      // Initialize all possibilities in pending state
      metadata.forEach((meta) => {
        this.possibilities.set(meta.id, {
          id: meta.id,
          content: '',
          isComplete: false,
          metadata: meta,
          probability: null,
        })
      })

      // Queue all possibilities with priority-based ordering
      const queuePromises = metadata.map((meta) =>
        this.enqueuePossibility(meta, messages, settings, events)
      )

      // Wait for all possibilities to complete
      await Promise.allSettled(queuePromises)

      this.logger.logPerformance({
        operation: 'simple_possibilities_generation',
        duration: Date.now() - startTime,
        success: true,
      })
    } catch (error) {
      this.logger.logBusinessMetric('simple_possibilities_failed', 1)
      events.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Get current possibilities
   */
  getPossibilities(): SimplePossibilityState[] {
    return Array.from(this.possibilities.values())
  }

  /**
   * Clear all possibilities and cancel active requests
   */
  clearPossibilities(): void {
    // Cancel all active requests
    this.activeRequests.forEach((controller) => {
      controller.abort()
    })
    this.activeRequests.clear()
    this.possibilities.clear()
  }

  /**
   * Get completion statistics
   */
  getStats(): { total: number; completed: number; pending: number } {
    const total = this.possibilities.size
    const completed = this.getCompletedCount()
    return {
      total,
      completed,
      pending: total - completed,
    }
  }

  private async enqueuePossibility(
    metadata: PossibilityMetadata,
    messages: ChatMessage[],
    settings: UserSettings,
    events: SimplePossibilitiesEvents
  ): Promise<void> {
    return this.connectionPool.enqueue({
      id: metadata.id,
      priority: metadata.priority,
      execute: () =>
        this.generateSinglePossibility(metadata, messages, settings, events),
    })
  }

  private async generateSinglePossibility(
    metadata: PossibilityMetadata,
    messages: ChatMessage[],
    settings: UserSettings,
    events: SimplePossibilitiesEvents
  ): Promise<void> {
    const abortController = new AbortController()
    this.activeRequests.set(metadata.id, abortController)

    try {
      const maxTokens = getDefaultTokenLimit(metadata.model, {
        possibilityTokens: settings.possibilityTokens,
        reasoningTokens: settings.reasoningTokens,
      })

      const response = await this.fetchFn(`/api/possibility/${metadata.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          permutation: this.metadataService.metadataToPermutation(metadata),
          options: { maxTokens },
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new NetworkError(`Failed to generate possibility ${metadata.id}`)
      }

      await this.processStreamingPossibility(
        metadata.id,
        response,
        events,
        abortController.signal
      )
    } catch (error) {
      if (abortController.signal.aborted) {
        // Request was cancelled, this is expected
        return
      }

      this.logger.logBusinessMetric('possibility_generation_failed', 1)

      events.onError(
        error instanceof Error
          ? error
          : new Error(`Failed to generate possibility ${metadata.id}`)
      )
    } finally {
      this.activeRequests.delete(metadata.id)
    }
  }

  private async processStreamingPossibility(
    id: string,
    response: Response,
    events: SimplePossibilitiesEvents,
    signal: AbortSignal
  ): Promise<void> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new NetworkError('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        if (signal.aborted) {
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
            this.markPossibilityComplete(id, events)
            return
          }

          try {
            const event = JSON.parse(data)
            this.handlePossibilityEvent(id, event, events)
          } catch (error) {
            this.logger.logBusinessMetric('possibility_parse_error', 1)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private handlePossibilityEvent(
    id: string,
    event: any,
    events: SimplePossibilitiesEvents
  ): void {
    const possibility = this.possibilities.get(id)
    if (!possibility) return

    switch (event.type) {
      case 'token':
        possibility.content += event.data.token
        events.onPossibilityUpdate({ ...possibility })
        break

      case 'probability':
        possibility.probability = event.data.probability
        events.onPossibilityUpdate({ ...possibility })
        break

      case 'complete':
        this.markPossibilityComplete(id, events)
        break

      case 'error':
        events.onError(new Error(event.data.message || 'Unknown error'))
        break
    }
  }

  private markPossibilityComplete(
    id: string,
    events: SimplePossibilitiesEvents
  ): void {
    const possibility = this.possibilities.get(id)
    if (possibility) {
      possibility.isComplete = true
      events.onPossibilityUpdate({ ...possibility })
    }
  }

  private getCompletedCount(): number {
    return Array.from(this.possibilities.values()).filter((p) => p.isComplete)
      .length
  }
}

export default SimplePossibilitiesService
