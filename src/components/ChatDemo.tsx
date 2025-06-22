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
    
    // Generate many possibilities for infinite scroll demo
    const models = ['gpt-4', 'claude-3', 'gemini', 'gpt-3.5', 'mistral', 'llama-2', 'palm', 'cohere']
    const responseTypes = [
      'Response to',
      'Alternative response to', 
      'Different take on',
      'Creative answer to',
      'Thoughtful reply to',
      'Detailed response to',
      'Brief answer to',
      'Comprehensive take on',
      'Insightful response to',
      'Analytical answer to'
    ]

    const possibilities: Message[] = []
    for (let i = 0; i < 50; i++) {
      const model = models[i % models.length]
      const responseType = responseTypes[i % responseTypes.length]
      possibilities.push({
        id: `possibility-${Date.now()}-${i}`,
        role: 'assistant',
        content: `${responseType}: "${userContent}" (Variation ${i + 1})`,
        model,
        probability: Math.max(0.3, 0.9 - (i * 0.01)),
        timestamp: new Date(),
        isPossibility: true
      })
    }

    // Return a message that shows only possibilities without pre-selecting
    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '', // Empty content - we only show possibilities
      timestamp: new Date(),
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
          Infinite Chat
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