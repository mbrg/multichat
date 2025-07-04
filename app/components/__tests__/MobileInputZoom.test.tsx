import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import { CloudSettings } from '../../utils/cloudSettings'
import { ApiKeyForm } from '../providers/ApiKeyForm'
import { TemperatureForm } from '../temperatures/TemperatureForm'
import GenerationSettingsPanel from '../GenerationSettingsPanel'

vi.mock('next-auth/react')
vi.mock('../../utils/cloudSettings')

const mockSession = vi.mocked(useSession)
const mockCloud = vi.mocked(CloudSettings)

describe('Mobile input font sizes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)
  })

  it('ApiKeyForm input uses base font size', async () => {
    const providers = [
      {
        id: 'openai',
        name: 'OpenAI API Key',
        icon: '/o.png',
        description: '',
        enabled: true,
      },
    ]
    render(
      <ApiKeyForm
        providers={providers}
        isProviderConfigured={() => false}
        onSave={async () => {}}
        onCancel={() => {}}
      />
    )

    fireEvent.click(screen.getByText('OpenAI'))
    const input = await screen.findByPlaceholderText('Enter your API key...')
    expect(input.className).toContain('text-base')
    expect(input.className).not.toContain('text-sm')
  })

  it('TemperatureForm input uses base font size', () => {
    render(
      <TemperatureForm
        temperatures={[]}
        onSave={async () => {}}
        onCancel={() => {}}
      />
    )
    const input = screen.getByPlaceholderText('0.7')
    expect(input.className).toContain('text-base')
    expect(input.className).not.toContain('text-sm')
  })

  it('GenerationSettingsPanel numeric inputs use base font size', async () => {
    mockCloud.getGenerationDefaults.mockResolvedValue({
      possibilityTokens: 100,
      reasoningTokens: 1500,
      continuationTokens: 1000,
      maxInitialPossibilities: 12,
    })

    const { container } = render(<GenerationSettingsPanel />)

    await waitFor(() => {
      expect(mockCloud.getGenerationDefaults).toHaveBeenCalled()
    })

    const input = container.querySelector('input[type="number"]')
    expect(input).toBeTruthy()
    expect((input as HTMLInputElement).className).toContain('text-base')
    expect((input as HTMLInputElement).className).not.toContain('text-sm')
  })
})
