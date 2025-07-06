import React, { useState } from 'react'

export interface PublishButtonProps {
  onPublish: () => Promise<{ url: string } | void>
  disabled?: boolean
  isLoading?: boolean
  hasMessages: boolean
  isGenerating: boolean
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  onPublish,
  disabled = false,
  isLoading = false,
  hasMessages,
  isGenerating,
}) => {
  const [showCopiedIndicator, setShowCopiedIndicator] = useState(false)

  const isDisabled = disabled || !hasMessages || isGenerating || isLoading

  const handlePublish = async () => {
    if (isDisabled) return

    try {
      const result = await onPublish()

      if (result?.url) {
        // Copy URL to clipboard with fallback
        try {
          await navigator.clipboard.writeText(result.url)
          
          // Show copied indicator
          setShowCopiedIndicator(true)
          setTimeout(() => {
            setShowCopiedIndicator(false)
          }, 2000)
        } catch (clipboardError) {
          // Fallback for clipboard access denied
          console.warn('Clipboard access denied, using fallback', clipboardError)
          
          // Create a temporary input element
          const input = document.createElement('input')
          input.value = result.url
          input.style.position = 'fixed'
          input.style.opacity = '0'
          document.body.appendChild(input)
          input.select()
          
          try {
            document.execCommand('copy')
            
            // Show copied indicator
            setShowCopiedIndicator(true)
            setTimeout(() => {
              setShowCopiedIndicator(false)
            }, 2000)
          } catch (fallbackError) {
            console.error('Failed to copy URL:', fallbackError)
            // Could show an error message to the user here
          } finally {
            document.body.removeChild(input)
          }
        }
      }
    } catch (error) {
      console.error('Failed to publish conversation:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handlePublish}
        disabled={isDisabled}
        className="flex items-center justify-center p-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(102,126,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:transform-none disabled:hover:shadow-none -webkit-tap-highlight-color-transparent"
        aria-label="Publish conversation"
        title={
          !hasMessages
            ? 'Add messages to publish conversation'
            : isGenerating
              ? 'Wait for possibilities to finish generating'
              : 'Publish conversation and copy share link'
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
  )
}

export default PublishButton
