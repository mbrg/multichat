import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { getKVStore } from '../../services/kv'
import { deriveUserKey, encrypt, decrypt } from '../../utils/crypto'

interface UserSettings {
  systemPrompt?: string
  enabledProviders?: string // JSON stringified EnabledProviders
  [key: string]: any // Allow for future settings
}

async function getSettingsData(userId: string): Promise<UserSettings> {
  const kvStore = await getKVStore()
  const encryptedData = await kvStore.get<string>(`settings:${userId}`)
  if (!encryptedData) return {}

  const userKey = await deriveUserKey(userId)
  const decryptedData = await decrypt(encryptedData, userKey)
  return JSON.parse(decryptedData)
}

async function saveSettingsData(
  userId: string,
  data: UserSettings
): Promise<void> {
  const kvStore = await getKVStore()
  const userKey = await deriveUserKey(userId)
  const encryptedData = await encrypt(JSON.stringify(data), userKey)
  await kvStore.set(`settings:${userId}`, encryptedData)
}

// GET /api/settings - Get all user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getSettingsData(session.user.id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to get settings:', error)
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

    // Get current settings
    const currentSettings = await getSettingsData(session.user.id)

    // Merge updates with current settings
    const updatedSettings = { ...currentSettings, ...updates }

    // Remove any keys with null or undefined values
    Object.keys(updatedSettings).forEach((key) => {
      if (updatedSettings[key] === null || updatedSettings[key] === undefined) {
        delete updatedSettings[key]
      }
    })

    // Save updated settings
    await saveSettingsData(session.user.id, updatedSettings)

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Failed to update settings:', error)
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
      const currentSettings = await getSettingsData(session.user.id)
      delete currentSettings[key]
      await saveSettingsData(session.user.id, currentSettings)
      return NextResponse.json({ success: true, settings: currentSettings })
    } else {
      // Delete all settings
      const kvStore = await getKVStore()
      await kvStore.del(`settings:${session.user.id}`)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Failed to delete settings:', error)
    return NextResponse.json(
      { error: 'Failed to delete settings' },
      { status: 500 }
    )
  }
}
