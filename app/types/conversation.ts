import type { Message } from './chat'

export interface Conversation {
  id: string
  userId: string
  messages: Message[]
  timestamp: Date
}
