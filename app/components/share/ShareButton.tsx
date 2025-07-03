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
            d="M4 12v.01M12 4v.01M20 12v.01M12 20v.01M12 4l7.778 7.778M4.222 4.222l7.778 7.778m0 0l7.778 7.778M4.222 19.778l7.778-7.778"
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
