'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ChatContainer from '../../components/ChatContainer'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { Message, Attachment } from '../../types/chat'
import type { SharedConversation } from '../../types/conversation'
import type { PossibilityResponse } from '../../types/api'

interface ConversationPageProps {
  params: Promise<{ id: string }>
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const [id, setId] = useState<string>('')
  const router = useRouter()
  const { data: session } = useSession()
  const [conversation, setConversation] = useState<SharedConversation | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [possibilities, setPossibilities] = useState<PossibilityResponse[]>([])

  // Get params on mount
  useEffect(() => {
    params.then(({ id: paramsId }) => {
      setId(paramsId)
    })
  }, [params])

  // Fetch conversation when id is available
  useEffect(() => {
    const fetchConversation = async () => {
      if (!id) return

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/conversations/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Conversation not found')
          } else {
            setError('Failed to load conversation')
          }
          return
        }

        const conversationData: SharedConversation = await response.json()
        setConversation(conversationData)

        // Convert possibilities to message format and add to the last assistant message
        const messagesWithPossibilities = [...conversationData.messages]
        if (conversationData.possibilities.length > 0) {
          // Find the last assistant message to attach possibilities
          const lastAssistantIndex = messagesWithPossibilities
            .reverse()
            .findIndex((msg) => msg.role === 'assistant')

          if (lastAssistantIndex !== -1) {
            const actualIndex =
              messagesWithPossibilities.length - 1 - lastAssistantIndex
            messagesWithPossibilities.reverse()

            // Convert PossibilityResponse to Message format
            const possibilityMessages: Message[] =
              conversationData.possibilities.map((p) => ({
                id: p.id,
                role: 'assistant' as const,
                content: p.content,
                model: p.model,
                probability: p.probability,
                temperature: p.temperature,
                timestamp:
                  p.timestamp instanceof Date
                    ? p.timestamp
                    : new Date(p.timestamp),
                systemInstruction: p.systemInstruction,
                isPossibility: true,
              }))

            messagesWithPossibilities[actualIndex] = {
              ...messagesWithPossibilities[actualIndex],
              possibilities: possibilityMessages,
            }
          } else {
            messagesWithPossibilities.reverse()
          }
        }

        setMessages(messagesWithPossibilities)
        setPossibilities(conversationData.possibilities)
      } catch (err) {
        console.error('Error fetching conversation:', err)
        setError('Failed to load conversation')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversation()
  }, [id])

  // Handle sending new messages (requires authentication)
  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!session?.user) {
        // Redirect to sign in if not authenticated
        router.push('/auth/signin')
        return
      }

      // TODO: Implement message continuation for authenticated users
      // For now, just add the message to the local state
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        attachments,
      }

      setMessages((prev) => [...prev, userMessage])
    },
    [session, router]
  )

  // Handle possibility selection (requires authentication)
  const handleSelectPossibility = useCallback(
    (userMessage: Message, selectedPossibility: Message) => {
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }

      // For shared conversations, we can allow viewing possibilities but not continuing
      console.log('Possibility selection in shared conversation:', {
        userMessage: userMessage.id,
        selectedPossibility: selectedPossibility.id,
      })
    },
    [session, router]
  )

  // Handle possibility continuation (requires authentication)
  const handleContinuePossibility = useCallback(
    async (selectedPossibility: Message) => {
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }

      // TODO: Implement possibility continuation for authenticated users
      console.log(
        'Possibility continuation in shared conversation:',
        selectedPossibility.id
      )
    },
    [session, router]
  )

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="text-lg font-semibold text-[#e0e0e0] mb-2">
            {error}
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:opacity-80 transition-opacity"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="text-lg font-semibold text-[#e0e0e0] mb-2">
            Conversation not found
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:opacity-80 transition-opacity"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-[#0a0a0a]">
      <ChatContainer
        messages={messages}
        onSendMessage={handleSendMessage}
        onSelectPossibility={handleSelectPossibility}
        onContinuePossibility={handleContinuePossibility}
        isLoading={false}
        disabled={!session?.user} // Disable input if not authenticated
        className="h-full"
        settingsLoading={false}
        apiKeysLoading={false}
        // Shared conversation mode
      />
    </div>
  )
}
