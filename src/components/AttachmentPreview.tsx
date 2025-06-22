import React from 'react'
import type { AttachmentPreviewProps } from '../types/chat'

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  onRemove,
  className = ''
}) => {
  const isImage = attachment.type.startsWith('image/')
  const isAudio = attachment.type.startsWith('audio/')
  const isDocument = attachment.type.includes('pdf') || attachment.type.includes('document') || attachment.type.includes('text')

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = () => {
    if (isImage) return '🖼️'
    if (isAudio) return '🎵'
    if (isDocument) return '📄'
    return '📎'
  }

  return (
    <div className={`relative group ${className}`}>
      {isImage && attachment.preview ? (
        <div className="relative">
          <img
            src={attachment.preview}
            alt={attachment.name}
            className="rounded-lg max-h-48 object-cover"
          />
          {onRemove && (
            <button
              onClick={() => onRemove(attachment.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove attachment"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
          <div className="text-2xl">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {attachment.name}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(attachment.size)}
            </div>
          </div>
          {onRemove && (
            <button
              onClick={() => onRemove(attachment.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Remove attachment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AttachmentPreview