import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { ConversationStorageService } from '../../../../services/conversation/ConversationStorageService'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../../../lib/logging'

// DELETE /api/conversations/manage/[id] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    const storageService = new ConversationStorageService()
    await storageService.deleteUserConversation(session.user.id, id)

    const context = await getServerLogContext()
    log.info('Conversation deleted successfully', {
      ...context,
      conversationId: id,
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to delete conversation', error as Error, context)

    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/manage/[id] - Update conversation title
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      )
    }

    if (title.length > 240) {
      return NextResponse.json(
        { error: 'Title cannot exceed 240 characters' },
        { status: 400 }
      )
    }

    const storageService = new ConversationStorageService()
    await storageService.updateConversationTitle(session.user.id, id, title)

    const context = await getServerLogContext()
    log.info('Conversation title updated successfully', {
      ...context,
      conversationId: id,
      userId: session.user.id,
      newTitle: title,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to update conversation title', error as Error, context)

    return NextResponse.json(
      { error: 'Failed to update conversation title' },
      { status: 500 }
    )
  }
}
