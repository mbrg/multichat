import { NextRequest, NextResponse } from 'next/server'
import { ConversationService } from '../../../services/ConversationService'

export async function GET(_request: NextRequest, context: any) {
  try {
    const { id } = await context.params
    const conversation = await ConversationService.get(id)
    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(conversation)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}
