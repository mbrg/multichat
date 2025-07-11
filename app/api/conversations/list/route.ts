import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { ConversationStorageService } from '../../../services/conversation/ConversationStorageService'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../../lib/logging'

// GET /api/conversations/list - Get user's conversation list
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const storageService = new ConversationStorageService()
    const conversations = await storageService.getUserConversations(
      session.user.id
    )
    const count = conversations.length

    const context = await getServerLogContext()
    log.info('User conversations retrieved', {
      ...context,
      userId: session.user.id,
      conversationCount: count,
    })

    return NextResponse.json({
      conversations,
      count,
      maxCount: 100,
    })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to retrieve user conversations', error as Error, context)

    return NextResponse.json(
      { error: 'Failed to retrieve conversations' },
      { status: 500 }
    )
  }
}
