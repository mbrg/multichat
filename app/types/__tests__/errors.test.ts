import { describe, it, expect } from 'vitest'
import {
  AppError,
  ConnectionError,
  TimeoutError,
  ProviderError,
  AuthError,
  ValidationError,
  RateLimitError,
  StreamingError,
  ParsingError,
  NetworkError,
  UnknownError,
  ErrorFactory,
  isRetryableError,
  isErrorOfType,
} from '../errors'

describe('Error Types', () => {
  describe('ConnectionError', () => {
    it('should create connection error with correct properties', () => {
      const error = new ConnectionError('Connection failed', {
        requestId: 'req-123',
      })

      expect(error.type).toBe('connection')
      expect(error.severity).toBe('medium')
      expect(error.retryable).toBe(true)
      expect(error.message).toBe('Connection failed')
      expect(error.metadata.requestId).toBe('req-123')
      expect(error.getUserMessage()).toBe(
        'Connection failed. Please check your internet connection and try again.'
      )
    })
  })

  describe('TimeoutError', () => {
    it('should create timeout error with duration', () => {
      const error = new TimeoutError(5000)

      expect(error.type).toBe('timeout')
      expect(error.message).toBe('Operation timed out after 5000ms')
      expect(error.retryable).toBe(true)
      expect(error.getUserMessage()).toBe(
        'The request took too long to complete. Please try again.'
      )
    })
  })

  describe('ProviderError', () => {
    it('should create provider error with status code', () => {
      const error = new ProviderError('OpenAI', 'Rate limit exceeded', 429)

      expect(error.type).toBe('provider')
      expect(error.severity).toBe('medium')
      expect(error.retryable).toBe(true)
      expect(error.statusCode).toBe(429)
      expect(error.metadata.provider).toBe('OpenAI')
    })

    it('should determine severity based on status code', () => {
      const serverError = new ProviderError('OpenAI', 'Server error', 500)
      const clientError = new ProviderError('OpenAI', 'Bad request', 400)
      const authError = new ProviderError('OpenAI', 'Unauthorized', 401)

      expect(serverError.severity).toBe('high')
      expect(clientError.severity).toBe('medium')
      expect(authError.severity).toBe('medium')
    })

    it('should determine retryability based on status code', () => {
      const serverError = new ProviderError('OpenAI', 'Server error', 500)
      const rateLimitError = new ProviderError('OpenAI', 'Rate limit', 429)
      const authError = new ProviderError('OpenAI', 'Unauthorized', 401)

      expect(serverError.retryable).toBe(true)
      expect(rateLimitError.retryable).toBe(true)
      expect(authError.retryable).toBe(false)
    })

    it('should provide appropriate user messages', () => {
      const authError = new ProviderError('OpenAI', 'Unauthorized', 401)
      const rateLimitError = new ProviderError('OpenAI', 'Rate limit', 429)
      const quotaError = new ProviderError('OpenAI', 'Quota exceeded', 402)
      const serverError = new ProviderError('OpenAI', 'Server error', 500)

      expect(authError.getUserMessage()).toContain('API key is invalid')
      expect(rateLimitError.getUserMessage()).toContain('rate limit exceeded')
      expect(quotaError.getUserMessage()).toContain('quota exceeded')
      expect(serverError.getUserMessage()).toContain('temporarily unavailable')
    })
  })

  describe('ValidationError', () => {
    it('should create validation error with field information', () => {
      const error = new ValidationError(
        'email',
        'invalid-email',
        'must be valid email format'
      )

      expect(error.type).toBe('validation')
      expect(error.retryable).toBe(false)
      expect(error.metadata.additionalContext).toEqual({
        field: 'email',
        value: 'invalid-email',
        constraint: 'must be valid email format',
      })
      expect(error.getUserMessage()).toBe(
        'Invalid email: must be valid email format'
      )
    })
  })

  describe('RateLimitError', () => {
    it('should create rate limit error with retry time', () => {
      const error = new RateLimitError(60000)

      expect(error.type).toBe('rate_limit')
      expect(error.retryable).toBe(true)
      expect(error.getUserMessage()).toBe(
        'Rate limit exceeded. Please wait 60 seconds and try again.'
      )
    })
  })
})

