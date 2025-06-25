import { anthropic } from '@ai-sdk/anthropic'
import type { ModelInfo, GenerationOptions } from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'

export class AnthropicProvider extends AbstractAIProvider {
  readonly name = 'Anthropic'
  readonly models = getModelsByProvider('anthropic')

  protected async createModel(modelId: string, apiKey: string): Promise<any> {
    return anthropic(modelId)
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
    return 'claude-3-5-haiku-20241022'
  }
}