import ChatContainer from '../../components/ChatContainer'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '../../lib/auth'
import { log } from '@/services/LoggingService'

interface ConversationResponse {
  conversation: {
    messages: any[]
  } | null
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const p = await params
  const hdrs = await headers()
  const protocol = hdrs.get('x-forwarded-proto') ?? 'http'
  const host = hdrs.get('host')!
  const url = `${protocol}://${host}/api/conversations/${p.id}`
  let conversation: ConversationResponse['conversation'] = null
  try {
    const res = await fetch(url)
    if (res.ok) {
      const data: ConversationResponse = await res.json()
      conversation = data.conversation
    } else {
      log.error(
        'Failed to load conversation',
        new Error(`HTTP ${res.status}`),
        {
          id: p.id,
        }
      )
    }
  } catch (error) {
    log.error('Failed to fetch conversation', error as Error, { id: p.id })
  }
  if (!conversation) {
    log.info('Conversation not found', { id: p.id })
    return <div className="p-4">This conversation couldn’t be found.</div>
  }
  const session = await getServerSession(authOptions)
  const isAuthenticated = Boolean(session?.user)
  return (
    <ChatContainer
      messages={conversation.messages}
      onSendMessage={() => {}}
      isLoading={false}
      disabled={!isAuthenticated}
      isGeneratingPossibilities={false}
      className="h-[100dvh]"
      settingsLoading={false}
      apiKeysLoading={false}
    />
  )
}
