'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export function useAuthPopup() {
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const { data: session } = useSession()

  const checkAuthAndRun = (callback: () => void) => {
    if (session) {
      callback()
    } else {
      setIsPopupOpen(true)
    }
  }

  const closePopup = () => {
    setIsPopupOpen(false)
  }

  return {
    isPopupOpen,
    checkAuthAndRun,
    closePopup,
    isAuthenticated: !!session,
  }
}
