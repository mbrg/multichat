import type { Message } from './chat'

export interface Possibility extends Message {}

export interface StoredConversation {
  id: string
  userId: string
  createdAt: string
  messages: Message[]
  possibilities: Possibility[]
  metadata: { version: number }
}
