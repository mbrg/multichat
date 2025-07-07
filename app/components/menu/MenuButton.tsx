'use client'
import React from 'react'

interface MenuButtonProps {
  isOpen: boolean
  onToggle: () => void
  className?: string
}

/**
 * Menu toggle button with hamburger/close icon
 * Handles the visual state of the menu trigger
 */
export const MenuButton: React.FC<MenuButtonProps> = ({
  isOpen,
  onToggle,
  className = '',
}) => {
  return (
    <button
      data-testid="menu-button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`flex items-center justify-center w-10 h-10 rounded-md hover:bg-[#2a2a2a] transition-colors ${className}`}
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
  )
}
