import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import type { ChatContainerProps, Message as MessageType } from '../types/chat'
import { useAuthPopup } from '../hooks/useAuthPopup'
import {
  ChatHeader,
  AuthenticationBanner,
  MessagesList,
  MessageInputContainer,
  ModalContainer,
} from './chat'

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  onSelectPossibility,
  onContinuePossibility,
  isLoading = false,
  disabled = false,
  className = '',
  settingsLoading = false,
  apiKeysLoading = false,
  onPublishConversation,
  onTitleClick,
  isGenerating = false,
  isPublishing = false,
  onPossibilitiesFinished,
  onPossibilitiesChange,
  onClearPossibilities,
  disableLivePossibilities = false,
  hasUnselectedPossibilities = false,
  hasReachedConversationLimit = false,
}) => {
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState<
    | 'api-keys'
    | 'system-instructions'
    | 'temperatures'
    | 'models'
    | 'generation'
    | 'conversations'
    | undefined
  >()

  // Track user interaction for conditional auth warning
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Auth state
  const { isPopupOpen, closePopup } = useAuthPopup()
  const { data: session } = useSession()
  const isAuthenticated = Boolean(session?.user)

  // Event handlers
  const handleOpenSettings = (
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'generation'
      | 'conversations'
  ) => {
    setSettingsSection(section)
    setShowSettings(true)
  }

  const handleCloseSettings = () => {
    setShowSettings(false)
    setSettingsSection(undefined)
  }

  // Default handlers for optional props
  const handlePublishConversation = onPublishConversation
  const handleTitleClick = onTitleClick || (() => {})

  // Track user interaction
  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }
  }

  return (
    <div
      className={`flex flex-col h-full bg-[#0a0a0a] ${className}`}
      onClick={handleUserInteraction}
    >
      <ChatHeader
        onOpenSettings={handleOpenSettings}
        onPublishConversation={handlePublishConversation}
        onTitleClick={handleTitleClick}
        hasMessages={messages.length > 0}
        isGenerating={isGenerating}
        isPublishing={isPublishing}
        isAuthenticated={isAuthenticated}
        hasReachedConversationLimit={hasReachedConversationLimit}
      />

      <AuthenticationBanner
        disabled={disabled}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        messages={messages}
        settingsLoading={settingsLoading}
        apiKeysLoading={apiKeysLoading}
        hasUserInteracted={hasUserInteracted}
      />

      <MessagesList
        messages={messages}
        onSelectPossibility={onSelectPossibility}
        onContinuePossibility={onContinuePossibility}
        onPossibilitiesFinished={onPossibilitiesFinished}
        onPossibilitiesChange={onPossibilitiesChange}
        onClearPossibilities={onClearPossibilities}
        disableLivePossibilities={disableLivePossibilities}
      />

      <MessageInputContainer
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        disabled={disabled}
        isAuthenticated={isAuthenticated}
        messages={messages}
        settingsLoading={settingsLoading}
        apiKeysLoading={apiKeysLoading}
        hasUnselectedPossibilities={hasUnselectedPossibilities}
      />

      <ModalContainer
        showSettings={showSettings}
        settingsSection={settingsSection}
        onCloseSettings={handleCloseSettings}
        showAuthPopup={isPopupOpen}
        onCloseAuthPopup={closePopup}
      />
    </div>
  )
}

export default ChatContainer
