import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AIProvider, Message, ModelInfo, GenerationOptions, ResponseWithLogprobs } from '../../../types/ai'
import { getModelsByProvider } from '../config'

export class GoogleProvider implements AIProvider {
  name = 'Google'
  models = getModelsByProvider('google')

  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('Google API key not configured')
    }

    try {
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const result = await generateText({
        model: google(model.id),
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? model.maxTokens,
        topP: options.topP,
        topK: options.topK
      })

      // Google doesn't provide logprobs, so we estimate probability
      const probability = this.estimateProbability(options.temperature ?? 0.7)

      return {
        content: result.text,
        logprobs: undefined, // Google doesn't provide logprobs
        probability,
        finishReason: result.finishReason || 'stop',
        usage: result.usage ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens
        } : undefined
      }
    } catch (error) {
      console.error('Google API error:', error)
      throw new Error(`Google API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5
      })
      return !!result.text
    } catch (error) {
      console.error('Google API key validation failed:', error)
      return false
    }
  }

  private async getApiKey(): Promise<string | null> {
    // This will be replaced with secure storage integration
    const apiKey = localStorage.getItem('google-api-key')
    return apiKey
  }

  private estimateProbability(temperature: number): number {
    // Since Google doesn't provide logprobs, we estimate probability
    // based on temperature and add some randomness for variety
    const baseProb = Math.max(0.2, 1.0 - temperature * 0.7)
    const randomFactor = (Math.random() - 0.5) * 0.25
    return Math.max(0.1, Math.min(0.95, baseProb + randomFactor))
  }
}