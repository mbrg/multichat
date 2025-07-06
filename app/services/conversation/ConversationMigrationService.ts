/**
 * Conversation Migration Service
 * 
 * Handles migration of conversation data between schema versions to maintain
 * backward compatibility with stored conversations.
 */

import type { SharedConversation } from '../../types/conversation'
import { CONVERSATION_SCHEMA } from '../../constants/defaults'
import { log } from '../LoggingService'

/**
 * Legacy conversation format (pre-versioning)
 */
interface LegacySharedConversation {
  id: string
  createdAt: number
  creatorId: string
  messages: any[]
  possibilities: any[]
  metadata: {
    title?: string
    description?: string
  }
  blobUrl?: string
  // Note: No version field
}

/**
 * Validates if a version is supported
 */
export function isSupportedVersion(version: string): version is typeof CONVERSATION_SCHEMA.SUPPORTED_VERSIONS[number] {
  return CONVERSATION_SCHEMA.SUPPORTED_VERSIONS.includes(version as any)
}

/**
 * Gets the current schema version
 */
export function getCurrentVersion(): string {
  return CONVERSATION_SCHEMA.CURRENT_VERSION
}

/**
 * Determines the version of a conversation object
 */
export function detectVersion(data: any): string {
  // If no version field exists, assume legacy format
  if (!data.version) {
    return 'legacy'
  }
  
  return data.version
}

/**
 * Migrates a legacy conversation to v1.0.0 format
 */
function migrateLegacyToV1(data: LegacySharedConversation): SharedConversation {
  log.info('Migrating legacy conversation to v1.0.0', {
    conversationId: data.id,
    createdAt: data.createdAt,
  })

  return {
    ...data,
    version: '1.0.0',
  }
}

/**
 * Migrates conversation data to the current schema version
 */
export function migrateConversation(data: any): SharedConversation {
  const version = detectVersion(data)
  
  log.debug('Processing conversation migration', {
    conversationId: data.id,
    detectedVersion: version,
    targetVersion: getCurrentVersion(),
  })

  // Handle legacy (pre-versioning) format
  if (version === 'legacy') {
    const migrated = migrateLegacyToV1(data as LegacySharedConversation)
    log.info('Successfully migrated legacy conversation', {
      conversationId: migrated.id,
      fromVersion: 'legacy',
      toVersion: migrated.version,
    })
    return migrated
  }

  // Handle unsupported versions
  if (!isSupportedVersion(version)) {
    const error = new Error(`Unsupported conversation version: ${version}`)
    log.error('Unsupported conversation version', error, {
      conversationId: data.id,
      version,
      supportedVersions: CONVERSATION_SCHEMA.SUPPORTED_VERSIONS,
    })
    throw error
  }

  // Already current version
  if (version === getCurrentVersion()) {
    return data as SharedConversation
  }

  // Future migration logic would go here
  // Example: if (version === '1.0.0' && getCurrentVersion() === '1.1.0') { ... }

  log.info('No migration needed', {
    conversationId: data.id,
    version,
  })
  
  return data as SharedConversation
}

/**
 * Validates conversation schema after migration
 */
export function validateConversationSchema(data: SharedConversation): boolean {
  const requiredFields = ['id', 'version', 'createdAt', 'creatorId', 'messages', 'possibilities', 'metadata']
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      log.error('Missing required field in conversation schema', undefined, {
        conversationId: data.id,
        missingField: field,
      })
      return false
    }
  }

  if (!isSupportedVersion(data.version)) {
    log.error('Invalid version in conversation schema', undefined, {
      conversationId: data.id,
      version: data.version,
      supportedVersions: CONVERSATION_SCHEMA.SUPPORTED_VERSIONS,
    })
    return false
  }

  return true
}