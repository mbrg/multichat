import type { Message } from './chat'
import type { PossibilityResponse } from './api'

export interface SharedConversation {
  id: string
  version: string
  createdAt: number
  creatorId: string
  messages: Message[]
  possibilities: PossibilityResponse[]
  metadata: {
    title?: string
    description?: string
  }
  blobUrl?: string
}

export interface ShareConversationRequest {
  messages: Message[]
  possibilities: PossibilityResponse[]
  metadata?: {
    title?: string
    description?: string
  }
}

export interface ShareConversationResponse {
  id: string
  url: string
}
