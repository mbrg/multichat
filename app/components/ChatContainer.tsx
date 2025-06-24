import React, { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { ChatContainerProps, Message as MessageType } from '../types/chat'
import Message from './Message'
import MessageInput from './MessageInput'
import Settings from './Settings'
import AuthPopup from './AuthPopup'
import Menu from './Menu'
import { useAuthPopup } from '../hooks/useAuthPopup'

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  onSelectPossibility,
  isLoading = false,
  className = '',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState<
    'api-keys' | 'system-instructions' | 'temperatures' | undefined
  >()
  const { isPopupOpen, closePopup } = useAuthPopup()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectPossibility = (possibility: MessageType) => {
    // Find the user message that corresponds to this assistant message with possibilities
    const currentMessageIndex = messages.findIndex(
      (msg) =>
        msg.role === 'assistant' &&
        msg.possibilities?.some((p) => p.id === possibility.id)
    )

    if (currentMessageIndex > 0) {
      const userMessage = messages[currentMessageIndex - 1]
      onSelectPossibility?.(userMessage, possibility)
    }
  }

  return (
    <div className={`flex flex-col h-full bg-[#0a0a0a] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
        <div className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Infinite Chat
        </div>
        <Menu
          onOpenSettings={(section) => {
            setSettingsSection(section)
            setShowSettings(true)
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-4 -webkit-overflow-scrolling-touch">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#888]">
            <p className="text-lg">Start a conversation...</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              onSelectPossibility={handleSelectPossibility}
              className="max-w-[800px] w-full self-center animate-fadeIn"
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <div className="max-w-[800px] mx-auto">
          <MessageInput
            onSendMessage={onSendMessage}
            disabled={isLoading}
            placeholder={
              isLoading
                ? 'Generating response...'
                : 'Start typing to see possibilities...'
            }
            className="bg-[#0a0a0a] border-[#2a2a2a] text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea]"
          />
        </div>
      </div>

      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
          setSettingsSection(undefined)
        }}
        initialSection={settingsSection}
      />

      {/* Auth Popup */}
      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default ChatContainer
