import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../lib/logging'
import { saveConversation } from '@/services/BlobConversationService'
import { z } from 'zod'
import type { Message } from '@/types/chat'

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string().nullable().optional(),
  model: z.string().optional(),
  probability: z.number().nullable().optional(),
  temperature: z.number().optional(),
  timestamp: z.string(),
  possibilities: z.array(z.any()).optional(),
  systemInstruction: z.string().optional(),
  isPossibility: z.boolean().optional(),
  attachments: z.any().optional(),
  error: z.string().optional(),
})

const bodySchema = z.object({
  messages: z.array(messageSchema),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    const msgs = body.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })) as Message[]
    const id = await saveConversation(session.user.id, msgs)
    return NextResponse.json({ id })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to save conversation', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    )
  }
}
