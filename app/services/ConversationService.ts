import { randomUUID } from 'crypto'
import type { Message } from '../types/chat'
import { put, head, getDownloadUrl, BlobNotFoundError } from '@vercel/blob'

export interface StoredConversation {
  id: string
  userId: string
  messages: Message[]
  createdAt: string
}

export class ConversationService {
  private static folder = 'conversations'

  private static async exists(id: string): Promise<boolean> {
    try {
      await head(`${this.folder}/${id}.json`)
      return true
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return false
      }
      throw err
    }
  }

  static async save(userId: string, messages: Message[]): Promise<string> {
    let id: string
    do {
      id = randomUUID()
    } while (await this.exists(id))

    const conversation: StoredConversation = {
      id,
      userId,
      messages,
      createdAt: new Date().toISOString(),
    }

    await put(`${this.folder}/${id}.json`, JSON.stringify(conversation), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json',
    })

    return id
  }

  static async get(id: string): Promise<StoredConversation | null> {
    try {
      const meta = await head(`${this.folder}/${id}.json`)
      const downloadUrl = getDownloadUrl(meta.url)
      const res = await fetch(downloadUrl)
      if (!res.ok) return null
      const json = await res.json()
      return json as StoredConversation
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return null
      }
      throw err
    }
  }
}
