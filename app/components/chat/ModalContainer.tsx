/**
 * Modal Container Component
 *
 * Focused component for modal management (Settings and Auth popups).
 * Follows Single Responsibility Principle - only handles modal state.
 */

import React from 'react'
import Settings from '../Settings'
import AuthPopup from '../AuthPopup'

export interface ModalContainerProps {
  // Settings modal
  showSettings: boolean
  settingsSection?:
    | 'api-keys'
    | 'system-instructions'
    | 'temperatures'
    | 'models'
  onCloseSettings: () => void

  // Auth popup
  showAuthPopup: boolean
  onCloseAuthPopup: () => void
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  showSettings,
  settingsSection,
  onCloseSettings,
  showAuthPopup,
  onCloseAuthPopup,
}) => {
  return (
    <>
      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={onCloseSettings}
        initialSection={settingsSection}
      />

      {/* Auth Popup */}
      <AuthPopup isOpen={showAuthPopup} onClose={onCloseAuthPopup} />
    </>
  )
}

export default ModalContainer
