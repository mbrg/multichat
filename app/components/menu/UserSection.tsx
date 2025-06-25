'use client'
import React from 'react'
import Image from 'next/image'
import { Session } from 'next-auth'

interface UserSectionProps {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  onSignIn: (e: React.MouseEvent) => void
  onSignOut: (e: React.MouseEvent) => void
}

/**
 * User authentication section in menu
 * Shows user info when signed in, sign in button when not
 */
export const UserSection: React.FC<UserSectionProps> = ({
  session,
  status,
  onSignIn,
  onSignOut,
}) => {
  if (status === 'loading') {
    return (
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2a2a2a] rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-[#2a2a2a] rounded mb-1"></div>
            <div className="h-3 bg-[#2a2a2a] rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="p-4 border-b border-[#2a2a2a]">
        <button
          onClick={onSignIn}
          className="w-full flex items-center gap-3 p-3 bg-[#667eea] hover:bg-[#5a6fd8] rounded-md transition-colors"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-white font-medium">Sign in with GitHub</span>
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 border-b border-[#2a2a2a]">
      <div className="flex items-center gap-3 mb-3">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User avatar'}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#e0e0e0] truncate">
            {session.user.name || 'User'}
          </div>
          <div className="text-xs text-[#666] truncate">
            {session.user.email}
          </div>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="w-full px-3 py-2 text-sm text-[#aaa] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors text-left"
      >
        Sign out
      </button>
    </div>
  )
}
