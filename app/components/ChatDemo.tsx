'use client'
import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatContainer from './ChatContainer'
import type { Message, Attachment } from '../types/chat'
import { useSettings } from '../hooks/useSettings'
import { useApiKeys } from '../hooks/useApiKeys'

interface ChatDemoProps {
  initialMessages?: Message[]
}

const ChatDemo: React.FC<ChatDemoProps> = ({ initialMessages = [] }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<Message | null>(null)
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

  // Check if there are active possibilities being generated
  const hasActivePossibilities = useCallback(() => {
    // With the new system, check if we're currently generating
    return isGenerating
  }, [isGenerating])

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
    [settings, settingsLoading, enabledProviders, hasApiKey]
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

        return newMessages
      })
    },
    []
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

  const router = useRouter()

  const handlePublishConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      if (!res.ok) return
      const data = await res.json()
      const url = `${window.location.origin}/conversation/${data.id}`
      await navigator.clipboard.writeText(url)
      router.push(`/conversation/${data.id}`)
    } catch (error) {
      console.error('Failed to publish conversation', error)
    }
  }, [messages, router])

  return (
    <ChatContainer
      messages={messages}
      onSendMessage={handleSendMessage}
      onSelectPossibility={handleSelectPossibility}
      onContinuePossibility={handleContinuePossibility}
      onPublishConversation={handlePublishConversation}
      publishDisabled={messages.length === 0 || isGenerating}
      isLoading={isGenerating}
      disabled={!isSystemReady() || hasActivePossibilities()}
      className="h-[100dvh]"
      settingsLoading={settingsLoading}
      apiKeysLoading={apiKeysLoading}
    />
  )
}

export default ChatDemo
