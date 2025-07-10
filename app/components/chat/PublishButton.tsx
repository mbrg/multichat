import React, { useState } from 'react'
import { ShareMenu } from './ShareMenu'

export interface PublishButtonProps {
  onPublish: () => Promise<{ url: string; id: string } | void>
  disabled?: boolean
  isLoading?: boolean
  hasMessages: boolean
  isGenerating: boolean
  hasReachedLimit?: boolean
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  onPublish,
  disabled = false,
  isLoading = false,
  hasMessages,
  isGenerating,
  hasReachedLimit = false,
}) => {
  const [showCopiedIndicator, setShowCopiedIndicator] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareData, setShareData] = useState<{
    url: string
    id: string
  } | null>(null)

  const isDisabled =
    disabled || !hasMessages || isGenerating || isLoading || hasReachedLimit

  const handlePublish = async () => {
    if (isDisabled) return

    try {
      const result = await onPublish()

      if (result?.url && result?.id) {
        // Set share data and show share menu
        setShareData({ url: result.url, id: result.id })
        setShowShareMenu(true)
      }
    } catch (error) {
      console.error('Failed to publish conversation:', error)
    }
  }

  const handleUndo = async () => {
    if (!shareData?.id) return

    try {
      const response = await fetch(`/api/conversations/${shareData.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      // Close share menu and reset state
      setShowShareMenu(false)
      setShareData(null)
    } catch (error) {
      console.error('Failed to undo share:', error)
      throw error // Re-throw so ShareMenu can handle the error
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={handlePublish}
          disabled={isDisabled}
          className="flex items-center justify-center p-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(102,126,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:transform-none disabled:hover:shadow-none -webkit-tap-highlight-color-transparent"
          aria-label="Publish conversation"
          title={
            disabled
              ? 'Sign in to publish conversations'
              : hasReachedLimit
                ? 'Maximum number of conversations reached (100). Delete some to save new ones.'
                : !hasMessages
                  ? 'Add messages to publish conversation'
                  : isGenerating
                    ? 'Wait for possibilities to finish generating'
                    : 'Publish conversation and share'
          }
        >
          {isLoading ? (
            <>
              <svg
                className="w-4 h-4 mr-1 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-sm">Publishing...</span>
            </>
          ) : (
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
          )}
        </button>

        {/* Copied indicator */}
        {showCopiedIndicator && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-[#333] text-white text-xs px-2 py-1 rounded shadow-lg animate-fadeInOut">
            Copied!
          </div>
        )}
      </div>

      {/* Share Menu */}
      {shareData && (
        <ShareMenu
          isOpen={showShareMenu}
          onClose={() => setShowShareMenu(false)}
          shareUrl={shareData.url}
          conversationId={shareData.id}
          onUndo={handleUndo}
        />
      )}
    </>
  )
}

export default PublishButton
