'use client'
import React from 'react'
import { Session } from 'next-auth'
import { UserSection } from './UserSection'
import { MenuItems } from './MenuItems'

interface MenuDropdownProps {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  onSignIn: (e: React.MouseEvent) => void
  onSignOut: (e: React.MouseEvent) => void
  onSettingsClick: (
    e: React.MouseEvent,
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'generation'
      | 'conversations'
  ) => void
}

/**
 * Main dropdown menu container
 * Combines user section and menu items
 */
export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  session,
  status,
  onSignIn,
  onSignOut,
  onSettingsClick,
}) => {
  return (
    <div className="absolute right-0 mt-2 w-[90vw] min-w-[320px] sm:w-72 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 max-h-[90vh] overflow-y-auto">
      <UserSection
        session={session}
        status={status}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />
      <MenuItems
        session={session}
        status={status}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onSettingsClick={onSettingsClick}
      />
    </div>
  )
}
