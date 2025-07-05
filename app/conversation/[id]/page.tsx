import ChatContainer from '../../components/ChatContainer'
import { getServerSession } from 'next-auth'
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
  const res = await fetch(`/api/conversations/${p.id}`)
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
