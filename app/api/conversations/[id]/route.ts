import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../../lib/logging'
import { getConversation } from '@/services/BlobConversationService'

export async function GET(_request: NextRequest, context: any) {
  const { id } = context.params as { id: string }
  try {
    const conversation = await getConversation(id)
    if (!conversation) {
      const ctx = await getServerLogContext()
      log.warn(`Conversation not found: ${id}`, ctx)
      return NextResponse.json(null)
    }
    return NextResponse.json({ conversation })
  } catch (error) {
    const ctx = await getServerLogContext()
    log.error('Failed to load conversation', error as Error, ctx)
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 }
    )
  }
}
