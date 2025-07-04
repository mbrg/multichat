import { put, head, BlobNotFoundError } from '@vercel/blob'
import { randomUUID } from 'crypto'
import type { Conversation } from '../../types/conversation'
import { log } from '../LoggingService'

const PREFIX = 'conversations'

async function generateId(): Promise<string> {
  while (true) {
    const id = randomUUID()
    try {
      await head(`${PREFIX}/${id}.json`)
    } catch (err: any) {
      if (
        err instanceof BlobNotFoundError ||
        err?.name === 'BlobNotFoundError'
      ) {
        return id
      }
      log.error('Blob head error', err as Error)
      throw err
    }
  }
}

export async function saveConversation(
  data: Omit<Conversation, 'id'>
): Promise<string> {
  const id = await generateId()
  const conversation: Conversation = { ...data, id }
  try {
    await put(`${PREFIX}/${id}.json`, JSON.stringify(conversation), {
      access: 'public',
    })
  } catch (error) {
    log.error('Failed to save conversation', error as Error)
    throw error
  }
  return id
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  try {
    const meta = await head(`${PREFIX}/${id}.json`)
    const res = await fetch(meta.url)
    if (!res.ok) return null
    const data = await res.json()
    return { ...data, timestamp: new Date(data.timestamp) }
  } catch (err: any) {
    if (err instanceof BlobNotFoundError || err?.name === 'BlobNotFoundError') {
      return null
    }
    log.error('Failed to load conversation', err as Error)
    return null
  }
}
