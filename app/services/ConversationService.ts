import { put, head, del } from '@vercel/blob'
import type { StoredConversation } from '../types/conversation'
import { log } from './LoggingService'

const PREFIX = 'conversations/'

export async function generateUniqueId(): Promise<string> {
  let id = ''
  let exists = true
  while (exists) {
    id = crypto.randomUUID()
    try {
      await head(`${PREFIX}${id}.json`)
      exists = true
    } catch {
      exists = false
    }
  }
  log.debug('Generated unique conversation id', { id })
  return id!
}

export async function saveConversation(convo: StoredConversation) {
  await put(`${PREFIX}${convo.id}.json`, JSON.stringify(convo), {
    access: 'public',
  })
  log.info('Conversation saved', { id: convo.id })
}

export async function getConversation(
  id: string
): Promise<StoredConversation | null> {
  const baseUrl = process.env.BLOB_READ_WRITE_URL
  if (!baseUrl) {
    log.error('BLOB_READ_WRITE_URL missing')
    return null
  }
  try {
    const res = await fetch(`${baseUrl}/${PREFIX}${id}.json`)
    if (!res.ok) {
      log.info('Conversation blob not found', { id })
      return null
    }
    const text = await res.text()
    return JSON.parse(text) as StoredConversation
  } catch (error) {
    log.error('Failed to fetch conversation blob', error as Error, { id })
    return null
  }
}

export async function deleteConversation(id: string) {
  await del(`${PREFIX}${id}.json`)
  log.info('Conversation deleted', { id })
}
