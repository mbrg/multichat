import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type {
  AIProvider,
  Message,
  ModelInfo,
  GenerationOptions,
  ResponseWithLogprobs,
} from '../../../types/ai'
import { getModelsByProvider } from '../config'

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  models = getModelsByProvider('openai')

  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const result = await generateText({
        model: openai(model.id),
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? model.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
        // stop: options.stop // Not supported by all models
      })

      // Calculate estimated probability based on temperature
      const probability = this.estimateProbability(options.temperature ?? 0.7)

      return {
        content: result.text,
        logprobs: undefined, // Simplified for now
        probability,
        finishReason: result.finishReason || 'stop',
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      })
      return !!result.text
    } catch (error) {
      console.error('OpenAI API key validation failed:', error)
      return false
    }
  }

  private async getApiKey(): Promise<string | null> {
    // This will be replaced with secure storage integration
    const apiKey = localStorage.getItem('openai-api-key')
    return apiKey
  }

  private estimateProbability(temperature: number): number {
    // Estimate probability based on temperature and add some randomness
    const baseProb = Math.max(0.2, 1.0 - temperature * 0.8)
    const randomFactor = (Math.random() - 0.5) * 0.3
    return Math.max(0.1, Math.min(0.95, baseProb + randomFactor))
  }
}
