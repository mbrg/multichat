import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelInfo, GenerationOptions } from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'

export class XAIProvider extends AbstractAIProvider {
  readonly name = 'xAI'
  readonly models = getModelsByProvider('xai')

  protected async createModel(modelId: string, apiKey: string): Promise<any> {
    const xaiProvider = createOpenAICompatible({
      name: 'xai',
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1',
    })
    return xaiProvider(modelId)
  }

  protected getProviderOptions(
    options: GenerationOptions,
    model: ModelInfo
  ): Record<string, any> {
    return {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? model.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
    }
  }

  protected getValidationModelId(): string {
    return 'grok-3-latest'
  }
}
