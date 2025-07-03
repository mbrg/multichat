'use client'
import React, { useState, useRef } from 'react'
import ShareMenu from './ShareMenu'

interface ShareButtonProps {
  containerRef: React.RefObject<HTMLDivElement>
  messages: any[]
}

const ShareButton: React.FC<ShareButtonProps> = ({
  containerRef,
  messages,
}) => {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null!)
  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center hover:bg-[#2a2a2a] rounded-md"
        aria-label="Share"
      >
        <svg
          className="w-5 h-5 text-[#888]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h9a2.25 2.25 0 002.25-2.25V15M12 3l9 9m0 0l-9 9m9-9H12"
          />
        </svg>
      </button>
      {open && (
        <ShareMenu
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
          containerRef={containerRef}
          messages={messages}
        />
      )}
    </div>
  )
}

export default ShareButton
