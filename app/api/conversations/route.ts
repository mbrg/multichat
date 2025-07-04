import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Message } from '../../types/chat'
import { ConversationService } from '../../services/ConversationService'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'

const conversationSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string().optional(),
      model: z.string().optional(),
      probability: z.number().nullable().optional(),
      temperature: z.number().optional(),
      timestamp: z.string(),
      possibilities: z.any().optional(),
      isPossibility: z.boolean().optional(),
      systemInstruction: z.string().optional(),
      error: z.string().optional(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? 'anonymous'
    const body = await request.json()
    const data = conversationSchema.parse(body)
    const messages: Message[] = data.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
    const id = await ConversationService.save(userId, messages)
    return NextResponse.json({ id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to save conversation', error)
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    )
  }
}
