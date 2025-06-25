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
    return null
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
    </div>
  )
}
