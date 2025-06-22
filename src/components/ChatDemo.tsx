import React, { useState, useCallback } from 'react'
import ChatContainer from './ChatContainer'
import type { Message, Attachment } from '../types/chat'

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Simulate AI response generation with possibilities
  const generateAIResponse = useCallback(async (userContent: string): Promise<Message> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const baseResponse: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `Response to: "${userContent}"`,
      model: 'gpt-4',
      probability: 0.85,
      timestamp: new Date()
    }

    // Generate alternative possibilities
    const possibilities: Message[] = [
      {
        id: `possibility-${Date.now()}-1`,
        role: 'assistant',
        content: `Alternative response to: "${userContent}" (Option A)`,
        model: 'claude-3',
        probability: 0.75,
        timestamp: new Date(),
        isPossibility: true
      },
      {
        id: `possibility-${Date.now()}-2`,
        role: 'assistant',
        content: `Different take on: "${userContent}" (Option B)`,
        model: 'gemini',
        probability: 0.65,
        timestamp: new Date(),
        isPossibility: true
      },
      {
        id: `possibility-${Date.now()}-3`,
        role: 'assistant',
        content: `Creative answer to: "${userContent}" (Option C)`,
        model: 'gpt-3.5',
        probability: 0.55,
        timestamp: new Date(),
        isPossibility: true
      }
    ]

    return {
      ...baseResponse,
      possibilities
    }
  }, [])

  const handleSendMessage = useCallback(async (content: string, attachments?: Attachment[]) => {
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      attachments
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Generate AI response with possibilities
      const aiResponse = await generateAIResponse(content)
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setIsLoading(false)
    }
  }, [generateAIResponse])

  const handleSelectPossibility = useCallback((userMessage: Message, selectedPossibility: Message) => {
    setMessages(prevMessages => {
      // Find the assistant message that contains this possibility
      const assistantMessageIndex = prevMessages.findIndex(msg => 
        msg.role === 'assistant' && 
        msg.possibilities?.some(p => p.id === selectedPossibility.id)
      )

      if (assistantMessageIndex === -1) return prevMessages

      // Create new messages array
      const newMessages = [...prevMessages]
      
      // Replace the assistant message with the selected possibility (without possibilities)
      const fixedAssistantMessage: Message = {
        ...selectedPossibility,
        possibilities: undefined, // Remove possibilities to fix the selection
        isPossibility: false
      }

      newMessages[assistantMessageIndex] = fixedAssistantMessage

      return newMessages
    })
  }, [])

  return (
    <div 
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }} 
      className="h-screen bg-[#0a0a0a] text-gray-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
        <div className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Chat with Possibilities Demo
        </div>
        <div className="text-xs text-[#888] max-w-[300px] text-right">
          Send a message to see multiple AI response possibilities. Click on any possibility to fix it and continue the conversation.
        </div>
      </div>
      
      <div className="flex-1">
        <ChatContainer
          messages={messages}
          onSendMessage={handleSendMessage}
          onSelectPossibility={handleSelectPossibility}
          isLoading={isLoading}
          className="bg-[#0a0a0a]"
        />
      </div>
    </div>
  )
}

export default ChatDemo