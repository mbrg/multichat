import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ModelsPanel from '../ModelsPanel'
import { useSession } from 'next-auth/react'
import { useApiKeys } from '../../hooks/useApiKeys'
import { CloudSettings } from '../../utils/cloudSettings'
import { getAllModels } from '../../services/ai/config'

vi.mock('next-auth/react')
vi.mock('../../hooks/useApiKeys')
vi.mock('../../utils/cloudSettings')
vi.mock('../../services/ai/config')
vi.mock('next/image', async () => {
  const mod = await vi.importActual<typeof import('next/image')>('next/image')
  return {
    __esModule: true,
    default: (props: any) => <mod.default {...props} unoptimized />,
  }
})

const mockSession = vi.mocked(useSession)
const mockUseApiKeys = vi.mocked(useApiKeys)
const mockGetAllModels = vi.mocked(getAllModels)
const mockCloudSettings = vi.mocked(CloudSettings)

describe('ModelsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as any)

    mockGetAllModels.mockReturnValue([
      {
        id: 'gpt-4',
        name: 'GPT-4',
        alias: 'gpt-4',
        provider: 'openai',
        description: '',
        supportsLogprobs: true,
        maxTokens: 8192,
        priority: 'medium',
      },
      {
        id: 'claude-3',
        name: 'Claude 3',
        alias: 'claude-3',
        provider: 'anthropic',
        description: '',
        supportsLogprobs: true,
        maxTokens: 8192,
        priority: 'medium',
      },
    ] as any)

    mockCloudSettings.getEnabledModels.mockResolvedValue(undefined as any)

    mockUseApiKeys.mockReturnValue({
      apiKeys: {},
      enabledProviders: {
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      },
      validationStatus: { openai: 'valid', anthropic: null },
      isLoading: false,
      isAuthenticated: true,
      saveApiKey: vi.fn(),
      clearApiKey: vi.fn(),
      toggleProvider: vi.fn(),
      getApiKey: vi.fn(),
      clearAllKeys: vi.fn(),
      loadApiKeys: vi.fn(),
      validateApiKey: vi.fn(),
      isProviderEnabled: (p: any) => p === 'openai',
      hasApiKey: (p: any) => p === 'openai',
    } as any)
  })

  it('greys out models when provider inactive', async () => {
    render(<ModelsPanel />)

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })

    const active = screen.getByText('GPT-4').closest('button')
    const inactive = screen.getByText('Claude 3').closest('button')

    expect(active?.className).not.toContain('opacity-50')
    expect(inactive?.className).toContain('opacity-50')
  })
})
