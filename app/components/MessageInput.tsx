import React, { useState, useRef, useCallback } from 'react'
import type { MessageInputProps } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'
import AuthPopup from './AuthPopup'
import { useAuthPopup } from '../hooks/useAuthPopup'
import { useFileUpload } from '../hooks/useFileUpload'

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  className = '',
}) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isPopupOpen, checkAuthAndRun, closePopup } = useAuthPopup()

  const {
    attachments,
    isDragOver,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    clearAttachments,
  } = useFileUpload()

  // Supported file types for the file input
  const SUPPORTED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'application/pdf',
    'text/plain',
    'application/msword',
  ]

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (message.trim() || attachments.length > 0) {
        checkAuthAndRun(() => {
          onSendMessage(
            message.trim(),
            attachments.length > 0 ? attachments : undefined
          )
          setMessage('')
          clearAttachments()
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
        })
      }
    },
    [message, attachments, onSendMessage, checkAuthAndRun, clearAttachments]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)

      // Auto-resize textarea
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    },
    []
  )

  return (
    <div className={`${className}`}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
              className="max-w-xs"
            />
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`flex items-end gap-3 border border-[#2a2a2a] rounded-lg transition-colors ${
            isDragOver
              ? 'border-[#667eea] bg-[#0a0a0a]'
              : 'bg-[#0a0a0a] hover:border-[#3a3a3a] focus-within:border-[#667eea]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-2 text-[#666] hover:text-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors -webkit-tap-highlight-color-transparent"
            aria-label="Attach file"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent border-none outline-none text-[#e0e0e0] placeholder-[#666] disabled:cursor-not-allowed min-h-[24px] max-h-[120px] p-3"
            rows={1}
          />

          {/* Send Button */}
          <button
            type="submit"
            
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            className="flex-shrink-0 p-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(102,126,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:transform-none disabled:hover:shadow-none -webkit-tap-highlight-color-transparent"
            aria-label="Send message"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_FILE_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Drag and Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-[#0a0a0a] bg-opacity-90 border-2 border-dashed border-[#667eea] rounded-lg flex items-center justify-center">
            <div className="text-[#667eea] text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="font-medium">Drop files here to attach</p>
            </div>
          </div>
        )}
      </form>

      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default MessageInput
