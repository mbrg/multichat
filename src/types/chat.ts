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
  probability?: number
  timestamp: Date
  attachments?: Attachment[]
  possibilities?: Message[] // Alternative responses for assistant messages
  isPossibility?: boolean // True if this is a possibility that can be selected
}

export interface ChatContainerProps {
  messages: Message[]
  onSendMessage: (content: string, attachments?: Attachment[]) => void
  onSelectPossibility?: (userMessage: Message, selectedPossibility: Message) => void
  isLoading?: boolean
  className?: string
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