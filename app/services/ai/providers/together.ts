import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelInfo, GenerationOptions } from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'

export class TogetherProvider extends AbstractAIProvider {
  readonly name = 'Together AI'
  readonly models = getModelsByProvider('together')

  protected async createModel(modelId: string, apiKey: string): Promise<any> {
    const together = createOpenAICompatible({
      apiKey,
      baseURL: 'https://api.together.xyz/v1',
      name: 'together',
    })
    return together(modelId)
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
    return 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
  }

  protected getProviderKey(): string {
    return 'together'
  }
}