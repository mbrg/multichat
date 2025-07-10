import React, { useState, useEffect, useRef } from 'react'

export interface ShareMenuProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
  conversationId: string
  onUndo: () => Promise<void>
}

export const ShareMenu: React.FC<ShareMenuProps> = ({
  isOpen,
  onClose,
  shareUrl,
  conversationId,
  onUndo,
}) => {
  const [isCopying, setIsCopying] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [showCopiedIndicator, setShowCopiedIndicator] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleCopyUrl = async () => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowCopiedIndicator(true)
      setTimeout(() => {
        setShowCopiedIndicator(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    } finally {
      setIsCopying(false)
    }
  }

  const handleNativeShare = async () => {
    if (isSharing) return // Prevent multiple concurrent share operations

    if (navigator.share) {
      setIsSharing(true)
      try {
        await navigator.share({
          text: 'Check out this conversation',
          url: shareUrl,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      } finally {
        setIsSharing(false)
      }
    } else {
      // Fallback - just copy URL
      await handleCopyUrl()
    }
  }

  const handleUndo = async () => {
    setIsUndoing(true)
    try {
      await onUndo()
      onClose()
    } catch (error) {
      console.error('Failed to undo share:', error)
    } finally {
      setIsUndoing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={menuRef}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#e0e0e0] mb-2">
            Conversation Shared!
          </h3>
          <p className="text-sm text-[#999] mb-4">
            Your conversation is now public and can be accessed by anyone with
            the link.
          </p>

          {/* Share URL Display */}
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 mb-4 break-all">
            <p className="text-xs text-[#666] mb-1">Share URL:</p>
            <p className="text-sm text-[#e0e0e0] font-mono">{shareUrl}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Copy URL Button */}
          <button
            onClick={handleCopyUrl}
            disabled={isCopying}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {showCopiedIndicator ? 'Copied!' : 'Copy Share URL'}
          </button>

          {/* Native Share Button */}
          <button
            onClick={handleNativeShare}
            disabled={isSharing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2a2a2a] text-[#e0e0e0] rounded-lg hover:bg-[#3a3a3a] disabled:opacity-50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            {isSharing ? 'Sharing...' : 'Share'}
          </button>

          {/* Undo Share Button */}
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] text-[#ff6b6b] border border-[#ff6b6b] rounded-lg hover:bg-[#ff6b6b] hover:text-white disabled:opacity-50 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {isUndoing ? 'Undoing...' : 'Undo Share'}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-[#999] hover:text-[#e0e0e0] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareMenu
