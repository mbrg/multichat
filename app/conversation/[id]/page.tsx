import ChatContainer from '../../components/ChatContainer'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '../../lib/auth'

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
  const res = await fetch(url)
  let conversation: ConversationResponse['conversation'] = null
  if (res.ok) {
    const data: ConversationResponse = await res.json()
    conversation = data.conversation
  }
  if (!conversation) {
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
