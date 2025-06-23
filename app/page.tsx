'use client'

import { useEffect } from 'react'
import ChatDemo from '../src/components/ChatDemo'

export default function Home() {
  useEffect(() => {
    // Safari IndexedDB lazy loading fix - access early to trigger initialization
    if (typeof window !== 'undefined') {
      if (window.indexedDB) {
        console.log('IndexedDB available')
      } else {
        console.warn('IndexedDB not available - using fallback storage')
      }
    }
  }, [])

  return <ChatDemo />
}
