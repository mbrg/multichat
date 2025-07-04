import { ConversationService } from '@/services/ConversationService'
import ChatDemo from '@/components/ChatDemo'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ConversationPageProps {
  params?: Promise<{ id: string }>
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = params ? await params : { id: '' }
  const conversation = await ConversationService.get(id)
  if (!conversation) {
    return <div className="p-4">Conversation not found</div>
  }
  const session = await getServerSession(authOptions)
  const allowMessaging = Boolean(session?.user)
  return (
    <ChatDemo
      initialMessages={conversation.messages}
      allowMessaging={allowMessaging}
    />
  )
}
