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
 * Conversation migration error types
 */
export class ConversationMigrationError extends Error {
  constructor(
    message: string,
    public conversationId: string,
    public fromVersion: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ConversationMigrationError'
  }
}

export class ConversationSchemaError extends Error {
  constructor(
    message: string,
    public conversationId: string,
    public invalidFields: string[]
  ) {
    super(message)
    this.name = 'ConversationSchemaError'
  }
}

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
    const error = new ConversationMigrationError(
      `Unsupported conversation version: ${version}`,
      data.id,
      version
    )
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

  // Future migration chains would go here
  let migratedData = data
  
  // Example future migration: v1.0.0 → v1.1.0
  // if (version === '1.0.0' && getCurrentVersion() >= '1.1.0') {
  //   migratedData = migrateV1ToV1_1(migratedData)
  // }
  
  // Example future migration: v1.1.0 → v1.2.0  
  // if (migratedData.version === '1.1.0' && getCurrentVersion() >= '1.2.0') {
  //   migratedData = migrateV1_1ToV1_2(migratedData)
  // }

  log.info('Migration completed', {
    conversationId: data.id,
    fromVersion: version,
    toVersion: migratedData.version || getCurrentVersion(),
  })
  
  return migratedData as SharedConversation
}

/**
 * Validates conversation schema after migration
 */
export function validateConversationSchema(data: SharedConversation, throwOnError = false): boolean {
  const requiredFields = ['id', 'version', 'createdAt', 'creatorId', 'messages', 'possibilities', 'metadata']
  const missingFields: string[] = []
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      missingFields.push(field)
    }
  }

  if (missingFields.length > 0) {
    const error = new ConversationSchemaError(
      `Missing required fields: ${missingFields.join(', ')}`,
      data.id,
      missingFields
    )
    log.error('Missing required fields in conversation schema', error, {
      conversationId: data.id,
      missingFields,
    })
    
    if (throwOnError) throw error
    return false
  }

  if (!isSupportedVersion(data.version)) {
    const error = new ConversationSchemaError(
      `Invalid version: ${data.version}`,
      data.id,
      ['version']
    )
    log.error('Invalid version in conversation schema', error, {
      conversationId: data.id,
      version: data.version,
      supportedVersions: CONVERSATION_SCHEMA.SUPPORTED_VERSIONS,
    })
    
    if (throwOnError) throw error
    return false
  }

  return true
}