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

const VALID_API_KEY_PROVIDERS = AI_PROVIDER_LIST
type ApiKeyProvider = AIProviderType

interface ApiKeyStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
  mistral: boolean
  together: boolean
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

    const body = await request.json()
    const { provider, apiKey } = body

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

    // Validate API key
    if (typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key must be a string' },
        { status: 400 }
      )
    }

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
    }

    return NextResponse.json({ status })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to set API key', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to set API key' },
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
      // Delete specific API key
      if (!VALID_API_KEY_PROVIDERS.includes(provider as ApiKeyProvider)) {
        return NextResponse.json(
          {
            error: `Invalid provider. Must be one of: ${VALID_API_KEY_PROVIDERS.join(', ')}`,
          },
          { status: 400 }
        )
      }

      await ApiKeysService.deleteKey(session.user.id, provider)
    } else {
      // Delete all API keys
      await ApiKeysService.deleteData(session.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to delete API key', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
