import { Metadata } from 'next'
import ConversationClient from './ConversationClient'
import type { SharedConversation } from '../../types/conversation'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    // Fetch conversation data server-side
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')

    const response = await fetch(`${baseUrl}/api/conversations/${id}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      return {
        title: 'Conversation Not Found - chatsbox.ai',
        description:
          'The requested conversation could not be found. | AI Chat Sandbox',
      }
    }

    const conversation: SharedConversation = await response.json()

    // Get the first user message for the title
    const firstUserMessage = conversation.messages.find(
      (msg) => msg.role === 'user'
    )
    const title = firstUserMessage?.content || 'AI Conversation'

    // Truncate title if too long
    const truncatedTitle =
      title.length > 60 ? title.substring(0, 57) + '...' : title

    // Get the first AI response for the description
    const firstAssistantMessage = conversation.messages.find(
      (msg) =>
        msg.role === 'assistant' && msg.content && msg.content.trim() !== ''
    )

    let description = 'View this AI conversation on chatsbox.ai'

    if (firstAssistantMessage) {
      // Extract model name
      let modelName = 'AI'
      if (typeof firstAssistantMessage.model === 'string') {
        modelName = firstAssistantMessage.model
      } else if (
        firstAssistantMessage.model &&
        typeof firstAssistantMessage.model === 'object'
      ) {
        modelName =
          (firstAssistantMessage.model as any).name ||
          (firstAssistantMessage.model as any).id ||
          'AI'
      }

      // Clean up model name (remove provider prefix if present)
      if (modelName.includes('/')) {
        modelName = modelName.split('/').pop() || modelName
      }

      // Get first 150 characters of the response
      const responsePreview = firstAssistantMessage.content.substring(0, 150)
      const truncatedResponse =
        responsePreview.length === 150
          ? responsePreview + '...'
          : responsePreview

      description = `${modelName}: ${truncatedResponse}`
    }

    // If we have possibilities, show two different AI responses
    if (conversation.possibilities && conversation.possibilities.length > 1) {
      // Get first two possibilities with different models
      const twoResponses = []
      const seenModels = new Set<string>()

      for (const possibility of conversation.possibilities) {
        if (twoResponses.length >= 2) break

        let modelName = 'AI'
        if (typeof possibility.model === 'string') {
          modelName = possibility.model.includes('/')
            ? possibility.model.split('/').pop()!
            : possibility.model
        } else if (possibility.model && typeof possibility.model === 'object') {
          const name =
            (possibility.model as any).name ||
            (possibility.model as any).id ||
            'AI'
          modelName = name.includes('/') ? name.split('/').pop()! : name
        }

        // Only add if we haven't seen this model yet or if we need to fill up to 2
        if (!seenModels.has(modelName) || seenModels.size === 0) {
          seenModels.add(modelName)
          const responsePreview = possibility.content.substring(0, 75)
          const truncatedResponse =
            responsePreview.length === 75
              ? responsePreview + '...'
              : responsePreview
          twoResponses.push(`${modelName}: ${truncatedResponse}`)
        }
      }

      if (twoResponses.length >= 2) {
        description = twoResponses.join(' | ')
      } else if (twoResponses.length === 1) {
        description = twoResponses[0]
      }
    }

    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chatsbox.ai'}/conversation/${id}`

    // Add AI Chat Sandbox suffix to description
    const finalDescription = `${description} | AI Chat Sandbox`

    return {
      title: `${truncatedTitle} - chatsbox.ai`,
      description: finalDescription,
      openGraph: {
        type: 'article',
        title: truncatedTitle,
        description: finalDescription,
        url,
        siteName: 'chatsbox.ai',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: truncatedTitle,
        description: finalDescription,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)

    return {
      title: 'AI Conversation - chatsbox.ai',
      description: 'View this AI conversation on chatsbox.ai | AI Chat Sandbox',
    }
  }
}

export default function ConversationPage({ params }: PageProps) {
  return <ConversationClient params={params} />
}
