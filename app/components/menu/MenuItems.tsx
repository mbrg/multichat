'use client'
import React from 'react'
import { Session } from 'next-auth'

interface MenuItemsProps {
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
  ) => void
}

/**
 * Menu items for settings and navigation
 * Provides structured menu options
 */
export const MenuItems: React.FC<MenuItemsProps> = ({
  session,
  status,
  onSignIn,
  onSignOut,
  onSettingsClick,
}) => {
  const menuItems = [
    {
      section: 'api-keys' as const,
      label: 'API Keys',
      description: 'Manage AI provider API keys',
      icon: (
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
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      ),
    },
    {
      section: 'system-instructions' as const,
      label: 'System Instructions',
      description: 'Custom prompts and behaviors',
      icon: (
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      section: 'models' as const,
      label: 'Models',
      description: 'Choose which models generate possibilities',
      icon: (
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
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      ),
    },
    {
      section: 'temperatures' as const,
      label: 'Temperatures',
      description: 'Response creativity settings',
      icon: (
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      section: 'generation' as const,
      label: 'Generation',
      description: 'Possibility defaults',
      icon: (
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
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-2">
      <div className="text-xs font-medium text-[#666] uppercase tracking-wider px-3 py-2">
        Settings
      </div>
      <div className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.section}
            `}
            onClick={(e) => onSettingsClick(e, item.section)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#aaa] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded-md transition-colors text-left"
          >
            <span className="text-[#666]">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-[#666] truncate">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-[#2a2a2a]"></div>

      {/* Auth Actions */}
      <div className="px-2 pb-2">
        {status === 'loading' ? (
          <div className="px-4 py-2.5 flex items-center justify-center">
            <div
              
              className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"
            ></div>
          </div>
        ) : session ? (
          <button
            onClick={onSignOut}
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
            onClick={onSignIn}
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
            <span className="text-sm text-blue-400">Sign In</span>
          </button>
        )}
      </div>
    </div>
  )
}
