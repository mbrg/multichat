/**
 * Comprehensive Error Type System
 *
 * Explicit error types following Dave Farley's principles:
 * - Clear, actionable error information
 * - Retryable vs non-retryable classification
 * - Rich context for debugging and telemetry
 */

export type ErrorType =
  | 'connection'
  | 'timeout'
  | 'provider'
  | 'auth'
  | 'validation'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'streaming'
  | 'parsing'
  | 'network'
  | 'unknown'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorMetadata {
  timestamp: Date
  requestId?: string
  userId?: string
  provider?: string
  model?: string
  retryAttempt?: number
  duration?: number
  additionalContext?: Record<string, unknown>
}

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly type: ErrorType
  abstract readonly severity: ErrorSeverity
  abstract readonly retryable: boolean

  readonly metadata: ErrorMetadata
  readonly originalError?: Error

  constructor(
    message: string,
    metadata: Partial<ErrorMetadata> = {},
    originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.metadata = {
      timestamp: new Date(),
      ...metadata,
    }
    this.originalError = originalError

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Get user-friendly error message
   */
  abstract getUserMessage(): string

  /**
   * Get technical error details
   */
  getTechnicalDetails(): Record<string, unknown> {
    return {
      type: this.type,
      severity: this.severity,
      retryable: this.retryable,
      message: this.message,
      metadata: this.metadata,
      originalError: this.originalError?.message,
      stack: this.stack,
    }
  }

  /**
   * Determine if error should trigger retry
   */
  shouldRetry(retryAttempt: number, maxRetries: number = 3): boolean {
    return this.retryable && retryAttempt < maxRetries
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends AppError {
  readonly type = 'connection' as const
  readonly severity = 'medium' as const
  readonly retryable = true

  getUserMessage(): string {
    return 'Connection failed. Please check your internet connection and try again.'
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
  readonly type = 'timeout' as const
  readonly severity = 'medium' as const
  readonly retryable = true

  constructor(
    timeoutMs: number,
    metadata: Partial<ErrorMetadata> = {},
    originalError?: Error
  ) {
    super(`Operation timed out after ${timeoutMs}ms`, metadata, originalError)
  }

  getUserMessage(): string {
    return 'The request took too long to complete. Please try again.'
  }
}

/**
 * AI Provider errors
 */
export class ProviderError extends AppError {
  readonly type = 'provider' as const

  constructor(
    provider: string,
    message: string,
    public readonly statusCode?: number,
    metadata: Partial<ErrorMetadata> = {},
    originalError?: Error
  ) {
    super(`${provider}: ${message}`, { ...metadata, provider }, originalError)
  }

  get severity(): ErrorSeverity {
    if (this.statusCode && this.statusCode >= 500) return 'high'
    if (this.statusCode && this.statusCode >= 400) return 'medium'
    return 'low'
  }

  get retryable(): boolean {
    if (!this.statusCode) return false
    // Retry on server errors, rate limits, and timeouts
    return (
      this.statusCode >= 500 ||
      this.statusCode === 429 ||
      this.statusCode === 408
    )
  }

  getUserMessage(): string {
    if (this.statusCode === 401) {
      return `${this.metadata.provider} API key is invalid. Please check your API key in settings.`
    }
    if (this.statusCode === 429) {
      return `${this.metadata.provider} rate limit exceeded. Please wait a moment and try again.`
    }
    if (this.statusCode === 402) {
      return `${this.metadata.provider} quota exceeded. Please check your account usage.`
    }
    return `${this.metadata.provider} service is temporarily unavailable. Please try again.`
  }
}

/**
 * Authentication errors
 */
export class AuthError extends AppError {
  readonly type = 'auth' as const
  readonly severity = 'high' as const
  readonly retryable = false

  getUserMessage(): string {
    return 'Authentication failed. Please sign in and try again.'
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  readonly type = 'validation' as const
  readonly severity = 'low' as const
  readonly retryable = false

  constructor(
    field: string,
    value: unknown,
    constraint: string,
    metadata: Partial<ErrorMetadata> = {}
  ) {
    super(`Validation failed for ${field}: ${constraint}`, {
      ...metadata,
      additionalContext: { field, value, constraint },
    })
  }

  getUserMessage(): string {
    const context = this.metadata.additionalContext as {
      field: string
      constraint: string
    }
    return `Invalid ${context.field}: ${context.constraint}`
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends AppError {
  readonly type = 'rate_limit' as const
  readonly severity = 'medium' as const
  readonly retryable = true

  constructor(
    retryAfterMs: number,
    metadata: Partial<ErrorMetadata> = {},
    originalError?: Error
  ) {
    super(
      `Rate limit exceeded, retry after ${retryAfterMs}ms`,
      {
        ...metadata,
        additionalContext: { retryAfterMs },
      },
      originalError
    )
  }

  getUserMessage(): string {
    const retryAfterMs = (
      this.metadata.additionalContext as { retryAfterMs: number }
    ).retryAfterMs
    const retryAfterSec = Math.ceil(retryAfterMs / 1000)
    return `Rate limit exceeded. Please wait ${retryAfterSec} seconds and try again.`
  }
}

/**
 * Streaming errors
 */
export class StreamingError extends AppError {
  readonly type = 'streaming' as const
  readonly severity = 'medium' as const
  readonly retryable = true

  getUserMessage(): string {
    return 'Streaming connection was interrupted. Please try again.'
  }
}

/**
 * Parsing errors
 */
export class ParsingError extends AppError {
  readonly type = 'parsing' as const
  readonly severity = 'low' as const
  readonly retryable = false

  constructor(
    data: string,
    expectedFormat: string,
    metadata: Partial<ErrorMetadata> = {},
    originalError?: Error
  ) {
    super(
      `Failed to parse ${expectedFormat}`,
      {
        ...metadata,
        additionalContext: { data: data.slice(0, 100), expectedFormat },
      },
      originalError
    )
  }

  getUserMessage(): string {
    return 'Received invalid response format. Please try again.'
  }
}

/**
 * Network errors
 */
export class NetworkError extends AppError {
  readonly type = 'network' as const
  readonly severity = 'medium' as const
  readonly retryable = true

  getUserMessage(): string {
    return 'Network error occurred. Please check your connection and try again.'
  }
}

/**
 * Unknown errors (catch-all)
 */
export class UnknownError extends AppError {
  readonly type = 'unknown' as const
  readonly severity = 'high' as const
  readonly retryable = false

  getUserMessage(): string {
    return 'An unexpected error occurred. Please try again or contact support.'
  }
}

/**
 * Error factory for converting generic errors to typed errors
 */
export class ErrorFactory {
  /**
   * Convert a generic error to a typed application error
   */
  static fromError(
    error: unknown,
    metadata: Partial<ErrorMetadata> = {}
  ): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      // Analyze error message and type to determine appropriate error class
      const message = error.message.toLowerCase()

      if (message.includes('timeout') || message.includes('timed out')) {
        return new TimeoutError(0, metadata, error)
      }

      if (message.includes('network') || message.includes('fetch')) {
        return new NetworkError(error.message, metadata, error)
      }

      if (message.includes('connection') || message.includes('connect')) {
        return new ConnectionError(error.message, metadata, error)
      }

      if (message.includes('auth') || message.includes('unauthorized')) {
        return new AuthError(error.message, metadata, error)
      }

      if (
        message.includes('rate limit') ||
        message.includes('too many requests')
      ) {
        return new RateLimitError(60000, metadata, error) // Default 1 minute retry
      }

      if (
        message.includes('parse') ||
        message.includes('json') ||
        message.includes('syntax')
      ) {
        return new ParsingError('', 'JSON', metadata, error)
      }

      // Default to unknown error
      return new UnknownError(error.message, metadata, error)
    }

    // Non-Error objects
    const message = typeof error === 'string' ? error : 'Unknown error occurred'
    return new UnknownError(message, metadata)
  }

  /**
   * Create provider error from HTTP response
   */
  static fromHttpResponse(
    provider: string,
    response: Response,
    metadata: Partial<ErrorMetadata> = {}
  ): ProviderError {
    const message = `HTTP ${response.status}: ${response.statusText}`
    return new ProviderError(provider, message, response.status, metadata)
  }

  /**
   * Create provider error from API response body
   */
  static fromProviderResponse(
    provider: string,
    statusCode: number,
    errorBody: { message?: string; error?: string; type?: string },
    metadata: Partial<ErrorMetadata> = {}
  ): ProviderError {
    const message = errorBody.message || errorBody.error || 'API error'
    return new ProviderError(provider, message, statusCode, metadata)
  }
}

/**
 * Type guard for checking if error is retryable
 */
export function isRetryableError(
  error: unknown
): error is AppError & { retryable: true } {
  return error instanceof AppError && error.retryable
}

/**
 * Type guard for checking error type
 */
export function isErrorOfType<T extends ErrorType>(
  error: unknown,
  type: T
): error is AppError & { type: T } {
  return error instanceof AppError && error.type === type
}
