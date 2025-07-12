import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  pbkdf2,
} from 'crypto'
import { promisify } from 'util'

const pbkdf2Async = promisify(pbkdf2)

// Derive a user-specific encryption key from user ID and dedicated encryption secret
export async function deriveUserKey(userId: string): Promise<Buffer> {
  const encryptionSecret = process.env.KV_ENCRYPTION_KEY
  if (!encryptionSecret) {
    throw new Error('KV_ENCRYPTION_KEY environment variable is required')
  }

  // Create a salt from the user ID (deterministic but unique per user)
  const salt = createHash('sha256').update(userId).digest()

  // Use PBKDF2 with 100,000 iterations for better security
  const key = await pbkdf2Async(encryptionSecret, salt, 100000, 32, 'sha256')

  return key
}

// Encrypt data with user-specific key
export async function encrypt(data: string, key: Buffer): Promise<string> {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

// Decrypt data with user-specific key
export async function decrypt(
  encryptedData: string,
  key: Buffer
): Promise<string> {
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
