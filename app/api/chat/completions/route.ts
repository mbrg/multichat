import { NextRequest } from 'next/server'
import { z } from 'zod'
import { PermutationGenerator } from '@/services/ai/permutations'
import { PossibilityExecutor } from '@/services/ai/executor'
import type { ChatCompletionRequest, StreamEvent } from '@/types/api'

// Request validation schema
const requestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.string().transform((str) => new Date(str)),
    })
  ),
  settings: z.object({
    systemPrompt: z.string().optional(),
    enabledProviders: z.array(z.string()),
    systemInstructions: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        content: z.string(),
      })
    ),
    temperatures: z.array(z.number()),
  }),
  options: z.object({
    maxTokens: z.number().optional().default(100),
    stream: z.boolean().optional().default(true),
    mode: z.enum(['possibilities', 'continuation']),
    continuationId: z.string().optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const validatedData = requestSchema.parse(body) as ChatCompletionRequest

    // Check if streaming is requested
    if (!validatedData.options.stream) {
      // Non-streaming response
      return handleNonStreamingRequest(validatedData)
    }

    // Create SSE stream for streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate permutations
          const permutationGenerator = new PermutationGenerator()
          const permutations = permutationGenerator.generatePermutations(
            validatedData.settings
          )

          // Log permutation count
          console.log(`Generating ${permutations.length} possibilities`)

          // Execute possibilities with streaming
          const executor = new PossibilityExecutor()
          const eventGenerator = executor.executePossibilities(
            validatedData.messages,
            permutations,
            {
              maxTokens: validatedData.options.maxTokens || 100,
            }
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
      },
    })
  } catch (error) {
    console.error('Chat completions error:', error)

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
 * Handle non-streaming requests (not implemented yet)
 */
async function handleNonStreamingRequest(data: ChatCompletionRequest) {
  // TODO: Implement non-streaming response
  return Response.json(
    { error: 'Non-streaming mode not implemented yet' },
    { status: 501 }
  )
}
