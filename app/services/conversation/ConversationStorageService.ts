import { put, head, list, del } from '@vercel/blob'
import type {
  SharedConversation,
  ShareConversationRequest,
  ShareConversationResponse,
  ConversationMetadata,
} from '../../types/conversation'
import { CONVERSATION_SCHEMA } from '../../constants/defaults'
import {
  migrateConversation,
  validateConversationSchema,
  getCurrentVersion,
  ConversationMigrationError,
  ConversationSchemaError,
} from './ConversationMigrationService'
import { ConversationsService } from '../EncryptedDataService'

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
      // Check conversation limit first
      const userConversations = await ConversationsService.getData(creatorId)
      if (userConversations.conversations.length >= 100) {
        throw new Error('Maximum number of conversations reached (100)')
      }

      // Generate unique ID with collision checking
      const id = await this.generateUniqueId()

      const sharedConversation: SharedConversation = {
        id,
        version: getCurrentVersion(),
        createdAt: Date.now(),
        creatorId,
        messages: request.messages,
        possibilities: request.possibilities,
        metadata: request.metadata || {},
      }

      // Validate schema before saving
      if (!validateConversationSchema(sharedConversation)) {
        throw new Error('Invalid conversation schema')
      }

      const key = `conversations/${id}.json`
      const blob = await put(key, JSON.stringify(sharedConversation), {
        access: 'public',
      })

      // Add conversation metadata to user's KV list
      const conversationMetadata: ConversationMetadata = {
        id,
        title: request.metadata?.title || 'Untitled Conversation',
        createdAt: sharedConversation.createdAt,
        blobUrl: blob.url,
      }

      const updatedConversations = {
        conversations: [
          ...userConversations.conversations,
          conversationMetadata,
        ],
      }
      await ConversationsService.saveData(creatorId, updatedConversations)

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

      const rawData = await response.json()

      try {
        // Migrate conversation to current schema version if needed
        const conversation = migrateConversation(rawData)

        // Validate migrated conversation (throw on error)
        validateConversationSchema(conversation, true)

        return conversation
      } catch (migrationError) {
        if (migrationError instanceof ConversationMigrationError) {
          console.error('Conversation migration failed:', {
            conversationId: id,
            fromVersion: migrationError.fromVersion,
            error: migrationError.message,
          })
          throw new Error(
            `Conversation format is incompatible: ${migrationError.message}`
          )
        }

        if (migrationError instanceof ConversationSchemaError) {
          console.error('Conversation schema validation failed:', {
            conversationId: id,
            invalidFields: migrationError.invalidFields,
            error: migrationError.message,
          })
          throw new Error(
            `Conversation data is corrupted: ${migrationError.message}`
          )
        }

        throw migrationError
      }
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
   * Delete a conversation from both blob storage and user's KV list
   */
  async deleteUserConversation(
    userId: string,
    conversationId: string
  ): Promise<void> {
    try {
      // First, delete from blob storage
      await this.deleteConversation(conversationId)

      // Then, remove from user's KV list
      const userConversations = await ConversationsService.getData(userId)
      const filteredConversations = userConversations.conversations.filter(
        (conv) => conv.id !== conversationId
      )

      await ConversationsService.saveData(userId, {
        conversations: filteredConversations,
      })

      console.log(
        `Conversation ${conversationId} deleted successfully for user ${userId}`
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to delete user conversation:', {
        error: errorMessage,
        userId,
        conversationId,
      })
      throw new Error(`Failed to delete conversation: ${errorMessage}`)
    }
  }

  /**
   * Update conversation title in user's KV list
   */
  async updateConversationTitle(
    userId: string,
    conversationId: string,
    newTitle: string
  ): Promise<void> {
    try {
      // Validate title length
      if (newTitle.length > 240) {
        throw new Error('Title cannot exceed 240 characters')
      }

      const userConversations = await ConversationsService.getData(userId)
      const conversationIndex = userConversations.conversations.findIndex(
        (conv) => conv.id === conversationId
      )

      if (conversationIndex === -1) {
        throw new Error(`Conversation not found: ${conversationId}`)
      }

      // Update the title
      userConversations.conversations[conversationIndex].title = newTitle

      await ConversationsService.saveData(userId, userConversations)

      console.log(`Conversation title updated successfully: ${conversationId}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to update conversation title:', {
        error: errorMessage,
        userId,
        conversationId,
        newTitle,
      })
      throw new Error(`Failed to update conversation title: ${errorMessage}`)
    }
  }

  /**
   * Get user's conversation list from KV storage
   */
  async getUserConversations(userId: string): Promise<ConversationMetadata[]> {
    try {
      const userConversations = await ConversationsService.getData(userId)
      // Sort by creation date, newest first
      return userConversations.conversations.sort(
        (a, b) => b.createdAt - a.createdAt
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to get user conversations:', {
        error: errorMessage,
        userId,
      })
      throw new Error(`Failed to get conversations: ${errorMessage}`)
    }
  }

  /**
   * Get conversation count for user
   */
  async getConversationCount(userId: string): Promise<number> {
    try {
      const userConversations = await ConversationsService.getData(userId)
      return userConversations.conversations.length
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to get conversation count:', {
        error: errorMessage,
        userId,
      })
      return 0
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
