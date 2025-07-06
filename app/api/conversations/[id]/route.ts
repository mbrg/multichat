import { NextRequest, NextResponse } from 'next/server'
import { ConversationStorageService } from '../../../services/conversation/ConversationStorageService'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../../lib/logging'

// GET /api/conversations/[id] - Retrieve a shared conversation (public access)
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const { id } = params

    // Validate conversation ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      )
    }

    const storageService = new ConversationStorageService()
    const conversation = await storageService.getConversation(id)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const context = await getServerLogContext()
    log.info('Conversation retrieved successfully', {
      ...context,
      conversationId: id,
      creatorId: conversation.creatorId,
      messageCount: conversation.messages.length,
      possibilityCount: conversation.possibilities.length,
    })

    return NextResponse.json(conversation)
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to retrieve conversation', error as Error, {
      ...context,
      conversationId: params.id,
    })

    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    )
  }
}
