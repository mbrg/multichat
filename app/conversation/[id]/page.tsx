import ChatDemo from '@/components/ChatDemo'
import ChatContainer from '@/components/ChatContainer'
import { getConversation } from '@/services/BlobConversationService'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function ConversationPage({ params }: any) {
  const conversation = await getConversation(params.id)
  if (!conversation) {
    return <div className="p-4">Conversation not found.</div>
  }

  const session = await getServerSession(authOptions)
  if (session?.user) {
    return <ChatDemo initialMessages={conversation.messages} />
  }

  return (
    <ChatContainer
      messages={conversation.messages}
      onSendMessage={() => {}}
      disabled
      className="h-[100dvh]"
    />
  )
}
