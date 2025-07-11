export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  data: string // base64 encoded
  preview?: string // preview URL for images
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  probability?: number | null // null when probability calculation unavailable
  temperature?: number // Temperature parameter used for generation
  timestamp: Date
  attachments?: Attachment[]
  possibilities?: Message[] // Alternative responses for assistant messages
  isPossibility?: boolean // True if this is a possibility that can be selected
  systemInstruction?: string // Name of the system instruction used
  error?: string // Short error message when generation fails
  isQuoteMessage?: boolean // True if this is a quote message (e.g., conversation title)
}

export interface ChatContainerProps {
  messages: Message[]
  onSendMessage: (content: string, attachments?: Attachment[]) => void
  onSelectPossibility?: (
    userMessage: Message,
    selectedPossibility: Message
  ) => void
  onContinuePossibility?: (selectedPossibility: Message) => void
  isLoading?: boolean
  disabled?: boolean
  className?: string
  settingsLoading?: boolean
  apiKeysLoading?: boolean
  onPublishConversation?: () => Promise<{ url: string; id: string } | void>
  onTitleClick?: () => void
  isGenerating?: boolean
  isPublishing?: boolean
  onPossibilitiesFinished?: () => void
  onPossibilitiesChange?: (getCompletedPossibilities: () => any[]) => void
  onClearPossibilities?: (clearFn: () => void) => void
  disableLivePossibilities?: boolean
  hasUnselectedPossibilities?: boolean
  hasReachedConversationLimit?: boolean
}

export interface MessageProps {
  message: Message
  onSelectPossibility?: (possibility: Message) => void
  className?: string
}

export interface MessageInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export interface AttachmentPreviewProps {
  attachment: Attachment
  onRemove?: (attachmentId: string) => void
  className?: string
}
