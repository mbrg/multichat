import { describe, it, expect } from 'vitest'
import { PermutationGenerator } from '../permutations'
import { DEFAULT_SYSTEM_INSTRUCTION } from '@/constants/defaults'
import type { ChatCompletionRequest } from '@/types/api'
import type { SystemInstruction } from '@/types/settings'

describe('PermutationGenerator system instructions', () => {
  const baseSettings: ChatCompletionRequest['settings'] = {
    systemPrompt: 'prompt',
    enabledProviders: ['openai'],
    enabledModels: ['gpt-4'],
    temperatures: [0.7],
    systemInstructions: [],
  }

  it('includes only enabled instructions', () => {
    const instructions: SystemInstruction[] = [
      { id: '1', name: 'one', content: '1', enabled: true },
      { id: '2', name: 'two', content: '2', enabled: false },
    ]
    const generator = new PermutationGenerator()
    const perms = generator.generatePermutations({
      ...baseSettings,
      systemInstructions: instructions,
    })
    expect(perms).toHaveLength(1)
    expect(perms[0].systemInstruction?.id).toBe('1')
  })

  it('falls back to default when none enabled', () => {
    const instructions: SystemInstruction[] = [
      { id: '1', name: 'one', content: '1', enabled: false },
    ]
    const generator = new PermutationGenerator()
    const perms = generator.generatePermutations({
      ...baseSettings,
      systemInstructions: instructions,
    })
    expect(perms).toHaveLength(1)
    expect(perms[0].systemInstruction?.id).toBe(DEFAULT_SYSTEM_INSTRUCTION.id)
  })
})
