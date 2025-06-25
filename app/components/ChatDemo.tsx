import React, { useState, useCallback, useEffect } from 'react'
import ChatContainer from './ChatContainer'
import type { Message, Attachment } from '../types/chat'
import { useAIChat } from '../hooks/useAIChat'
import { useSettings } from '../hooks/useSettings'
import { useApiKeys } from '../hooks/useApiKeys'

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<Message | null>(null)
  const { settings, loading: settingsLoading } = useSettings()
  const { hasApiKey, isProviderEnabled, enabledProviders } = useApiKeys()

  const {
    generatePossibilities,
    continuePossibility,
    possibilities,
    isGenerating,
    error,
    reset,
  } = useAIChat({
    onError: (error) => {
      console.error('AI Chat error:', error)
    },
  })

  // Check if system is ready for messaging
  const isSystemReady = useCallback(() => {
    if (settingsLoading || !settings) return false
    
    const enabledProviderKeys = Object.keys(enabledProviders).filter(
      key => enabledProviders[key as keyof typeof enabledProviders]
    ) as (keyof typeof enabledProviders)[]

    if (enabledProviderKeys.length === 0) return false

    const missingKeys = enabledProviderKeys.filter(provider => 
      !hasApiKey(provider)
    )

    return missingKeys.length === 0
  }, [settingsLoading, settings, enabledProviders, hasApiKey])

  // Update assistant message with new possibilities as they stream in
  useEffect(() => {
    if (currentAssistantMessage && possibilities.length > 0) {
      setCurrentAssistantMessage((prev) => {
        if (!prev) return null
        return {
          ...prev,
          possibilities,
        }
      })
    }
  }, [possibilities, currentAssistantMessage])

  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      // Wait for settings to load
      if (settingsLoading || !settings) {
        console.error('Settings not loaded')
        return
      }

      // Validate API keys before allowing message submission
      const enabledProviderKeys = Object.keys(enabledProviders).filter(
        key => enabledProviders[key as keyof typeof enabledProviders]
      ) as (keyof typeof enabledProviders)[]

      // Check if any providers are enabled and have API keys
      if (enabledProviderKeys.length === 0) {
        console.log('No providers enabled')
        return
      }

      const missingKeys = enabledProviderKeys.filter(provider => 
        !hasApiKey(provider)
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

      // Reset previous possibilities
      reset()

      try {
        // Generate AI response with possibilities
        await generatePossibilities([...messages, userMessage], settings)
      } catch (error) {
        console.error('Error generating response:', error)
      }
    },
    [messages, settings, settingsLoading, generatePossibilities, reset, enabledProviders, hasApiKey]
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

        // Then continue generating from that point
        await continuePossibility(
          [...messages, selectedPossibility],
          selectedPossibility.id,
          settings
        )
      } catch (error) {
        console.error('Error continuing possibility:', error)
      }
    },
    [
      messages,
      settings,
      settingsLoading,
      continuePossibility,
      handleSelectPossibility,
    ]
  )

  // Update messages when assistant message changes
  useEffect(() => {
    if (currentAssistantMessage) {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === currentAssistantMessage.id)
        if (index === -1) return prev

        const newMessages = [...prev]
        newMessages[index] = currentAssistantMessage
        return newMessages
      })
    }
  }, [currentAssistantMessage])

  return (
    <ChatContainer
      messages={messages}
      onSendMessage={handleSendMessage}
      onSelectPossibility={handleSelectPossibility}
      onContinuePossibility={handleContinuePossibility}
      isLoading={isGenerating}
      disabled={!isSystemReady()}
      className="h-screen"
    />
  )
}

export default ChatDemo
