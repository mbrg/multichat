import { describe, it, expect } from 'vitest'
import {
  detectVersion,
  migrateConversation,
  validateConversationSchema,
  getCurrentVersion,
  isSupportedVersion,
  ConversationMigrationError,
  ConversationSchemaError,
} from '../ConversationMigrationService'
import type { SharedConversation } from '../../../types/conversation'

describe('ConversationMigrationService', () => {
  describe('version detection', () => {
    it('should detect legacy format when no version field exists', () => {
      const legacyData = {
        id: 'test-id',
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      expect(detectVersion(legacyData)).toBe('legacy')
    })

    it('should detect version from version field', () => {
      const versionedData = {
        id: 'test-id',
        version: '1.0.0',
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      expect(detectVersion(versionedData)).toBe('1.0.0')
    })
  })

  describe('version support', () => {
    it('should support current version', () => {
      expect(isSupportedVersion(getCurrentVersion())).toBe(true)
    })

    it('should not support unsupported versions', () => {
      expect(isSupportedVersion('0.9.0')).toBe(false)
      expect(isSupportedVersion('2.0.0')).toBe(false)
      expect(isSupportedVersion('invalid')).toBe(false)
    })
  })

  describe('migration', () => {
    it('should migrate legacy conversation to current version', () => {
      const legacyData = {
        id: 'test-id',
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello',
            timestamp: new Date('2024-01-01'),
          },
        ],
        possibilities: [],
        metadata: { title: 'Test Conversation' },
        blobUrl: 'https://example.com/blob',
      }

      const migrated = migrateConversation(legacyData)

      expect(migrated.version).toBe(getCurrentVersion())
      expect(migrated.id).toBe(legacyData.id)
      expect(migrated.createdAt).toBe(legacyData.createdAt)
      expect(migrated.creatorId).toBe(legacyData.creatorId)
      expect(migrated.messages).toEqual(legacyData.messages)
      expect(migrated.possibilities).toEqual(legacyData.possibilities)
      expect(migrated.metadata).toEqual(legacyData.metadata)
      expect(migrated.blobUrl).toBe(legacyData.blobUrl)
    })

    it('should return current version conversations unchanged', () => {
      const currentData: SharedConversation = {
        id: 'test-id',
        version: getCurrentVersion(),
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      const result = migrateConversation(currentData)
      expect(result).toEqual(currentData)
    })

    it('should throw ConversationMigrationError for unsupported versions', () => {
      const unsupportedData = {
        id: 'test-id',
        version: '999.0.0',
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      expect(() => migrateConversation(unsupportedData)).toThrow(ConversationMigrationError)
      
      try {
        migrateConversation(unsupportedData)
      } catch (error) {
        expect(error).toBeInstanceOf(ConversationMigrationError)
        expect((error as ConversationMigrationError).conversationId).toBe('test-id')
        expect((error as ConversationMigrationError).fromVersion).toBe('999.0.0')
      }
    })
  })

  describe('schema validation', () => {
    it('should validate complete conversation schema', () => {
      const validConversation: SharedConversation = {
        id: 'test-id',
        version: getCurrentVersion(),
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      expect(validateConversationSchema(validConversation)).toBe(true)
    })

    it('should reject conversation missing required fields', () => {
      const incompleteConversation = {
        id: 'test-id',
        version: getCurrentVersion(),
        // Missing other required fields
      } as any

      expect(validateConversationSchema(incompleteConversation)).toBe(false)
    })

    it('should reject conversation with unsupported version', () => {
      const invalidVersionConversation: any = {
        id: 'test-id',
        version: '999.0.0',
        createdAt: 1234567890,
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      expect(validateConversationSchema(invalidVersionConversation)).toBe(false)
    })

    it('should throw ConversationSchemaError when throwOnError is true', () => {
      const incompleteConversation = {
        id: 'test-id',
        version: getCurrentVersion(),
        // Missing other required fields
      } as any

      expect(() => validateConversationSchema(incompleteConversation, true)).toThrow(ConversationSchemaError)
      
      try {
        validateConversationSchema(incompleteConversation, true)
      } catch (error) {
        expect(error).toBeInstanceOf(ConversationSchemaError)
        expect((error as ConversationSchemaError).conversationId).toBe('test-id')
        expect((error as ConversationSchemaError).invalidFields.length).toBeGreaterThan(0)
      }
    })
  })

  describe('integration test', () => {
    it('should handle complete migration workflow', () => {
      // Start with legacy data
      const legacyData = {
        id: 'integration-test',
        createdAt: Date.now(),
        creatorId: 'user-integration',
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Test message',
            timestamp: new Date(),
          },
        ],
        possibilities: [
          {
            id: 'poss-1',
            content: 'Test possibility',
            model: 'gpt-4',
            temperature: 0.7,
            probability: 0.95,
            timestamp: new Date(),
          },
        ],
        metadata: { title: 'Integration Test' },
      }

      // Migrate and validate
      const migrated = migrateConversation(legacyData)
      const isValid = validateConversationSchema(migrated)

      expect(isValid).toBe(true)
      expect(migrated.version).toBe(getCurrentVersion())
      expect(detectVersion(migrated)).toBe(getCurrentVersion())
    })
  })
})