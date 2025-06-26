import React, { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { ChatContainerProps, Message as MessageType } from '../types/chat'
import MessageWithIndependentPossibilities from './MessageWithIndependentPossibilities'
import MessageInput from './MessageInput'
import Settings from './Settings'
import AuthPopup from './AuthPopup'
import Menu from './Menu'
import { useAuthPopup } from '../hooks/useAuthPopup'

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  onSelectPossibility,
  onContinuePossibility,
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState<
    'api-keys' | 'system-instructions' | 'temperatures' | undefined
  >()
  const { isPopupOpen, closePopup } = useAuthPopup()
  const { data: session } = useSession()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectPossibility = (
    userMessage: MessageType,
    possibility: MessageType
  ) => {
    // The userMessage and possibility are now provided directly by the component
    onSelectPossibility?.(userMessage, possibility)
  }

  const handleContinuePossibility = (possibility: MessageType) => {
    onContinuePossibility?.(possibility)
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

      {/* API Keys Required Message */}
      {disabled && !isLoading && !session?.user && (
        <div className="px-4 py-2 bg-amber-900/20 border-b border-[#2a2a2a]">
          <div className="max-w-[800px] mx-auto">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span>⚠️</span>
              <span>Sign in to save and manage your API keys securely.</span>
            </div>
          </div>
        </div>
      )}
      {/* Show API keys warning only when no API keys are configured and not when possibilities are active */}
      {disabled &&
        !isLoading &&
        session?.user &&
        !(
          messages.length > 0 &&
          messages[messages.length - 1]?.role === 'assistant' &&
          messages[messages.length - 1]?.possibilities &&
          messages[messages.length - 1].possibilities!.length > 0 &&
          !messages[messages.length - 1]?.content
        ) && (
          <div className="px-4 py-2 bg-amber-900/20 border-b border-[#2a2a2a]">
            <div className="max-w-[800px] mx-auto">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <span>⚠️</span>
                <span>
                  Configure API keys in the settings menu to start chatting with
                  AI models.
                </span>
              </div>
            </div>
          </div>
        )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-4 -webkit-overflow-scrolling-touch">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#888]">
            <p className="text-lg">Start a conversation...</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageWithIndependentPossibilities
              key={message.id}
              message={message}
              onSelectPossibility={handleSelectPossibility}
              onContinuePossibility={handleContinuePossibility}
              className="max-w-[800px] w-full self-center animate-fadeIn"
              showPossibilities={
                message.role === 'assistant' && !message.content
              }
              conversationMessages={messages}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <div className="max-w-[800px] mx-auto">
          <MessageInput
            onSendMessage={onSendMessage}
            disabled={isLoading || disabled}
            placeholder={
              isLoading
                ? 'Generating response...'
                : disabled
                  ? !session?.user
                    ? 'Sign in to start chatting...'
                    : messages.length > 0 &&
                        messages[messages.length - 1]?.role === 'assistant' &&
                        messages[messages.length - 1]?.possibilities &&
                        messages[messages.length - 1].possibilities!.length >
                          0 &&
                        !messages[messages.length - 1]?.content
                      ? 'Select a possibility to continue...'
                      : 'Configure API keys in settings...'
                  : 'Type message...'
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
