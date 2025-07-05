import React, { useState } from 'react'
import { Share2Icon } from 'lucide-react'
import type { Message } from '../types/chat'

interface ShareInfo {
  id: string
  url: string
}

interface PublishButtonProps {
  messages: Message[]
  disabled: boolean
}

const PublishButton: React.FC<PublishButtonProps> = ({
  messages,
  disabled,
}) => {
  const [state, setState] = useState<'idle' | 'publishing' | 'menu'>('idle')
  const [share, setShare] = useState<ShareInfo | null>(null)

  const handleClick = async () => {
    if (disabled) return
    setState('publishing')
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, possibilities: [] }),
      })
      const data = await res.json()
      const url = `${window.location.origin}/conversation/${data.id}`
      setShare({ id: data.id, url })
      setState('menu')
      if (navigator.share) {
        navigator.share({ url }).catch(() => {})
      }
    } catch {
      setState('idle')
    }
  }

  const className =
    'p-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50 transition-transform hover:scale-105 hover:shadow-lg'

  return (
    <div className="relative">
      <button
        disabled={disabled || state === 'publishing'}
        onClick={handleClick}
        className={className}
        aria-label="Publish conversation"
      >
        {state === 'publishing' ? (
          <span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></span>
        ) : (
          <Share2Icon className="w-4 h-4" />
        )}
      </button>
      {state === 'menu' && share && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg p-2 z-50 text-sm space-y-2">
          <div>This conversation is now public.</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(share.url)
              }}
              className="px-2 py-1 bg-[#333] rounded"
            >
              Copy URL
            </button>
            <button onClick={() => setState('idle')} className="px-2">
              x
            </button>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://bsky.app/intent/compose?text=${encodeURIComponent(share.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Bluesky
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              LinkedIn
            </a>
          </div>
          <hr className="border-[#333]" />
          <button
            onClick={async () => {
              await fetch(`/api/conversations/${share.id}`, {
                method: 'DELETE',
              })
              setState('idle')
            }}
            className="text-red-500"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

export default PublishButton
