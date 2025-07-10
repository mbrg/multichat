import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ChatContainer from './ChatContainer'
import type { Message, Attachment } from '../types/chat'
import type { PossibilityResponse } from '../types/api'
import { useSettings } from '../hooks/useSettings'
import { useApiKeys } from '../hooks/useApiKeys'
import { useConversationCount } from '../hooks/useConversationCount'

const ChatDemo: React.FC = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<Message | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [getCompletedPossibilities, setGetCompletedPossibilities] = useState<
    (() => any[]) | null
  >(null)
  const [clearPossibilities, setClearPossibilities] = useState<
    (() => void) | null
  >(null)
  const {
    settings,
    loading: settingsLoading,
    refresh: refreshSettings,
  } = useSettings()
  const {
    hasApiKey,
    isProviderEnabled,
    enabledProviders,
    isLoading: apiKeysLoading,
  } = useApiKeys(refreshSettings)
  const { hasReachedLimit, refresh: refreshConversationCount } =
    useConversationCount()

  const [isGenerating, setIsGenerating] = useState(false)

  // Check if system is ready for messaging
  const isSystemReady = useCallback(() => {
    if (settingsLoading || !settings) return false

    const enabledProviderKeys = Object.keys(enabledProviders || {}).filter(
      (key) => enabledProviders?.[key as keyof typeof enabledProviders]
    ) as (keyof typeof enabledProviders)[]

    if (enabledProviderKeys.length === 0) return false

    const missingKeys = enabledProviderKeys.filter(
      (provider) => !hasApiKey(provider)
    )

    return missingKeys.length === 0
  }, [settingsLoading, settings, enabledProviders, hasApiKey])

  // Check if there are active possibilities being generated or completed ones waiting for selection
  const hasActivePossibilities = useCallback(() => {
    // If we're currently generating, definitely block input
    if (isGenerating) return true

    // If there are completed possibilities that haven't been selected, block input
    if (getCompletedPossibilities) {
      const completedPossibilities = getCompletedPossibilities()
      if (completedPossibilities.length > 0) {
        // Check if there's an empty assistant message waiting for possibilities
        const hasEmptyAssistantMessage = messages.some(
          (msg) =>
            msg.role === 'assistant' &&
            (!msg.content || msg.content.trim() === '')
        )
        return hasEmptyAssistantMessage
      }
    }

    return false
  }, [isGenerating, getCompletedPossibilities, messages])

  // Update messages when using new streaming system
  useEffect(() => {
    if (!currentAssistantMessage) return

    // For the new system, we'll handle possibilities directly through the VirtualizedPossibilitiesPanel
    // No need to inject them into the message object
  }, [currentAssistantMessage])

  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      // Wait for settings to load
      if (settingsLoading || !settings) {
        console.error('Settings not loaded')
        return
      }

      // Validate API keys before allowing message submission
      const enabledProviderKeys = Object.keys(enabledProviders || {}).filter(
        (key) => enabledProviders?.[key as keyof typeof enabledProviders]
      ) as (keyof typeof enabledProviders)[]

      // Check if any providers are enabled and have API keys
      if (enabledProviderKeys.length === 0) {
        console.log('No providers enabled')
        return
      }

      const missingKeys = enabledProviderKeys.filter(
        (provider) => !hasApiKey(provider)
      )

      if (missingKeys.length > 0) {
        console.log('Missing API keys for providers:', missingKeys)
        return
      }

      // Check if there are unselected possibilities that need attention first
      if (hasActivePossibilities()) {
        console.log('Please select a possibility before sending a new message')
        return
      }

      // Add user message immediately
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        attachments,
      }

      setMessages((prev) => [...prev, userMessage])

      // Create initial assistant message placeholder
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '', // Empty content - we only show possibilities
        timestamp: new Date(),
        possibilities: [],
      }

      setCurrentAssistantMessage(assistantMessage)
      setMessages((prev) => [...prev, assistantMessage])

      try {
        setIsGenerating(true)
        // The new VirtualizedPossibilitiesPanel will handle streaming automatically
      } catch (error) {
        console.error('Error generating response:', error)
        setIsGenerating(false)
      }
    },
    [
      settings,
      settingsLoading,
      enabledProviders,
      hasApiKey,
      hasActivePossibilities,
    ]
  )

  const handleSelectPossibility = useCallback(
    (userMessage: Message, selectedPossibility: Message) => {
      setMessages((prevMessages) => {
        // In the new independent streaming system, find the most recent assistant message
        // that has empty content (this is the placeholder for possibilities)
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

        // Stop generating since user made a selection
        setIsGenerating(false)

        // Clear other possibilities from tracking system
        if (clearPossibilities) {
          clearPossibilities()
        }

        return newMessages
      })
    },
    [clearPossibilities]
  )

  const handleContinuePossibility = useCallback(
    async (selectedPossibility: Message) => {
      if (settingsLoading || !settings) {
        console.error('Settings not loaded')
        return
      }

      try {
        // First, select the possibility as the current response
        handleSelectPossibility(selectedPossibility, selectedPossibility)

        // For now, continuation will be handled by the new system
        // TODO: Implement continuation in the new streaming architecture
        console.log('Continuation requested for:', selectedPossibility.id)
      } catch (error) {
        console.error('Error continuing possibility:', error)
      }
    },
    [settings, settingsLoading, handleSelectPossibility]
  )

  // Handle publishing conversation
  const handlePublishConversation = useCallback(async () => {
    if (!session?.user) {
      console.error('Must be authenticated to publish conversation')
      return
    }

    if (messages.length === 0) {
      console.error('Cannot publish empty conversation')
      return
    }

    if (hasReachedLimit) {
      console.error('Maximum number of conversations reached')
      alert(
        'You have reached the maximum number of saved conversations (100). Please delete some conversations to save new ones.'
      )
      return
    }

    try {
      setIsPublishing(true)

      // Extract possibilities from the current conversation
      // Only include possibilities if there are unselected possibilities (assistant messages with empty content)
      const hasUnselectedPossibilities = (() => {
        // Check if there are completed possibilities available
        const completedPossibilities = getCompletedPossibilities
          ? getCompletedPossibilities()
          : []
        if (completedPossibilities.length === 0) return false

        // Check if there's an empty assistant message waiting for selection
        return messages.some(
          (msg) =>
            msg.role === 'assistant' &&
            (!msg.content || msg.content.trim() === '')
        )
      })()

      const possibilities: PossibilityResponse[] = hasUnselectedPossibilities
        ? getCompletedPossibilities
          ? getCompletedPossibilities()
          : []
        : []

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          possibilities,
          metadata: {},
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.error?.includes('Maximum number of conversations reached')) {
          alert(
            'You have reached the maximum number of saved conversations (100). Please delete some conversations to save new ones.'
          )
          // Refresh the conversation count
          await refreshConversationCount()
          return
        }
        throw new Error(`Failed to publish: ${response.statusText}`)
      }

      const result = await response.json()

      // Refresh the conversation count after successful save
      await refreshConversationCount()

      return result
    } catch (error) {
      console.error('Error publishing conversation:', error)
      throw error
    } finally {
      setIsPublishing(false)
    }
  }, [
    session,
    messages,
    getCompletedPossibilities,
    hasReachedLimit,
    refreshConversationCount,
  ])

  // Handle title click (go to home)
  const handleTitleClick = useCallback(() => {
    router.push('/')
  }, [router])

  return (
    <ChatContainer
      messages={messages}
      onSendMessage={handleSendMessage}
      onSelectPossibility={handleSelectPossibility}
      onContinuePossibility={handleContinuePossibility}
      isLoading={isGenerating}
      disabled={!isSystemReady()}
      className="h-[100dvh]"
      settingsLoading={settingsLoading}
      apiKeysLoading={apiKeysLoading}
      onPublishConversation={handlePublishConversation}
      onTitleClick={handleTitleClick}
      isGenerating={isGenerating}
      isPublishing={isPublishing}
      onPossibilitiesFinished={() => setIsGenerating(false)}
      onPossibilitiesChange={(getCompletedPossibilitiesFn) =>
        setGetCompletedPossibilities(() => getCompletedPossibilitiesFn)
      }
      onClearPossibilities={(clearFn) => setClearPossibilities(() => clearFn)}
      hasUnselectedPossibilities={hasActivePossibilities()}
      hasReachedConversationLimit={hasReachedLimit}
    />
  )
}

export default ChatDemo
