'use client'
import React, { useEffect, useRef } from 'react'
import { useShare } from '@/hooks/share'
import type { Message } from '@/types/chat'

interface ShareMenuProps {
  anchorRef: React.RefObject<HTMLButtonElement>
  containerRef: React.RefObject<HTMLDivElement>
  messages: Message[]
  onClose: () => void
}

const ShareMenu: React.FC<ShareMenuProps> = ({
  anchorRef,
  containerRef,
  messages,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null!)
  const { downloadImage, downloadGif, copyShareUrl, shareTo } = useShare()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose, anchorRef])

  const container = containerRef.current as HTMLElement

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded shadow-xl z-50"
    >
      <button
        onClick={() => downloadImage(container)}
        className="block w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
      >
        Download Image
      </button>
      <button
        onClick={() => downloadGif(container)}
        className="block w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
      >
        Download GIF
      </button>
      <button
        onClick={() => copyShareUrl(messages)}
        className="block w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
      >
        Copy URL
      </button>
      <div className="border-t border-[#2a2a2a] my-1" />
      <button
        onClick={() => shareTo('linkedin', '', copyShareUrl(messages))}
        className="block w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
      >
        LinkedIn
      </button>
      <button
        onClick={() => shareTo('x', '', copyShareUrl(messages))}
        className="block w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
      >
        X
      </button>
      <button
        onClick={() => shareTo('bluesky', '', copyShareUrl(messages))}
        className="block w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
      >
        BlueSky
      </button>
    </div>
  )
}

export default ShareMenu
