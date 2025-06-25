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
 * Handle non-streaming requests
 */
async function handleNonStreamingRequest(data: ChatCompletionRequest) {
  try {
    // Generate permutations
    const permutationGenerator = new PermutationGenerator()
    const permutations = permutationGenerator.generatePermutations(
      data.settings
    )

    // Execute possibilities without streaming
    const executor = new PossibilityExecutor()
    const eventGenerator = executor.executePossibilities(
      data.messages,
      permutations,
      {
        maxTokens: data.options.maxTokens || 100,
      }
    )

    // Collect all events
    const possibilities: any[] = []
    const possibilityMap = new Map<string, any>()

    for await (const event of eventGenerator) {
      switch (event.type) {
        case 'possibility_start':
          possibilityMap.set(event.data.id, {
            id: event.data.id,
            provider: event.data.provider,
            model: event.data.model,
            temperature: event.data.temperature,
            systemInstruction: event.data.systemInstruction,
            content: '',
            probability: null,
            logprobs: null,
            timestamp: new Date(),
            metadata: {
              permutationId: event.data.id,
              hasLogprobs: false,
            },
          })
          break

        case 'token':
          const possibility = possibilityMap.get(event.data.id)
          if (possibility) {
            possibility.content += event.data.token
          }
          break

        case 'probability':
          const possibilityWithProb = possibilityMap.get(event.data.id)
          if (possibilityWithProb) {
            possibilityWithProb.probability = event.data.probability
            possibilityWithProb.logprobs = event.data.logprobs
            possibilityWithProb.metadata.hasLogprobs = !!event.data.logprobs
          }
          break

        case 'possibility_complete':
          const completedPossibility = possibilityMap.get(event.data.id)
          if (completedPossibility) {
            possibilities.push(completedPossibility)
          }
          break
      }
    }

    return Response.json({ possibilities })
  } catch (error) {
    console.error('Non-streaming completion error:', error)
    return Response.json(
      { error: 'Failed to generate possibilities' },
      { status: 500 }
    )
  }
}
