import ChatDemo from '../../components/ChatDemo'
import type { Message } from '../../types/chat'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ConversationPage({
  params,
}:
  | {
      params: { id: string }
    }
  | any) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL || ''}/api/conversations/${params.id}`,
    { cache: 'no-store' }
  )
  if (!res.ok) {
    return notFound()
  }
  const data = await res.json()
  if (!data) return notFound()
  const messages: Message[] = data.messages
  return <ChatDemo initialMessages={messages} />
}
