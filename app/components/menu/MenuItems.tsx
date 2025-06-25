'use client'
import React from 'react'

interface MenuItemsProps {
  onSettingsClick: (
    e: React.MouseEvent,
    section?: 'api-keys' | 'system-instructions' | 'temperatures'
  ) => void
}

/**
 * Menu items for settings and navigation
 * Provides structured menu options
 */
export const MenuItems: React.FC<MenuItemsProps> = ({ onSettingsClick }) => {
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
    </div>
  )
}
