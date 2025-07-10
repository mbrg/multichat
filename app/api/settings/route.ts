import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { UserSettings } from '../../types/settings'
import { SettingsService } from '../../services/EncryptedDataService'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../lib/logging'
import { z } from 'zod'

// Validation schemas
const SystemInstructionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  content: z.string().max(10000),
  enabled: z.boolean(),
})

const TemperatureSchema = z.object({
  id: z.string().min(1).max(100),
  value: z.number().min(0).max(2),
})

const UserSettingsSchema = z
  .object({
    systemPrompt: z.string().max(10000).optional(),
    enabledProviders: z.string().max(1000).optional(),
    systemInstructions: z.array(SystemInstructionSchema).max(50).optional(),
    temperatures: z.array(TemperatureSchema).max(20).optional(),
    enabledModels: z.array(z.string().max(100)).max(100).optional(),
    possibilityMultiplier: z.number().min(1).max(10).optional(),
    possibilityTokens: z.number().min(1).max(10000).optional(),
    reasoningTokens: z.number().min(1).max(50000).optional(),
    continuationTokens: z.number().min(1).max(10000).optional(),
    maxInitialPossibilities: z.number().min(1).max(50).optional(),
  })
  .strict()

const SettingsKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)

// GET /api/settings - Get all user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await SettingsService.getData(session.user.id)
    return NextResponse.json(settings)
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to get settings', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings - Update settings (partial update supported)
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

    const updates = await request.json()

    // Validate the update object structure and content
    const validatedUpdates = UserSettingsSchema.partial().parse(updates)

    // Get current settings and merge updates
    const currentSettings = await SettingsService.getData(session.user.id)
    const mergedSettings = { ...currentSettings, ...validatedUpdates }

    // Remove any keys with null or undefined values
    const cleanedSettings = Object.fromEntries(
      Object.entries(mergedSettings).filter(
        ([_, value]) => value !== null && value !== undefined
      )
    ) as UserSettings

    // Save updated settings
    await SettingsService.saveData(session.user.id, cleanedSettings)
    const updatedSettings = cleanedSettings

    return NextResponse.json(updatedSettings)
  } catch (error) {
    const context = await getServerLogContext()

    if (error instanceof z.ZodError) {
      log.warn('Settings validation error', context)
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      )
    }

    log.error('Failed to update settings', error as Error, context)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings - Delete specific setting or all settings
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const key = url.searchParams.get('key')

    if (key) {
      // Validate the key parameter
      const validatedKey = SettingsKeySchema.parse(key)

      // Delete specific setting
      const updatedSettings = await SettingsService.deleteKey(
        session.user.id,
        validatedKey as keyof UserSettings
      )
      return NextResponse.json({ success: true, settings: updatedSettings })
    } else {
      // Delete all settings
      await SettingsService.deleteData(session.user.id)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    const context = await getServerLogContext()

    if (error instanceof z.ZodError) {
      log.warn('Settings key validation error', context)
      return NextResponse.json(
        { error: 'Invalid settings key format' },
        { status: 400 }
      )
    }

    log.error('Failed to delete settings', error as Error, context)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
