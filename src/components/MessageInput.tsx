import React, { useState, useRef, useCallback, useMemo } from 'react'
import type { MessageInputProps, Attachment } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  className = ''
}) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const SUPPORTED_FILE_TYPES = useMemo(() => [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mp3', 'audio/wav', 'audio/webm',
    'application/pdf', 'text/plain', 'application/msword'
  ], [])

  const MAX_FILE_SIZE = useMemo(() => 10 * 1024 * 1024, []) // 10MB for images
  const MAX_AUDIO_SIZE = useMemo(() => 25 * 1024 * 1024, []) // 25MB for audio

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined)
      setMessage('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [message, attachments, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const processFile = useCallback(async (file: File): Promise<Attachment | null> => {
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      alert(`Unsupported file type: ${file.type}`)
      return null
    }

    const maxSize = file.type.startsWith('audio/') ? MAX_AUDIO_SIZE : MAX_FILE_SIZE
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`)
      return null
    }

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result as string
        const attachment: Attachment = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          data: data.split(',')[1], // Remove data:mime;base64, prefix
          preview: file.type.startsWith('image/') ? data : undefined
        }
        resolve(attachment)
      }
      reader.readAsDataURL(file)
    })
  }, [SUPPORTED_FILE_TYPES, MAX_AUDIO_SIZE, MAX_FILE_SIZE])

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return

    const newAttachments: Attachment[] = []
    for (let i = 0; i < files.length; i++) {
      const attachment = await processFile(files[i])
      if (attachment) {
        newAttachments.push(attachment)
      }
    }
    
    setAttachments(prev => [...prev, ...newAttachments])
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }, [])

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
          className={`flex items-end gap-2 p-3 border-2 rounded-lg transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
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
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
            className="flex-1 resize-none bg-transparent border-none outline-none placeholder-gray-500 disabled:cursor-not-allowed min-h-[24px] max-h-[120px]"
            rows={1}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="font-medium">Drop files here to attach</p>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default MessageInput