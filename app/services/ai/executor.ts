import type { Permutation, StreamEvent } from '@/types/api'
import type { ChatMessage } from '@/types/api'
import { AIService } from './index'
import { getAllModels } from './config'

interface ExecutionOptions {
  maxTokens: number
  onProgress?: (event: StreamEvent) => void
}

export class PossibilityExecutor {
  private aiService: AIService
  private maxConcurrency: number = 10

  constructor() {
    this.aiService = new AIService()
  }

  /**
   * Execute all permutations in parallel with concurrency control
   * Streams events in real-time as they occur from parallel executions
   */
  async *executePossibilities(
    messages: ChatMessage[],
    permutations: Permutation[],
    options: ExecutionOptions
  ): AsyncGenerator<StreamEvent> {
    const eventQueue: StreamEvent[] = []
    const executing = new Set<Promise<void>>()
    let eventsProcessed = 0
    let completedExecutions = 0

    // Create a promise that resolves when new events are available
    let eventResolver: (() => void) | null = null
    const eventPromise = () =>
      new Promise<void>((resolve) => {
        eventResolver = resolve
      })

    // Helper to signal new events
    const signalNewEvent = () => {
      if (eventResolver) {
        eventResolver()
        eventResolver = null
      }
    }

    // Start all executions with concurrency control
    for (let i = 0; i < permutations.length; i++) {
      const permutation = permutations[i]

      // Wait if we've hit the concurrency limit
      while (executing.size >= this.maxConcurrency) {
        await Promise.race(executing)
      }

      const execution = (async () => {
        // Add staggered delay for better visual streaming effect
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, i * 100))
        }

        const generator = await this.executePermutation(
          permutation,
          messages,
          options
        )

        try {
          for await (const event of generator) {
            eventQueue.push(event)
            signalNewEvent()
          }
        } catch (error) {
          // Push error event to queue
          eventQueue.push({
            type: 'error',
            data: {
              id: permutation.id,
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          signalNewEvent()
        } finally {
          completedExecutions++
          signalNewEvent()
        }
      })()

      execution.finally(() => {
        executing.delete(execution)
      })

      executing.add(execution)
    }

    // Stream events as they become available
    while (
      completedExecutions < permutations.length ||
      eventsProcessed < eventQueue.length
    ) {
      // Yield any new events that have arrived
      while (eventsProcessed < eventQueue.length) {
        yield eventQueue[eventsProcessed]
        eventsProcessed++
      }

      // Wait for more events if executions are still running
      if (completedExecutions < permutations.length) {
        await eventPromise()
      }
    }

    // Ensure all executions are complete
    await Promise.all(executing)
  }

  /**
   * Execute a single permutation
   */
  private async executePermutation(
    permutation: Permutation,
    messages: ChatMessage[],
    options: ExecutionOptions
  ): Promise<AsyncGenerator<StreamEvent>> {
    const generator = async function* (): AsyncGenerator<StreamEvent> {
      try {
        // Find the model configuration
        const modelConfig = getAllModels().find(
          (m) => m.id === permutation.model
        )
        if (!modelConfig) {
          yield {
            type: 'error',
            data: {
              id: permutation.id,
              message: `Model ${permutation.model} not found`,
            },
          }
          return
        }

        // Emit start event
        yield {
          type: 'possibility_start',
          data: {
            id: permutation.id,
            provider: permutation.provider,
            model: permutation.model,
            temperature: permutation.temperature,
            systemInstruction: permutation.systemInstruction?.name,
          },
        }

        // Prepare messages with system instruction
        const messagesWithSystem = prepareMessages(
          messages,
          permutation.systemPrompt,
          permutation.systemInstruction
        )

        // Generate response with streaming
        const aiService = new AIService()
        let fullContent = ''
        let probability: number | null = null
        let logprobs: any = null

        // Use the AI service to generate a response
        const response = await aiService.generateSingleResponse(
          messagesWithSystem,
          permutation.model,
          {
            temperature: permutation.temperature,
            maxTokens: options.maxTokens,
            stream: true,
            onToken: (token: string) => {
              fullContent += token
              // Note: In the real implementation, we'd yield token events here
              // but the current AIService doesn't support streaming callbacks
            },
          }
        )

        // Since the current AIService doesn't support streaming,
        // we'll emit the full content as tokens
        const words = response.content.split(' ')
        for (const word of words) {
          yield {
            type: 'token',
            data: {
              id: permutation.id,
              token: word + ' ',
            },
          }

          // Small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 20))
        }

        // Calculate probability if available
        if (response.logprobs && modelConfig.supportsLogprobs) {
          probability = calculateProbability(response.logprobs)
          logprobs = response.logprobs
        }

        // Emit probability event
        yield {
          type: 'probability',
          data: {
            id: permutation.id,
            probability,
            logprobs,
          },
        }

        // Emit completion event
        yield {
          type: 'possibility_complete',
          data: {
            id: permutation.id,
          },
        }
      } catch (error) {
        // Emit error event
        yield {
          type: 'error',
          data: {
            id: permutation.id,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      }
    }

    return generator()
  }
}

/**
 * Prepare messages with system prompts and instructions
 */
function prepareMessages(
  messages: ChatMessage[],
  systemPrompt?: string,
  systemInstruction?: Permutation['systemInstruction']
): ChatMessage[] {
  const preparedMessages: ChatMessage[] = []

  // Add system prompt if provided
  if (systemPrompt || systemInstruction) {
    const systemContent = [
      systemPrompt,
      systemInstruction ? `\n\n${systemInstruction.content}` : '',
    ]
      .filter(Boolean)
      .join('')

    preparedMessages.push({
      id: 'system',
      role: 'system',
      content: systemContent,
      timestamp: new Date(),
    })
  }

  // Add user messages
  preparedMessages.push(...messages)

  return preparedMessages
}

/**
 * Calculate probability from logprobs
 */
function calculateProbability(logprobs: any): number {
  if (!logprobs?.tokens || logprobs.tokens.length === 0) {
    return 0
  }

  // Average the log probabilities
  const avgLogprob =
    logprobs.tokens.reduce(
      (sum: number, token: any) => sum + (token.logprob || 0),
      0
    ) / logprobs.tokens.length

  // Convert to probability (0-1 range)
  return Math.exp(avgLogprob)
}
