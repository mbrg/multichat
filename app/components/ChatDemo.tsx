import React, { useState, useCallback, useEffect } from 'react'
import ChatContainer from './ChatContainer'
import type { Message, Attachment } from '../types/chat'
import { useSettings } from '../hooks/useSettings'
import { useApiKeys } from '../hooks/useApiKeys'

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<Message | null>(null)
  const {
    settings,
    loading: settingsLoading,
    refresh: refreshSettings,
  } = useSettings()
  const { hasApiKey, isProviderEnabled, enabledProviders } =
    useApiKeys(refreshSettings)

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
    [
      settings,
      settingsLoading,
      enabledProviders,
      hasApiKey,
    ]
  )

  const handleSelectPossibility = useCallback(
    (_userMessage: Message, selectedPossibility: Message) => {
      setMessages((prevMessages) => {
        // Find the assistant message that contains this possibility
        const assistantMessageIndex = prevMessages.findIndex(
          (msg) =>
            msg.role === 'assistant' &&
            msg.possibilities?.some((p) => p.id === selectedPossibility.id)
        )

        if (assistantMessageIndex === -1) return prevMessages

        // Create new messages array
        const newMessages = [...prevMessages]

        // Replace the assistant message with the selected possibility (without possibilities)
        const fixedAssistantMessage: Message = {
          ...selectedPossibility,
          possibilities: undefined, // Remove possibilities to fix the selection
          isPossibility: false,
        }

        newMessages[assistantMessageIndex] = fixedAssistantMessage

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

  return (
    <ChatContainer
      messages={messages}
      onSendMessage={handleSendMessage}
      onSelectPossibility={handleSelectPossibility}
      onContinuePossibility={handleContinuePossibility}
      isLoading={isGenerating}
      disabled={!isSystemReady() || hasActivePossibilities()}
      className="h-screen"
    />
  )
}

export default ChatDemo
