import { useState, useCallback, useMemo } from 'react'
import type { Attachment } from '../types/chat'

export interface UseFileUploadOptions {
  maxFileSize?: number
  maxAudioSize?: number
  supportedTypes?: string[]
}

export interface UseFileUploadReturn {
  attachments: Attachment[]
  isDragOver: boolean
  processFile: (file: File) => Promise<Attachment | null>
  handleFileSelect: (files: FileList | null) => Promise<void>
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  removeAttachment: (attachmentId: string) => void
  clearAttachments: () => void
}

const DEFAULT_SUPPORTED_TYPES = [
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

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Hook for handling file uploads with drag and drop support
 * Follows Single Responsibility Principle - only handles file upload logic
 */
export const useFileUpload = (
  options: UseFileUploadOptions = {}
): UseFileUploadReturn => {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxAudioSize = DEFAULT_MAX_AUDIO_SIZE,
    supportedTypes = DEFAULT_SUPPORTED_TYPES,
  } = options

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const SUPPORTED_FILE_TYPES = useMemo(() => supportedTypes, [supportedTypes])

  const processFile = useCallback(
    async (file: File): Promise<Attachment | null> => {
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.type}`)
        return null
      }

      const maxSize = file.type.startsWith('audio/')
        ? maxAudioSize
        : maxFileSize
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
            preview: file.type.startsWith('image/') ? data : undefined,
          }
          resolve(attachment)
        }
        reader.readAsDataURL(file)
      })
    },
    [SUPPORTED_FILE_TYPES, maxAudioSize, maxFileSize]
  )

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return

      const newAttachments: Attachment[] = []
      for (let i = 0; i < files.length; i++) {
        const attachment = await processFile(files[i])
        if (attachment) {
          newAttachments.push(attachment)
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments])
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== attachmentId))
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  return {
    attachments,
    isDragOver,
    processFile,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    clearAttachments,
  }
}
