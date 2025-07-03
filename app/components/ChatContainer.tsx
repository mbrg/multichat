import React, { useState, useRef } from 'react'
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
import { ShareButton } from './share'

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null!)
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState<
    | 'api-keys'
    | 'system-instructions'
    | 'temperatures'
    | 'models'
    | 'generation'
    | undefined
  >()

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
  ) => {
    setSettingsSection(section)
    setShowSettings(true)
  }

  const handleCloseSettings = () => {
    setShowSettings(false)
    setSettingsSection(undefined)
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-[#0a0a0a] ${className}`}
    >
      <ChatHeader
        onOpenSettings={handleOpenSettings}
        shareButton={
          <ShareButton containerRef={containerRef} messages={messages} />
        }
      />

      <AuthenticationBanner
        disabled={disabled}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        messages={messages}
        settingsLoading={settingsLoading}
        apiKeysLoading={apiKeysLoading}
      />

      <MessagesList
        messages={messages}
        onSelectPossibility={onSelectPossibility}
        onContinuePossibility={onContinuePossibility}
      />

      <MessageInputContainer
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        disabled={disabled}
        isAuthenticated={isAuthenticated}
        messages={messages}
        settingsLoading={settingsLoading}
        apiKeysLoading={apiKeysLoading}
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
