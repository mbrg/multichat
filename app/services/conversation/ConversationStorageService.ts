import { put, head, list, del } from '@vercel/blob'
import type {
  SharedConversation,
  ShareConversationRequest,
  ShareConversationResponse,
} from '../../types/conversation'

export class ConversationStorageService {
  private getBaseUrl(): string {
    // In browser context, use the current origin
    if (typeof window !== 'undefined') {
      return window.location.origin
    }

    // In server context, use environment variable or headers
    return process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || ''
  }

  /**
   * Save a conversation to Vercel Blob storage with collision-resistant UUID generation
   */
  async saveConversation(
    creatorId: string,
    request: ShareConversationRequest,
    baseUrl?: string
  ): Promise<ShareConversationResponse> {
    try {
      // Generate unique ID with collision checking
      const id = await this.generateUniqueId()

      const sharedConversation: SharedConversation = {
        id,
        createdAt: Date.now(),
        creatorId,
        messages: request.messages,
        possibilities: request.possibilities,
        metadata: request.metadata || {},
      }

      const key = `conversations/${id}.json`
      const blob = await put(key, JSON.stringify(sharedConversation), {
        access: 'public',
      })

      console.log(`Conversation saved successfully: ${key}`, {
        conversationId: id,
        creatorId,
        blobUrl: blob.url,
      })

      return {
        id,
        url: `${baseUrl || this.getBaseUrl()}/conversation/${id}`,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to save conversation:', {
        error: errorMessage,
        creatorId,
        messageCount: request.messages.length,
        possibilityCount: request.possibilities.length,
      })
      throw new Error(`Failed to save conversation: ${errorMessage}`)
    }
  }

  /**
   * Retrieve a conversation from Vercel Blob storage
   */
  async getConversation(id: string): Promise<SharedConversation | null> {
    try {
      // List blobs to find the one we're looking for
      const { blobs } = await list({
        prefix: `conversations/${id}`,
      })

      if (blobs.length === 0) {
        console.log(`Conversation not found: ${id}`)
        return null
      }

      // Get the first matching blob
      const blob = blobs[0]

      // Fetch the content from the blob URL
      const response = await fetch(blob.url)

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Conversation not found: ${id}`)
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const conversation = await response.json()
      return conversation as SharedConversation
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
        console.log(`Conversation not found: ${id}`)
        return null
      }

      console.error('Failed to retrieve conversation:', {
        error: errorMessage,
        conversationId: id,
      })
      throw new Error(`Failed to retrieve conversation: ${errorMessage}`)
    }
  }

  /**
   * Delete a conversation from Vercel Blob storage
   */
  async deleteConversation(id: string): Promise<void> {
    try {
      // List blobs to find the one we're looking for
      const { blobs } = await list({
        prefix: `conversations/${id}`,
      })

      if (blobs.length === 0) {
        throw new Error(`Conversation not found: ${id}`)
      }

      // Delete the blob
      const blob = blobs[0]
      await del(blob.url)

      console.log(`Conversation deleted successfully: ${id}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to delete conversation:', {
        error: errorMessage,
        conversationId: id,
      })
      throw new Error(`Failed to delete conversation: ${errorMessage}`)
    }
  }

  /**
   * Generate a cryptographically secure UUID and check for collisions
   */
  private async generateUniqueId(): Promise<string> {
    const maxRetries = 10

    for (let i = 0; i < maxRetries; i++) {
      const id = crypto.randomUUID()

      try {
        // Check if this ID already exists
        await head(`conversations/${id}.json`)
        // If we get here, the ID exists, so try again
        continue
      } catch (error) {
        // If head() throws, the ID doesn't exist, so we can use it
        return id
      }
    }

    throw new Error(
      'Failed to generate unique conversation ID after maximum retries'
    )
  }
}
