import React, { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useAuthPopup } from '../hooks/useAuthPopup'
import AuthPopup from './AuthPopup'

interface MenuProps {
  onOpenSettings: () => void
  onOpenSystemInstructions: () => void
  className?: string
}

const Menu: React.FC<MenuProps> = ({ onOpenSettings, onOpenSystemInstructions, className = '' }) => {
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

  const handleApiKeysClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
    onOpenSettings()
  }

  const handleSystemInstructionsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
    onOpenSystemInstructions()
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
      {/* Menu Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-[#2a2a2a] transition-colors"
        aria-label="Menu"
      >
        <svg
          className="w-5 h-5 text-[#888] hover:text-[#e0e0e0]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50">
          {/* User Section */}
          {status !== 'loading' && session && (
            <div className="p-4 border-b border-[#2a2a2a]">
              <div className="flex items-center space-x-3">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e0e0e0] truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-[#888] truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            {/* API Keys */}
            <button
              onClick={handleApiKeysClick}
              className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="text-lg">⚙️</span>
              <div className="flex-1">
                <p className="text-sm text-[#e0e0e0]">API Keys</p>
                <p className="text-xs text-[#888]">Configure AI providers</p>
              </div>
            </button>

            {/* System Instructions */}
            <button
              onClick={handleSystemInstructionsClick}
              className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="text-lg">📋</span>
              <div className="flex-1">
                <p className="text-sm text-[#e0e0e0]">System Instructions</p>
                <p className="text-xs text-[#888]">Customize AI behavior</p>
              </div>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-[#2a2a2a]"></div>

            {/* Auth Actions */}
            {status === 'loading' ? (
              <div className="px-4 py-2.5 flex items-center justify-center">
                <div data-testid="loading-spinner" className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
              </div>
            ) : session ? (
              <button
                onClick={handleSignOutClick}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-[#2a2a2a] transition-colors"
              >
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-sm text-red-400">Sign out</span>
              </button>
            ) : (
              <button
                onClick={handleSignInClick}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-[#2a2a2a] transition-colors"
              >
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-sm text-blue-400">Sign in</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Auth Popup */}
      <AuthPopup isOpen={isPopupOpen} onClose={closePopup} />
    </div>
  )
}

export default Menu