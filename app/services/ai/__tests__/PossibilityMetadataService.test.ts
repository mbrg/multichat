import { describe, it, expect } from 'vitest'
import { PossibilityMetadataService } from '../PossibilityMetadataService'
import type { UserSettings } from '@/types/settings'

describe('PossibilityMetadataService enabled models', () => {
  it('only generates metadata for selected models', () => {
    const service = new PossibilityMetadataService()
    // Stub calculatePriority to avoid dynamic require issues during tests
    ;(service as any).calculatePriority = () => 'high'
    const settings: UserSettings = {
      enabledProviders: '{"openai": true}',
      enabledModels: ['gpt-4'],
      systemInstructions: [],
      temperatures: [{ id: '1', value: 0.7 }],
    }

    const metadata = service.generatePossibilityMetadata(settings)
    const models = Array.from(new Set(metadata.map((m) => m.model)))
    expect(models).toEqual(['gpt-4'])
  })
})