describe('ErrorFactory', () => {
  describe('fromError', () => {
    it('should return AppError as-is', () => {
      const originalError = new ConnectionError('Connection failed')
      const result = ErrorFactory.fromError(originalError)

      expect(result).toBe(originalError)
    })

    it('should convert timeout error', () => {
      const error = new Error('Operation timed out')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(TimeoutError)
      expect(result.originalError).toBe(error)
    })

    it('should convert network error', () => {
      const error = new Error('Network request failed')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(NetworkError)
    })

    it('should convert auth error', () => {
      const error = new Error('Unauthorized access')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(AuthError)
    })

    it('should convert rate limit error', () => {
      const error = new Error('Too many requests')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(RateLimitError)
    })

    it('should convert parsing error', () => {
      const error = new Error('JSON parse error')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(ParsingError)
    })

    it('should default to unknown error', () => {
      const error = new Error('Something unexpected happened')
      const result = ErrorFactory.fromError(error)

      expect(result).toBeInstanceOf(UnknownError)
    })

    it('should handle non-Error objects', () => {
      const result = ErrorFactory.fromError('String error')

      expect(result).toBeInstanceOf(UnknownError)
      expect(result.message).toBe('String error')
    })

    it('should handle null/undefined', () => {
      const result = ErrorFactory.fromError(null)

      expect(result).toBeInstanceOf(UnknownError)
      expect(result.message).toBe('Unknown error occurred')
    })
  })

  describe('fromHttpResponse', () => {
    it('should create provider error from response', () => {
      const mockResponse = {
        status: 429,
        statusText: 'Too Many Requests',
      } as Response

      const result = ErrorFactory.fromHttpResponse('OpenAI', mockResponse)

      expect(result).toBeInstanceOf(ProviderError)
      expect(result.statusCode).toBe(429)
      expect(result.message).toBe('OpenAI: HTTP 429: Too Many Requests')
    })
  })

  describe('fromProviderResponse', () => {
    it('should create provider error from API response body', () => {
      const errorBody = {
        message: 'Invalid API key',
        type: 'authentication_error',
      }

      const result = ErrorFactory.fromProviderResponse('OpenAI', 401, errorBody)

      expect(result).toBeInstanceOf(ProviderError)
      expect(result.statusCode).toBe(401)
      expect(result.message).toBe('OpenAI: Invalid API key')
    })

    it('should handle different error body formats', () => {
      const errorBody1 = { error: 'Rate limit exceeded' }
      const errorBody2 = { message: 'Server error' }
      const errorBody3 = {}

      const result1 = ErrorFactory.fromProviderResponse(
        'OpenAI',
        429,
        errorBody1
      )
      const result2 = ErrorFactory.fromProviderResponse(
        'OpenAI',
        500,
        errorBody2
      )
      const result3 = ErrorFactory.fromProviderResponse(
        'OpenAI',
        400,
        errorBody3
      )

      expect(result1.message).toBe('OpenAI: Rate limit exceeded')
      expect(result2.message).toBe('OpenAI: Server error')
      expect(result3.message).toBe('OpenAI: API error')
    })
  })
})

describe('Type Guards', () => {
  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableError = new ConnectionError('Connection failed')
      const nonRetryableError = new AuthError('Unauthorized')
      const genericError = new Error('Generic error')

      expect(isRetryableError(retryableError)).toBe(true)
      expect(isRetryableError(nonRetryableError)).toBe(false)
      expect(isRetryableError(genericError)).toBe(false)
    })
  })

  describe('isErrorOfType', () => {
    it('should identify error types', () => {
      const connectionError = new ConnectionError('Connection failed')
      const authError = new AuthError('Unauthorized')
      const genericError = new Error('Generic error')

      expect(isErrorOfType(connectionError, 'connection')).toBe(true)
      expect(isErrorOfType(connectionError, 'auth')).toBe(false)
      expect(isErrorOfType(authError, 'auth')).toBe(true)
      expect(isErrorOfType(genericError, 'connection')).toBe(false)
    })
  })
})

describe('Error Retry Logic', () => {
  it('should determine retry eligibility', () => {
    const retryableError = new ConnectionError('Connection failed')
    const nonRetryableError = new AuthError('Unauthorized')

    expect(retryableError.shouldRetry(0, 3)).toBe(true)
    expect(retryableError.shouldRetry(2, 3)).toBe(true)
    expect(retryableError.shouldRetry(3, 3)).toBe(false)
    expect(nonRetryableError.shouldRetry(0, 3)).toBe(false)
  })
})

describe('Error Technical Details', () => {
  it('should provide comprehensive technical details', () => {
    const originalError = new Error('Original error')
    const error = new ProviderError(
      'OpenAI',
      'API error',
      500,
      {
        requestId: 'req-123',
        userId: 'user-456',
      },
      originalError
    )

    const details = error.getTechnicalDetails()

    expect(details.type).toBe('provider')
    expect(details.severity).toBe('high')
    expect(details.retryable).toBe(true)
    expect(details.message).toBe('OpenAI: API error')
    expect((details.metadata as any).requestId).toBe('req-123')
    expect(details.originalError).toBe('Original error')
    expect(details.stack).toBeDefined()
  })
})
