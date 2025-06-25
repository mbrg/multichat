import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { ModelInfo, GenerationOptions } from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'

export class GoogleProvider extends AbstractAIProvider {
  readonly name = 'Google'
  readonly models = getModelsByProvider('google')

  protected async createModel(modelId: string, apiKey: string): Promise<any> {
    const googleProvider = createGoogleGenerativeAI({
      apiKey: apiKey,
    })
    return googleProvider(modelId)
  }

  protected getProviderOptions(
    options: GenerationOptions,
    model: ModelInfo
  ): Record<string, any> {
    return {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? model.maxTokens,
      topP: options.topP,
      topK: options.topK,
    }
  }

  protected getValidationModelId(): string {
    return 'gemini-1.5-flash'
  }
}
