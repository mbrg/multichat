import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { AIService } from '@/services/ai'
import { getAllModels } from '@/services/ai/config'
import type { ChatMessage, StreamEvent, Permutation } from '@/types/api'

// Request validation schema for individual possibility
const possibilityRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.string().transform((str) => new Date(str)),
    })
  ),
  permutation: z.object({
    id: z.string(),
    provider: z.string(),
    model: z.string(),
    temperature: z.number(),
    systemInstruction: z
      .object({
        id: z.string(),
        name: z.string(),
        content: z.string(),
        enabled: z.boolean(),
      })
      .nullable(),
    systemPrompt: z.string().optional(),
  }),
  options: z
    .object({
      maxTokens: z.number().optional().default(100),
      stream: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validatedData = possibilityRequestSchema.parse(body)
    const params = await context.params
    const possibilityId = params.id

    // Validate that the permutation ID matches the URL parameter
    if (validatedData.permutation.id !== possibilityId) {
      return Response.json(
        { error: 'Permutation ID mismatch' },
        { status: 400 }
      )
    }

    // Check if streaming is requested
    if (!validatedData.options.stream) {
      return handleNonStreamingPossibility(validatedData, possibilityId)
    }

    // Create SSE stream for streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Execute single possibility with streaming
          const eventGenerator = await executeSinglePossibility(
            validatedData.messages,
            validatedData.permutation,
            validatedData.options
          )

          // Stream events to client
          for await (const event of eventGenerator) {
            const data = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(data))
          }

          // Send done event
          const doneEvent: StreamEvent = { type: 'done', data: {} }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`)
          )
        } catch (error) {
          // Send error event
          const errorEvent: StreamEvent = {
            type: 'error',
            data: {
              id: possibilityId,
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Individual possibility error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Execute a single possibility with streaming
 */
async function executeSinglePossibility(
  messages: ChatMessage[],
  permutation: Permutation,
  options: { maxTokens: number }
): Promise<AsyncGenerator<StreamEvent>> {
  const generator = async function* (): AsyncGenerator<StreamEvent> {
    try {
      // Find the model configuration
      const modelConfig = getAllModels().find((m) => m.id === permutation.model)
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

      // Generate response with true streaming
      const aiService = new AIService()
      let fullContent = ''
      let probability: number | null = null
      let logprobs: any = null

      try {
        // Use the new streaming method
        const streamGenerator = aiService.generateStreamingResponse(
          messagesWithSystem,
          permutation.model,
          {
            temperature: permutation.temperature,
            maxTokens: options.maxTokens,
            stream: true,
          }
        )

        // Stream real tokens as they arrive
        for await (const event of streamGenerator) {
          if (event.type === 'token') {
            fullContent += event.token

            yield {
              type: 'token',
              data: {
                id: permutation.id,
                token: event.token,
              },
            }
          } else if (event.type === 'complete' && event.response) {
            // Get final response with probability
            probability = event.response.probability
            logprobs = event.response.logprobs
            fullContent = event.response.content // Ensure we have complete content
          }
        }
      } catch (streamError) {
        console.warn(
          `Streaming failed for ${permutation.id}, falling back to non-streaming:`,
          streamError
        )

        // Fallback to non-streaming approach
        const response = await aiService.generateSingleResponse(
          messagesWithSystem,
          permutation.model,
          {
            temperature: permutation.temperature,
            maxTokens: options.maxTokens,
          }
        )

        // Simulate streaming by splitting response into tokens for backward compatibility
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

        fullContent = response.content
        probability = response.probability
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

/**
 * Handle non-streaming individual possibility
 */
async function handleNonStreamingPossibility(data: any, possibilityId: string) {
  try {
    const eventGenerator = await executeSinglePossibility(
      data.messages,
      data.permutation,
      data.options
    )

    // Collect all events into a single possibility
    let possibility: any = {
      id: possibilityId,
      content: '',
      probability: null,
      logprobs: null,
      timestamp: new Date(),
    }

    for await (const event of eventGenerator) {
      switch (event.type) {
        case 'possibility_start':
          possibility = {
            ...possibility,
            provider: event.data.provider,
            model: event.data.model,
            temperature: event.data.temperature,
            systemInstruction: event.data.systemInstruction,
            metadata: {
              permutationId: event.data.id,
              hasLogprobs: false,
            },
          }
          break

        case 'token':
          possibility.content += event.data.token
          break

        case 'probability':
          possibility.probability = event.data.probability
          possibility.logprobs = event.data.logprobs
          possibility.metadata.hasLogprobs = !!event.data.logprobs
          break
      }
    }

    // Filter out empty possibilities
    if (!possibility.content || possibility.content.trim() === '') {
      return Response.json(
        { error: 'Empty possibility generated' },
        { status: 204 }
      )
    }

    return Response.json({ possibility })
  } catch (error) {
    console.error('Non-streaming possibility error:', error)
    return Response.json(
      { error: 'Failed to generate possibility' },
      { status: 500 }
    )
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
