/**
 * Default Values and Constants
 *
 * Centralized definition of default values used across the application
 * to eliminate duplication and ensure consistency.
 */

import { SystemInstruction } from '../types/settings'

/**
 * Default system instruction that's always available
 */
export const DEFAULT_SYSTEM_INSTRUCTION: SystemInstruction = {
  id: 'default',
  name: 'default',
  content:
    'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.',
  enabled: true,
}

/**
 * AI Generation defaults
 */
export const AI_DEFAULTS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 8192,
  TOP_P: 1.0,
  FREQUENCY_PENALTY: 0.0,
  PRESENCE_PENALTY: 0.0,
} as const

/**
 * System instruction limits and validation
 */
export const SYSTEM_INSTRUCTION_LIMITS = {
  MAX_CONTENT_CHARS: 6000,
  MAX_NAME_CHARS: 20,
  MAX_INSTRUCTIONS: 10,
} as const

/**
 * Temperature range configuration
 */
export const TEMPERATURE_CONFIG = {
  MIN: 0.1,
  MAX: 1.0,
  STEP: 0.1,
  DEFAULT: AI_DEFAULTS.TEMPERATURE,
} as const

/**
 * Common MIME types for file attachments
 */
export const MIME_TYPES = {
  TEXT: ['text/plain'],
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  AUDIO: ['audio/wav', 'audio/mp3'],
} as const

/**
 * Pre-defined MIME type combinations for different model capabilities
 */
export const SUPPORTED_MIME_COMBINATIONS = {
  TEXT_ONLY: MIME_TYPES.TEXT,
  TEXT_AND_IMAGES: [...MIME_TYPES.TEXT, ...MIME_TYPES.IMAGES],
  MULTIMODAL: [...MIME_TYPES.TEXT, ...MIME_TYPES.IMAGES, ...MIME_TYPES.AUDIO],
} as const

/**
 * UI Configuration defaults
 */
export const UI_DEFAULTS = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  TOAST_DURATION: 3000,
} as const

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  SYSTEM_INSTRUCTION_NAME: /^[a-z0-9-_]+$/,
  API_KEY_OPENAI: /^sk-[a-zA-Z0-9]+$/,
  // Add more patterns as needed
} as const

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please try again.',
  AUTHENTICATION_REQUIRED: 'Please sign in to continue.',
  INVALID_API_KEY: 'Invalid API key format.',
  CONTENT_TOO_LONG: `Content must be ${SYSTEM_INSTRUCTION_LIMITS.MAX_CONTENT_CHARS} characters or less`,
  NAME_TOO_LONG: `Name must be ${SYSTEM_INSTRUCTION_LIMITS.MAX_NAME_CHARS} characters or less`,
  NAME_INVALID_FORMAT:
    'Name can only contain lowercase letters, numbers, hyphens, and underscores',
  NAME_REQUIRED: 'Name is required',
  CONTENT_REQUIRED: 'Content is required',
  NAME_MUST_BE_LOWERCASE: 'Name must be lowercase',
  NAME_MUST_BE_UNIQUE: 'Name must be unique',
} as const
