import { put, head, del } from '@vercel/blob'
import type { StoredConversation } from '../types/conversation'

const PREFIX = 'conversations/'

export async function generateUniqueId(): Promise<string> {
  let id: string
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
  return id!
}

export async function saveConversation(convo: StoredConversation) {
  await put(`${PREFIX}${convo.id}.json`, JSON.stringify(convo), {
    access: 'public',
  })
}

export async function getConversation(
  id: string
): Promise<StoredConversation | null> {
  try {
    const res = await fetch(
      `${process.env.BLOB_READ_WRITE_URL ?? ''}/${PREFIX}${id}.json`
    )
    if (!res.ok) throw new Error('not found')
    const text = await res.text()
    return JSON.parse(text) as StoredConversation
  } catch {
    return null
  }
}

export async function deleteConversation(id: string) {
  await del(`${PREFIX}${id}.json`)
}
