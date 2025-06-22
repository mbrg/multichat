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
}

export interface ChatContainerProps {
  messages: Message[]
  onSendMessage: (content: string, attachments?: Attachment[]) => void
  isLoading?: boolean
  className?: string
}

export interface MessageProps {
  message: Message
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