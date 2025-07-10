import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../lib/logging'
import {
  AI_PROVIDER_LIST,
  type AIProviderType,
} from '../../constants/providers'
import {
  ApiKeysService,
  type ApiKeyData,
} from '../../services/EncryptedDataService'
import { z } from 'zod'

const VALID_API_KEY_PROVIDERS = AI_PROVIDER_LIST
type ApiKeyProvider = AIProviderType

// Validation schemas
const ApiKeySetSchema = z.object({
  provider: z.enum(VALID_API_KEY_PROVIDERS as [string, ...string[]]),
  apiKey: z.string().min(1).max(500).trim(),
})

const ProviderSchema = z.enum(VALID_API_KEY_PROVIDERS as [string, ...string[]])

interface ApiKeyStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
  mistral: boolean
  together: boolean
  xai: boolean
}

// GET /api/apikeys - Returns which API keys are set (not the actual keys)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKeysData = await ApiKeysService.getData(session.user.id)

    // Return only the status of which keys are set
    const status: ApiKeyStatus = {
      openai: !!apiKeysData.openai,
      anthropic: !!apiKeysData.anthropic,
      google: !!apiKeysData.google,
      mistral: !!apiKeysData.mistral,
      together: !!apiKeysData.together,
      xai: !!apiKeysData.xai,
    }

    return NextResponse.json({ status })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to get API key status', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to get API key status' },
      { status: 500 }
    )
  }
}

// POST /api/apikeys - Set or update a specific API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const { provider, apiKey } = ApiKeySetSchema.parse(body)

    // Get current data and update
    const apiKeysData = await ApiKeysService.getData(session.user.id)

    if (apiKey.trim() === '') {
      // Remove the API key if empty string is provided
      delete apiKeysData[provider]
    } else {
      apiKeysData[provider] = apiKey
    }

    // Save updated data
    await ApiKeysService.saveData(session.user.id, apiKeysData)

    // Return the updated status
    const status: ApiKeyStatus = {
      openai: !!apiKeysData.openai,
      anthropic: !!apiKeysData.anthropic,
      google: !!apiKeysData.google,
      mistral: !!apiKeysData.mistral,
      together: !!apiKeysData.together,
      xai: !!apiKeysData.xai,
    }

    return NextResponse.json({ status })
  } catch (error) {
    const context = await getServerLogContext()

    if (error instanceof z.ZodError) {
      log.warn('API key validation error', context)
      return NextResponse.json(
        { error: 'Invalid API key data', details: error.errors },
        { status: 400 }
      )
    }

    log.error('Failed to set API key', error as Error, context)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/apikeys - Delete a specific API key or all API keys
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')

    if (provider) {
      // Validate provider parameter
      const validatedProvider = ProviderSchema.parse(provider)

      // Delete specific API key
      await ApiKeysService.deleteKey(session.user.id, validatedProvider)
    } else {
      // Delete all API keys
      await ApiKeysService.deleteData(session.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = await getServerLogContext()

    if (error instanceof z.ZodError) {
      log.warn('Provider validation error', context)
      return NextResponse.json(
        { error: 'Invalid provider parameter' },
        { status: 400 }
      )
    }

    log.error('Failed to delete API key', error as Error, context)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
