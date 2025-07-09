'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthPopup } from '../hooks/useAuthPopup'
import AuthPopup from './AuthPopup'
import { ConversationMetadata } from '../types/conversation'
import { formatDistanceToNow } from 'date-fns'

interface ConversationItemProps {
  conversation: ConversationMetadata
  onTitleChange: (id: string, newTitle: string) => void
  onDelete: (id: string) => void
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onTitleChange,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(conversation.title || '')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    if (title.trim() && title !== conversation.title) {
      await onTitleChange(conversation.id, title.trim())
    } else {
      setTitle(conversation.title)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(conversation.title || '')
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(conversation.id)
    } catch (error) {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition-colors">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 240))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-sm text-[#e0e0e0] focus:outline-none focus:border-[#4a4a4a]"
              autoFocus
              maxLength={240}
            />
            <button
              onClick={handleSave}
              className="p-1 text-green-400 hover:text-green-300 transition-colors"
              title="Save"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-[#888] hover:text-[#aaa] transition-colors"
              title="Cancel"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-[#e0e0e0] truncate">
              {conversation.title || 'Untitled Conversation'}
            </h3>
            <p className="text-xs text-[#888]">
              {formatDistanceToNow(new Date(conversation.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <a
          href={`/conversation/${conversation.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-[#888] hover:text-[#e0e0e0] transition-colors"
          title="Open conversation"
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 text-[#888] hover:text-[#e0e0e0] transition-colors"
          title="Edit title"
          disabled={isEditing}
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-red-400 hover:text-red-300 transition-colors"
          title="Delete conversation"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 animate-spin rounded-full" />
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

const ConversationsPanel: React.FC = () => {
  const { data: session, status } = useSession()
  const { isPopupOpen, checkAuthAndRun, closePopup } = useAuthPopup()
  const [conversations, setConversations] = useState<ConversationMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [maxCount, setMaxCount] = useState(100)

  const fetchConversations = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/conversations/list')
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }
      const data = await response.json()
      setConversations(data.conversations || [])
      setCount(data.count || 0)
      setMaxCount(data.maxCount || 100)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = async (id: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/manage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!response.ok) {
        throw new Error('Failed to update title')
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, title: newTitle } : conv
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update title')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/manage/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }
      setConversations((prev) => prev.filter((conv) => conv.id !== id))
      setCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete conversation'
      )
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-[#888] mb-4">Sign in to manage your conversations</p>
        <button
          onClick={() => checkAuthAndRun(() => {})}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Sign In
        </button>
        <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[#e0e0e0]">
            Shared Conversations
          </h3>
          <span className="text-sm text-[#888]">
            {count}/{maxCount}
          </span>
        </div>
        <p className="text-sm text-[#888]">
          Edit titles or delete conversations
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="mb-4 p-3 bg-[#2a2a2a] rounded-lg">
        <div className="flex items-center gap-2 text-xs text-[#888]">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            />
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22" />
          </svg>
          <span>Conversations not stored unless shared</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-8 text-[#888]">
          <p>No shared conversations yet</p>
          <p className="text-sm mt-2">Share a conversation to see it here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              onTitleChange={handleTitleChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {count >= maxCount && (
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg text-amber-400 text-sm">
          You&apos;ve reached the maximum number of saved conversations (
          {maxCount}). Delete some conversations to save new ones.
        </div>
      )}
    </div>
  )
}

export default ConversationsPanel
