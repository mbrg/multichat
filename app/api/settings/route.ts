import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { UserSettings } from '../../types/settings'
import { SettingsService } from '../../services/EncryptedDataService'
import { log } from '@/services/LoggingService'
import { getServerLogContext } from '../../lib/logging'

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

    const updates = await request.json()

    // Validate the update object
    if (typeof updates !== 'object' || updates === null) {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Get current settings and merge updates
    const currentSettings = await SettingsService.getData(session.user.id)
    const mergedSettings = { ...currentSettings, ...updates }

    // Remove any keys with null or undefined values
    Object.keys(mergedSettings).forEach((key) => {
      if (mergedSettings[key] === null || mergedSettings[key] === undefined) {
        delete mergedSettings[key]
      }
    })

    // Save updated settings
    await SettingsService.saveData(session.user.id, mergedSettings)
    const updatedSettings = mergedSettings

    return NextResponse.json(updatedSettings)
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to update settings', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to update settings' },
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
      // Delete specific setting
      const updatedSettings = await SettingsService.deleteKey(
        session.user.id,
        key as keyof UserSettings
      )
      return NextResponse.json({ success: true, settings: updatedSettings })
    } else {
      // Delete all settings
      await SettingsService.deleteData(session.user.id)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    const context = await getServerLogContext()
    log.error('Failed to delete settings', error as Error, context)
    return NextResponse.json(
      { error: 'Failed to delete settings' },
      { status: 500 }
    )
  }
}
