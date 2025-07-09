import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../../lib/logging'
import { OpenAIProvider } from '../../../services/ai/providers/openai'
import { AnthropicProvider } from '../../../services/ai/providers/anthropic'
import { GoogleProvider } from '../../../services/ai/providers/google'
import { MistralProvider } from '../../../services/ai/providers/mistral'
import { TogetherProvider } from '../../../services/ai/providers/together'
import { XAIProvider } from '../../../services/ai/providers/xai'
import { ApiKeysService } from '../../../services/EncryptedDataService'
import {
  AI_PROVIDER_LIST,
  type AIProviderType,
} from '../../../constants/providers'

const VALID_API_KEY_PROVIDERS = AI_PROVIDER_LIST
type ApiKeyProvider = AIProviderType

const providerInstances = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  google: new GoogleProvider(),
  mistral: new MistralProvider(),
  together: new TogetherProvider(),
  xai: new XAIProvider(),
}

// POST /api/apikeys/validate - Validate a specific API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider } = body

    // Validate provider
    if (
      !provider ||
      !VALID_API_KEY_PROVIDERS.includes(provider as ApiKeyProvider)
    ) {
      return NextResponse.json(
        {
          error: `Invalid provider. Must be one of: ${VALID_API_KEY_PROVIDERS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const providerInstance =
      providerInstances[provider as keyof typeof providerInstances]
    if (!providerInstance) {
      return NextResponse.json(
        { error: `Provider ${provider} not supported for validation` },
        { status: 400 }
      )
    }

    // Validate the API key
    const context = await getServerLogContext()
    log.info(`[Validation] Starting validation for ${provider}`, context)
    const isValid = await providerInstance.validateApiKey()
    log.info(`[Validation] ${provider} validation result: ${isValid}`, context)

    return NextResponse.json({
      provider,
      isValid,
      message: isValid
        ? 'API key is valid'
        : 'API key is invalid or missing. Please check your key and try again.',
    })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to validate API key', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    )
  }
}
