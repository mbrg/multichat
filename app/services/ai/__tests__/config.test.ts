import { describe, it, expect } from 'vitest'
import {
  getAllModels,
  getModelsByProvider,
  getModelById,
  getDefaultTemperatureRange,
  MODEL_CONFIGS,
} from '../config'
import type { ProviderType } from '../../../types/ai'

describe('AI Configuration User Flows', () => {
  describe('Model Discovery for Users', () => {
    it('should provide comprehensive list of all available models for user selection', () => {
      const allModels = getAllModels()

      expect(allModels.length).toBeGreaterThan(0)

      // Should include models from each provider
      const providers = new Set(allModels.map((m) => m.provider))
      expect(providers).toContain('openai')
      expect(providers).toContain('anthropic')
      expect(providers).toContain('google')
      expect(providers).toContain('mistral')
      expect(providers).toContain('together')
    })

    it('should provide detailed model information for user decision making', () => {
      const allModels = getAllModels()

      allModels.forEach((model) => {
        expect(model).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          provider: expect.any(String),
          description: expect.any(String),
          supportsLogprobs: expect.any(Boolean),
          maxTokens: expect.any(Number),
        })

        // Names should be user-friendly (except for some technical model names)
        if (!model.id.startsWith('o1-')) {
          expect(model.name).not.toBe(model.id)
        }
        expect(model.description.length).toBeGreaterThan(0)
      })
    })

    it('should allow users to filter models by provider', () => {
      const openaiModels = getModelsByProvider('openai')
      const anthropicModels = getModelsByProvider('anthropic')

      expect(openaiModels.every((m) => m.provider === 'openai')).toBe(true)
      expect(anthropicModels.every((m) => m.provider === 'anthropic')).toBe(
        true
      )

      expect(openaiModels.length).toBeGreaterThan(0)
      expect(anthropicModels.length).toBeGreaterThan(0)
    })

    it('should handle unknown provider gracefully', () => {
      const unknownModels = getModelsByProvider(
        'unknown-provider' as ProviderType
      )
      expect(unknownModels).toEqual([])
    })

    it('should allow users to look up specific models by ID', () => {
      const gpt4 = getModelById('gpt-4')
      const claude = getModelById('claude-3-5-sonnet-20241022')

      expect(gpt4).toMatchObject({
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
      })

      expect(claude).toMatchObject({
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
      })
    })

    it('should return undefined for non-existent model IDs', () => {
      const nonExistent = getModelById('non-existent-model')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Model Capabilities for User Planning', () => {
    it('should indicate which models support probability scores', () => {
      const allModels = getAllModels()
      const openaiModels = allModels.filter((m) => m.provider === 'openai')
      const mistralModels = allModels.filter((m) => m.provider === 'mistral')

      // Most OpenAI models should support logprobs (except o1 models)
      const regularOpenaiModels = openaiModels.filter(
        (m) => !m.id.startsWith('o1-')
      )
      expect(
        regularOpenaiModels.every((m) => m.supportsLogprobs === true)
      ).toBe(true)

      // Mistral models should support logprobs
      expect(mistralModels.every((m) => m.supportsLogprobs === true)).toBe(true)
    })

    it('should provide token limits for user cost estimation', () => {
      const gpt4 = getModelById('gpt-4')
      const claude = getModelById('claude-3-5-sonnet-20241022')

      expect(gpt4?.maxTokens).toBe(8192)
      expect(claude?.maxTokens).toBe(8192)
    })

    it('should indicate multimodal capabilities for file upload planning', () => {
      const gpt4 = getModelById('gpt-4')
      const gpt4o = getModelById('gpt-4o')

      expect(gpt4?.supportedMimeTypes).toEqual(
        expect.arrayContaining([
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ])
      )

      expect(gpt4o?.supportedMimeTypes).toEqual(
        expect.arrayContaining([
          'text/plain',
          'image/jpeg',
          'audio/wav',
          'audio/mp3',
        ])
      )
    })

    it('should distinguish between reasoning and chat models for user guidance', () => {
      const o1Preview = getModelById('o1-preview')
      const gpt4 = getModelById('gpt-4')

      // o1 models have different capabilities
      expect(o1Preview?.supportsLogprobs).toBe(false)
      expect(o1Preview?.supportedMimeTypes).toEqual(['text/plain'])

      // Regular chat models support more features
      expect(gpt4?.supportsLogprobs).toBe(true)
      expect(gpt4?.supportedMimeTypes?.length).toBeGreaterThan(1)
    })
  })

  describe('Temperature Configuration for User Creativity Control', () => {
    it('should provide single temperature for focused responses', () => {
      const temperatures = getDefaultTemperatureRange(1)
      expect(temperatures).toEqual([0.7])
    })

    it('should provide balanced range for creative exploration', () => {
      const temperatures = getDefaultTemperatureRange(3)
      expect(temperatures).toEqual([0.7, 0.8, 0.9])
    })

    it('should provide full creative spectrum for maximum variety', () => {
      const temperatures = getDefaultTemperatureRange(5)
      expect(temperatures).toEqual([0.7, 0.75, 0.8, 0.9, 1.0])
    })

    it('should handle edge cases gracefully', () => {
      const zeroTemp = getDefaultTemperatureRange(0)
      expect(zeroTemp).toEqual([])

      const twoTemp = getDefaultTemperatureRange(2)
      expect(twoTemp).toEqual([0.7, 0.9])
    })

    it('should generate smooth progression for large ranges', () => {
      const temperatures = getDefaultTemperatureRange(10)

      expect(temperatures).toHaveLength(10)
      expect(temperatures[0]).toBe(0.7)
      expect(temperatures[temperatures.length - 1]).toBe(1.0)

      // Should be evenly distributed
      for (let i = 1; i < temperatures.length; i++) {
        expect(temperatures[i]).toBeGreaterThan(temperatures[i - 1])
      }
    })
  })

  describe('Provider Model Organization for User Interface', () => {
    it('should organize OpenAI models for user selection', () => {
      const openaiModels = MODEL_CONFIGS.openai

      expect(openaiModels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'gpt-4', name: 'GPT-4' }),
          expect.objectContaining({ id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }),
          expect.objectContaining({ id: 'gpt-4o', name: 'GPT-4o' }),
          expect.objectContaining({ id: 'o1-preview', name: 'o1-preview' }),
          expect.objectContaining({ id: 'o1-mini', name: 'o1-mini' }),
        ])
      )
    })

    it('should organize Anthropic models for user selection', () => {
      const anthropicModels = MODEL_CONFIGS.anthropic

      expect(anthropicModels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
          }),
          expect.objectContaining({
            id: 'claude-3-5-haiku-20241022',
            name: 'Claude 3.5 Haiku',
          }),
          expect.objectContaining({
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
          }),
        ])
      )
    })

    it('should organize Google models for user selection', () => {
      const googleModels = MODEL_CONFIGS.google

      expect(googleModels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'gemini-2.5-pro-exp-03-25',
            name: 'Gemini 2.5 Pro (Exp)',
          }),
          expect.objectContaining({
            id: 'gemini-2.5-pro-preview-05-06',
            name: 'Gemini 2.5 Pro (Preview)',
          }),
          expect.objectContaining({
            id: 'gemini-2.5-flash-preview-04-17',
            name: 'Gemini 2.5 Flash (Preview)',
          }),
          expect.objectContaining({
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash',
          }),
          expect.objectContaining({
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
          }),
          expect.objectContaining({
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
          }),
        ])
      )
    })

    it('should provide model descriptions for user understanding', () => {
      const allModels = getAllModels()

      allModels.forEach((model) => {
        expect(model.description).toBeTruthy()
        expect(typeof model.description).toBe('string')
        expect(model.description.length).toBeGreaterThan(10)
      })
    })
  })
})
