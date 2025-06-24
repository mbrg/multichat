import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto'
import { getKVStore } from '../../services/kv'

// Derive a user-specific encryption key from user ID and dedicated encryption secret
function deriveUserKey(userId: string): Buffer {
  const encryptionSecret = process.env.KV_ENCRYPTION_KEY
  if (!encryptionSecret) {
    throw new Error('KV_ENCRYPTION_KEY environment variable is required')
  }

  return createHash('sha256')
    .update(userId + encryptionSecret)
    .digest()
}

// Encrypt data with user-specific key
function encryptData(data: string, userId: string): string {
  const key = deriveUserKey(userId)
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

// Decrypt data with user-specific key
function decryptData(encryptedData: string, userId: string): string {
  const key = deriveUserKey(userId)
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// GET - Retrieve user's secrets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userKey = `secrets:${userId}`

    const kvStore = await getKVStore()
    console.log(
      `[SecretsAPI] Using KV implementation: ${kvStore.getImplementationName()}`
    )

    const encryptedSecrets = await kvStore.get<string>(userKey)

    if (!encryptedSecrets) {
      return NextResponse.json({ secrets: {} })
    }

    const decryptedSecrets = decryptData(encryptedSecrets, userId)
    const secrets = JSON.parse(decryptedSecrets)

    return NextResponse.json({ secrets })
  } catch (error) {
    console.error('Error retrieving secrets:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve secrets' },
      { status: 500 }
    )
  }
}

// POST - Store user's secrets
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { secrets } = await request.json()

    if (!secrets || typeof secrets !== 'object') {
      return NextResponse.json(
        { error: 'Invalid secrets format' },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const userKey = `secrets:${userId}`

    const secretsString = JSON.stringify(secrets)
    const encryptedSecrets = encryptData(secretsString, userId)

    const kvStore = await getKVStore()
    console.log(
      `[SecretsAPI] Using KV implementation: ${kvStore.getImplementationName()}`
    )

    await kvStore.set(userKey, encryptedSecrets)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error storing secrets:', error)
    return NextResponse.json(
      { error: 'Failed to store secrets' },
      { status: 500 }
    )
  }
}

// DELETE - Remove specific secret or all secrets
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userKey = `secrets:${userId}`

    const { searchParams } = new URL(request.url)
    const secretKey = searchParams.get('key')

    const kvStore = await getKVStore()
    console.log(
      `[SecretsAPI] Using KV implementation: ${kvStore.getImplementationName()}`
    )

    if (secretKey) {
      // Remove specific secret
      const encryptedSecrets = await kvStore.get<string>(userKey)
      if (encryptedSecrets) {
        const decryptedSecrets = decryptData(encryptedSecrets, userId)
        const secrets = JSON.parse(decryptedSecrets)

        delete secrets[secretKey]

        const updatedSecretsString = JSON.stringify(secrets)
        const updatedEncryptedSecrets = encryptData(
          updatedSecretsString,
          userId
        )

        await kvStore.set(userKey, updatedEncryptedSecrets)
      }
    } else {
      // Remove all secrets
      await kvStore.del(userKey)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting secrets:', error)
    return NextResponse.json(
      { error: 'Failed to delete secrets' },
      { status: 500 }
    )
  }
}
