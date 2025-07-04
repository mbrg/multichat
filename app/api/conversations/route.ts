import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { saveConversation } from '../../services/blob/conversations'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../lib/logging'
import type { Message } from '../../types/chat'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { messages } = (await request.json()) as { messages: Message[] }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid conversation' },
        { status: 400 }
      )
    }
    const id = await saveConversation({
      userId: session.user.id,
      messages,
      timestamp: new Date(),
    })
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
