import { NextRequest, NextResponse } from 'next/server'
import {
  getConversation,
  deleteConversation,
} from '../../../services/ConversationService'
import { log } from '@/services/LoggingService'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params
    const conversation = await getConversation(p.id)
    if (!conversation) {
      log.info('Conversation not found', { id: p.id })
      return NextResponse.json({ conversation: null }, { status: 404 })
    }
    return NextResponse.json({ conversation })
  } catch (error) {
    log.error('Failed to fetch conversation', error as Error)
    return NextResponse.json({ conversation: null }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params
    await deleteConversation(p.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to delete conversation', error as Error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
