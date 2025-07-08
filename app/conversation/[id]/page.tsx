'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ChatContainer from '../../components/ChatContainer'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { Message, Attachment } from '../../types/chat'
import type { SharedConversation } from '../../types/conversation'
import type { PossibilityResponse } from '../../types/api'
import { log } from '@/services/LoggingService'

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
        log.debug('Fetched shared conversation data', {
          conversationId: conversationData.id,
          messagesCount: conversationData.messages.length,
          possibilitiesCount: conversationData.possibilities.length,
          messages: conversationData.messages,
          possibilities: conversationData.possibilities,
        })
        setConversation(conversationData)

        // Convert possibilities to message format and add to the appropriate assistant message
        const messagesWithPossibilities = [...conversationData.messages]
        if (conversationData.possibilities.length > 0) {
          // Find an assistant message with empty content (placeholder for possibilities)
          // or the last assistant message if no empty one exists
          let targetIndex = -1

          // First, look for an assistant message with empty content
          for (let i = messagesWithPossibilities.length - 1; i >= 0; i--) {
            const msg = messagesWithPossibilities[i]
            if (
              msg.role === 'assistant' &&
              (!msg.content || msg.content.trim() === '')
            ) {
              targetIndex = i
              log.debug('Found empty assistant message for possibilities', {
                conversationId: conversationData.id,
                messageIndex: i,
                messageId: msg.id,
                messageRole: msg.role,
              })
              break
            }
          }

          // If no empty assistant message found, use the last assistant message
          if (targetIndex === -1) {
            for (let i = messagesWithPossibilities.length - 1; i >= 0; i--) {
              if (messagesWithPossibilities[i].role === 'assistant') {
                targetIndex = i
                log.debug('Found last assistant message for possibilities', {
                  conversationId: conversationData.id,
                  messageIndex: i,
                  messageId: messagesWithPossibilities[i].id,
                  messageContent: messagesWithPossibilities[i].content,
                })
                break
              }
            }
          }

          // If still no assistant message found, add a placeholder
          if (targetIndex === -1) {
            log.debug('No assistant message found, adding placeholder', {
              conversationId: conversationData.id,
              messagesCount: messagesWithPossibilities.length,
            })
            messagesWithPossibilities.push({
              id: 'shared-possibilities',
              role: 'assistant' as const,
              content: '',
              timestamp: new Date(),
            })
            targetIndex = messagesWithPossibilities.length - 1
          }

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

          log.debug('Attaching possibilities to message', {
            conversationId: conversationData.id,
            targetIndex,
            originalMessageId: messagesWithPossibilities[targetIndex].id,
            possibilityCount: possibilityMessages.length,
            possibilityIds: possibilityMessages.map((p) => p.id),
          })

          messagesWithPossibilities[targetIndex] = {
            ...messagesWithPossibilities[targetIndex],
            possibilities: possibilityMessages,
          }

          log.debug('Successfully attached possibilities to message', {
            conversationId: conversationData.id,
            messageId: messagesWithPossibilities[targetIndex].id,
            hasPossibilities:
              !!messagesWithPossibilities[targetIndex].possibilities,
            possibilityCount:
              messagesWithPossibilities[targetIndex].possibilities?.length || 0,
          })
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
        // Don't redirect - just prevent action
        console.log('Authentication required for messaging')
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
    [session]
  )

  // Handle possibility selection (requires authentication)
  const handleSelectPossibility = useCallback(
    (userMessage: Message, selectedPossibility: Message) => {
      if (!session?.user) {
        // Don't redirect - just prevent action
        console.log('Authentication required for possibility selection')
        return
      }

      // Allow authenticated users to select possibilities
      setMessages((prevMessages) => {
        // Find the assistant message that has empty content (placeholder for possibilities)
        const assistantMessageIndex = prevMessages.findIndex(
          (msg) =>
            msg.role === 'assistant' &&
            (!msg.content || msg.content === '') &&
            !msg.isPossibility
        )

        if (assistantMessageIndex === -1) {
          console.error(
            'Could not find assistant message to replace with selected possibility'
          )
          return prevMessages
        }

        // Create new messages array
        const newMessages = [...prevMessages]

        // Replace the empty assistant message with the selected possibility content
        const fixedAssistantMessage: Message = {
          id: newMessages[assistantMessageIndex].id, // Keep original ID
          role: 'assistant',
          content: selectedPossibility.content,
          model:
            typeof selectedPossibility.model === 'string'
              ? selectedPossibility.model
              : (selectedPossibility.model as any)?.id ||
                (selectedPossibility.model as any)?.name,
          temperature: selectedPossibility.temperature,
          probability: selectedPossibility.probability,
          timestamp: newMessages[assistantMessageIndex].timestamp, // Keep original timestamp
          systemInstruction: selectedPossibility.systemInstruction,
          possibilities: undefined, // Remove possibilities after selection
          isPossibility: false,
        }

        newMessages[assistantMessageIndex] = fixedAssistantMessage

        return newMessages
      })
    },
    [session]
  )

  // Handle possibility continuation (requires authentication)
  const handleContinuePossibility = useCallback(
    async (selectedPossibility: Message) => {
      if (!session?.user) {
        // Don't redirect - just prevent action
        console.log('Authentication required for possibility continuation')
        return
      }

      // TODO: Implement possibility continuation for authenticated users
      console.log(
        'Possibility continuation in shared conversation:',
        selectedPossibility.id
      )
    },
    [session]
  )

  // Handle title click (go to home)
  const handleTitleClick = useCallback(() => {
    router.push('/')
  }, [router])

  // Handle publish conversation (only for creator)
  const handlePublishConversation = useCallback(async () => {
    if (!session?.user || !conversation) {
      return
    }

    // Only allow creator to publish
    if (conversation.creatorId !== session.user.id) {
      return
    }

    // Re-publish the same conversation (already exists)
    // Return the existing share data
    return {
      url: window.location.href,
      id: conversation.id,
    }
  }, [session, conversation])

  // Calculate if there are unselected possibilities
  const hasUnselectedPossibilities = useMemo(() => {
    // Check if there are saved possibilities that haven't been selected
    const lastMessage = messages[messages.length - 1]
    return (
      messages.length > 0 &&
      lastMessage?.role === 'assistant' &&
      lastMessage?.possibilities &&
      lastMessage.possibilities.length > 0 &&
      !lastMessage?.content
    )
  }, [messages])

  // Auto-redirect on error with toast notification
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        router.push('/')
      }, 2000) // Redirect after 2 seconds

      return () => clearTimeout(timer)
    }
  }, [error, router])

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
          <div className="text-sm text-[#999] mb-4">
            Redirecting to home page...
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="w-6 h-6 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#667eea] text-white rounded-lg hover:bg-[#5a6fd8] transition-colors"
          >
            Go to Home Now
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
          <div className="text-sm text-[#999] mb-4">
            Redirecting to home page...
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="w-6 h-6 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#667eea] text-white rounded-lg hover:bg-[#5a6fd8] transition-colors"
          >
            Go to Home Now
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
        onTitleClick={handleTitleClick}
        onPublishConversation={
          conversation?.creatorId === session?.user?.id
            ? handlePublishConversation
            : undefined
        }
        // Shared conversation mode - disable live possibilities
        isGenerating={false}
        disableLivePossibilities={true}
        hasUnselectedPossibilities={hasUnselectedPossibilities}
      />
    </div>
  )
}
