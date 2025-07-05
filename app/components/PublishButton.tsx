import React, { useState } from 'react'
import { Share2Icon, CheckIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Message } from '../types/chat'

interface PublishButtonProps {
  messages: Message[]
  disabled: boolean
}

const PublishButton: React.FC<PublishButtonProps> = ({
  messages,
  disabled,
}) => {
  const [state, setState] = useState<'idle' | 'publishing' | 'success'>('idle')
  const router = useRouter()

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
      await navigator.clipboard.writeText(data.url)
      setState('success')
      setTimeout(() => setState('idle'), 2000)
      router.push(`/conversation/${data.id}`)
    } catch {
      setState('idle')
    }
  }

  const className =
    'p-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50 transition-transform hover:scale-105 hover:shadow-lg'

  return (
    <button
      disabled={disabled || state === 'publishing'}
      onClick={handleClick}
      className={className}
      aria-label="Publish conversation"
    >
      {state === 'publishing' && (
        <span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></span>
      )}
      {state === 'idle' && <Share2Icon className="w-4 h-4" />}
      {state === 'success' && (
        <CheckIcon className="w-4 h-4 animate-fadeInOut" />
      )}
    </button>
  )
}

export default PublishButton
