import { NextRequest, NextResponse } from 'next/server'
import { getConversation } from '../../../services/blob/conversations'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../../lib/logging'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } | any
) {
  try {
    const conversation = await getConversation(params.id)
    if (!conversation) {
      const context = await getServerLogContext()
      log.info(`Conversation not found: ${params.id}`, context)
      return NextResponse.json(null, { status: 404 })
    }
    return NextResponse.json(conversation)
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to load conversation', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 }
    )
  }
}
