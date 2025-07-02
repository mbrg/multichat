import React, { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useAuthPopup } from '../hooks/useAuthPopup'
import AuthPopup from './AuthPopup'
import { MenuButton } from './menu/MenuButton'
import { MenuDropdown } from './menu/MenuDropdown'

interface MenuProps {
  onOpenSettings: (
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'possibility-defaults'
  ) => void
  className?: string
}

/**
 * Main menu component with dropdown functionality
 * Manages menu state and coordinates user interactions
 */
const Menu: React.FC<MenuProps> = ({ onOpenSettings, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { data: session, status } = useSession()
  const { isPopupOpen, checkAuthAndRun, closePopup } = useAuthPopup()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleSettingsClick = (
    e: React.MouseEvent,
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'possibility-defaults'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
    onOpenSettings(section)
  }

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
    checkAuthAndRun(() => {})
  }

  const handleSignOutClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
    await signOut()
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <MenuButton isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <MenuDropdown
          session={session}
          status={status}
          onSignIn={handleSignInClick}
          onSignOut={handleSignOutClick}
          onSettingsClick={handleSettingsClick}
        />
      )}

      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default Menu
