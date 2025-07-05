import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import {
  generateUniqueId,
  saveConversation,
} from '../../services/ConversationService'
import { getServerLogContext } from '../../lib/logging'
import { log } from '@/services/LoggingService'
import type { StoredConversation } from '../../types/conversation'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const data = await request.json()
    const id = await generateUniqueId()
    const conversation: StoredConversation = {
      id,
      userId: session.user.id,
      createdAt: new Date().toISOString(),
      messages: data.messages || [],
      possibilities: data.possibilities || [],
      metadata: { version: 1 },
    }
    await saveConversation(conversation)
    const url = `${new URL(request.url).origin}/conversation/${id}`
    return NextResponse.json({ id, url })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to publish conversation', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to publish conversation' },
      { status: 500 }
    )
  }
}
