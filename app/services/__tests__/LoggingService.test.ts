import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoggingService, logger, log } from '../LoggingService'
import { ProviderError } from '../../types/errors'

describe('LoggingService', () => {
  let loggingService: LoggingService

  beforeEach(() => {
    LoggingService.reset()
    loggingService = new LoggingService('debug')
    vi.clearAllMocks()

    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('basic logging', () => {
    it('should log messages at different levels', () => {
      loggingService.debug('Debug message')
      loggingService.info('Info message')
      loggingService.warn('Warning message')
      loggingService.error('Error message')
      loggingService.critical('Critical message')

      const logs = loggingService.getRecentLogs(10)
      expect(logs).toHaveLength(5)

      expect(logs[0].level).toBe('debug')
      expect(logs[0].message).toBe('Debug message')
      expect(logs[4].level).toBe('critical')
      expect(logs[4].message).toBe('Critical message')
    })

    it('should respect log level filtering', () => {
      const infoLogger = new LoggingService('info')

      infoLogger.debug('Debug message')
      infoLogger.info('Info message')
      infoLogger.warn('Warning message')

      const logs = infoLogger.getRecentLogs(10)
      expect(logs).toHaveLength(2) // Only info and warn should be logged
      expect(logs[0].level).toBe('info')
      expect(logs[1].level).toBe('warn')
    })

    it('should include context in logs', () => {
      const context = {
        userId: 'user-123',
        requestId: 'req-456',
        operation: 'test',
      }

      loggingService.info('Test message', context)

      const logs = loggingService.getRecentLogs(1)
      expect(logs[0].context.requestId).toBe('req-456')
      expect(logs[0].context.operation).toBe('test')
      // userId should be hashed for privacy
      expect(logs[0].context.userId).not.toBe('user-123')
      expect(logs[0].context.userId).toBeDefined()
    })
  })

  describe('error logging', () => {
    it('should log AppError with structured information', () => {
      const providerError = new ProviderError(
        'OpenAI',
        'Rate limit exceeded',
        429
      )

      loggingService.error('Provider error occurred', providerError)

      const logs = loggingService.getRecentLogs(1)
      expect(logs[0].error?.type).toBe('provider')
      expect(logs[0].error?.message).toBe('OpenAI: Rate limit exceeded')
      expect(logs[0].error?.retryable).toBe(true)
    })

    it('should log generic Error', () => {
      const genericError = new Error('Something went wrong')

      loggingService.error('Generic error occurred', genericError)

      const logs = loggingService.getRecentLogs(1)
      expect(logs[0].error?.type).toBe('generic')
      expect(logs[0].error?.message).toBe('Something went wrong')
    })

    it('should output critical errors to console immediately', () => {
      const criticalError = new Error('Critical failure')

      loggingService.critical('Critical error occurred', criticalError)

      expect(console.error).toHaveBeenCalledWith(
        '[CRITICAL]',
        'Critical error occurred',
        expect.objectContaining({
          context: {},
          error: expect.objectContaining({
            message: 'Critical failure',
          }),
        })
      )
    })
  })

  describe('performance metrics', () => {
    it('should log performance metrics', () => {
      loggingService.logPerformance({
        operation: 'api_call',
        duration: 250,
        success: true,
        provider: 'OpenAI',
        model: 'gpt-4',
      })

      const metrics = loggingService.getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].operation).toBe('api_call')
      expect(metrics[0].duration).toBe(250)
      expect(metrics[0].success).toBe(true)
      expect(metrics[0].provider).toBe('OpenAI')
    })

    it('should warn about slow operations', () => {
      loggingService.logPerformance({
        operation: 'slow_operation',
        duration: 6000, // 6 seconds
        success: true,
      })

      const logs = loggingService.getRecentLogs(10)
      const warningLog = logs.find((log) => log.level === 'warn')
      expect(warningLog).toBeDefined()
      expect(warningLog?.message).toBe('Slow operation detected')
    })
  })

  describe('business metrics', () => {
    it('should log business metrics', () => {
      loggingService.logBusinessMetric('user_signup', 1, {
        source: 'organic',
        plan: 'free',
      })

      const metrics = loggingService.getBusinessMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].event).toBe('user_signup')
      expect(metrics[0].value).toBe(1)
      expect(metrics[0].metadata.source).toBe('organic')
    })
  })

  describe('provider interaction logging', () => {
    it('should log provider interactions', () => {
      loggingService.logProviderInteraction(
        'OpenAI',
        'gpt-4',
        'generate',
        true,
        500,
        { requestId: 'req-123' }
      )

      const performanceMetrics = loggingService.getPerformanceMetrics()
      expect(performanceMetrics).toHaveLength(1)
      expect(performanceMetrics[0].operation).toBe('OpenAI_generate')

      const logs = loggingService.getRecentLogs(10)
      const infoLog = logs.find((log) =>
        log.message.includes('Provider interaction')
      )
      expect(infoLog).toBeDefined()
      expect(infoLog?.context.provider).toBe('OpenAI')
      expect(infoLog?.context.model).toBe('gpt-4')
    })
  })

  describe('streaming metrics', () => {
    it('should log streaming metrics', () => {
      loggingService.logStreamingMetrics(
        'OpenAI',
        'gpt-4',
        150, // tokens
        3000, // 3 seconds
        false // not interrupted
      )

      const businessMetrics = loggingService.getBusinessMetrics()
      expect(businessMetrics).toHaveLength(1)
      expect(businessMetrics[0].event).toBe('streaming_session')
      expect(businessMetrics[0].value).toBe(150)
      expect(businessMetrics[0].metadata.tokensPerSecond).toBe(50) // 150 tokens / 3 seconds
    })

    it('should handle interrupted streaming', () => {
      loggingService.logStreamingMetrics(
        'OpenAI',
        'gpt-4',
        75,
        1500,
        true // interrupted
      )

      const logs = loggingService.getRecentLogs(10)
      const infoLog = logs.find((log) =>
        log.message.includes('Streaming session completed')
      )
      expect(infoLog?.context.interrupted).toBe(true)
    })
  })

  describe('user behavior logging', () => {
    it('should log user actions with sanitized data', () => {
      loggingService.logUserBehavior('message_sent', 'user-123', {
        messageLength: 50,
        hasAttachments: false,
        apiKey: 'secret-key', // This should be removed
      })

      const businessMetrics = loggingService.getBusinessMetrics()
      expect(businessMetrics[0].metadata.messageLength).toBe(50)
      expect(businessMetrics[0].metadata.apiKey).toBeUndefined()

      const logs = loggingService.getRecentLogs(10)
      const actionLog = logs.find((log) => log.message.includes('User action'))
      expect(actionLog?.context.userId).toBeDefined()
      expect(actionLog?.context.userId).not.toBe('user-123') // Should be hashed
    })
  })

  describe('data sanitization', () => {
    it('should remove sensitive information from context', () => {
      loggingService.info('Test message', {
        userId: 'user-123',
        apiKey: 'secret-key',
        token: 'auth-token',
        password: 'user-password',
        normalData: 'safe-data',
      })

      const logs = loggingService.getRecentLogs(1)
      const context = logs[0].context

      expect(context.apiKey).toBeUndefined()
      expect(context.token).toBeUndefined()
      expect(context.password).toBeUndefined()
      expect(context.normalData).toBe('safe-data')
      expect(context.userId).toBeDefined()
      expect(context.userId).not.toBe('user-123')
    })
  })

  describe('log export', () => {
    it('should export logs as JSON', () => {
      loggingService.info('Test message 1')
      loggingService.warn('Test message 2')

      const exportedLogs = loggingService.exportLogs('json')
      const parsed = JSON.parse(exportedLogs)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].message).toBe('Test message 1')
    })

    it('should export logs as CSV', () => {
      loggingService.info('Test message')

      const exportedLogs = loggingService.exportLogs('csv')
      const lines = exportedLogs.split('\n')

      expect(lines[0]).toBe('"timestamp","level","message","context","error"')
      expect(lines[1]).toContain('info')
      expect(lines[1]).toContain('Test message')
    })
  })

  describe('memory management', () => {
    it('should limit log entries to prevent memory issues', () => {
      const smallLogger = new LoggingService('debug')
      // Override maxLogEntries for testing
      smallLogger['maxLogEntries'] = 5

      // Add more logs than the limit
      for (let i = 0; i < 10; i++) {
        smallLogger.info(`Message ${i}`)
      }

      const logs = smallLogger.getRecentLogs(20)
      expect(logs.length).toBe(5)
      // Should keep the most recent logs
      expect(logs[0].message).toBe('Message 5')
      expect(logs[4].message).toBe('Message 9')
    })

    it('should filter metrics by date', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      loggingService.logPerformance({
        operation: 'old_operation',
        duration: 100,
        success: true,
      })

      // Manually set timestamp for testing
      const metrics = loggingService.getPerformanceMetrics()
      metrics[0].timestamp = yesterday

      loggingService.logPerformance({
        operation: 'new_operation',
        duration: 200,
        success: true,
      })

      const recentMetrics = loggingService.getPerformanceMetrics(
        new Date(Date.now() - 60 * 60 * 1000)
      )
      expect(recentMetrics).toHaveLength(1)
      expect(recentMetrics[0].operation).toBe('new_operation')
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LoggingService.getInstance()
      const instance2 = LoggingService.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should reset singleton', () => {
      const instance1 = LoggingService.getInstance()
      LoggingService.reset()
      const instance2 = LoggingService.getInstance()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('convenience functions', () => {
    it('should provide global log convenience functions', () => {
      // Reset singleton to get a fresh instance
      LoggingService.reset()

      log.info('Test info message')
      log.debug('Test debug message')
      log.warn('Test warning message')

      // These should use the global logger instance
      const globalLogger = LoggingService.getInstance()
      const logs = globalLogger.getRecentLogs(10)

      expect(logs.some((l) => l.message === 'Test info message')).toBe(true)
    })

    it('should provide performance logging convenience', () => {
      // Reset singleton to get a fresh instance
      LoggingService.reset()

      log.performance({
        operation: 'test_operation',
        duration: 150,
        success: true,
      })

      const globalLogger = LoggingService.getInstance()
      const metrics = globalLogger.getPerformanceMetrics()

      expect(metrics.some((m) => m.operation === 'test_operation')).toBe(true)
    })
  })
})
