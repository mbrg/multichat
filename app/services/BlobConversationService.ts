import { put, head, BlobNotFoundError } from '@vercel/blob'
import { randomUUID } from 'crypto'
import type { Message } from '@/types/chat'
import { log } from './LoggingService'

export interface ConversationRecord {
  id: string
  userId: string
  messages: Message[]
  timestamp: string
}

const BASE_PATH = 'conversations'

async function generateUniqueId(): Promise<string> {
  while (true) {
    const id = randomUUID()
    try {
      await head(`${BASE_PATH}/${id}.json`)
      // Collision - try again
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return id
      }
    }
  }
}

export async function saveConversation(
  userId: string,
  messages: Message[]
): Promise<string> {
  const id = await generateUniqueId()
  const record: ConversationRecord = {
    id,
    userId,
    messages,
    timestamp: new Date().toISOString(),
  }
  try {
    await put(`${BASE_PATH}/${id}.json`, JSON.stringify(record), {
      access: 'public',
    })
    return id
  } catch (error) {
    log.error('Failed to save conversation', error as Error, { userId })
    throw error
  }
}

export async function getConversation(
  id: string
): Promise<ConversationRecord | null> {
  try {
    const res = await fetch(`${BASE_PATH}/${id}.json`)
    if (!res.ok) throw new BlobNotFoundError()
    const text = await res.text()
    return JSON.parse(text) as ConversationRecord
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      log.warn(`Conversation not found: ${id}`)
      return null
    }
    log.error(`Failed to load conversation ${id}`, error as Error)
    return null
  }
}
