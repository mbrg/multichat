import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { ConversationStorageService } from '../../services/conversation/ConversationStorageService'
import type { ShareConversationRequest } from '../../types/conversation'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../lib/logging'

// POST /api/conversations - Save a conversation for sharing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { messages, possibilities, metadata } =
      body as ShareConversationRequest

    // Validate required fields
    if (!Array.isArray(messages) || !Array.isArray(possibilities)) {
      return NextResponse.json(
        { error: 'Invalid request: messages and possibilities are required' },
        { status: 400 }
      )
    }

    // Validate non-empty conversation
    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Cannot share empty conversation' },
        { status: 400 }
      )
    }

    const conversationRequest: ShareConversationRequest = {
      messages,
      possibilities,
      metadata: metadata || {},
    }

    // Get the host from the request headers
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`

    const storageService = new ConversationStorageService()
    const result = await storageService.saveConversation(
      session.user.id,
      conversationRequest,
      baseUrl
    )

    const context = await getServerLogContext()
    log.info('Conversation shared successfully', {
      ...context,
      conversationId: result.id,
      userId: session.user.id,
      messageCount: messages.length,
      possibilityCount: possibilities.length,
    })

    return NextResponse.json(result)
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to save conversation', error as Error, context)

    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    )
  }
}
