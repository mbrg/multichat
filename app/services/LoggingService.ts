/**
 * Serverless Logging Service for Vercel
 *
 * Provides structured logging that works with Vercel's serverless environment:
 * - Direct console output for Vercel log aggregation
 * - Integration with VercelMonitoring for metrics
 * - No state, no in-memory storage, no singletons
 * - Security-first approach (no sensitive data logging)
 */

import type { AppError } from '../types/errors'
import {
  logError,
  logBusinessEvent,
  logAIOperation,
  logPerformance,
  logSecurityEvent,
} from './monitoring/VercelMonitoring'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogContext {
  requestId?: string
  userId?: string
  sessionId?: string
  provider?: string
  model?: string
  operationId?: string
  duration?: number
  [key: string]: unknown
}

/**
 * Serverless logging service - all methods are stateless
 */
export class LoggingService {
  private static instance: LoggingService | null = null
  private logLevel: LogLevel = 'info'

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel
  }

  /**
   * Singleton pattern for API compatibility
   */
  static getInstance(logLevel?: LogLevel): LoggingService {
    if (!this.instance) {
      this.instance = new LoggingService(logLevel)
    }
    return this.instance
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    this.instance = null
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  /**
   * Debug logging
   */
  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context)
  }

  /**
   * Info logging
   */
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context)
  }

  /**
   * Warning logging
   */
  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context)
  }

  /**
   * Error logging
   */
  error(
    message: string,
    error?: Error | AppError,
    context: LogContext = {}
  ): void {
    const errorDetails = error
      ? {
          type: 'type' in error ? (error as AppError).type : error.name,
          message: error.message,
          stack: error.stack,
          retryable:
            'retryable' in error ? (error as AppError).retryable : undefined,
        }
      : undefined

    // Log to console for Vercel
    console.error('🚨 ERROR', {
      message,
      ...this.sanitizeContext(context),
      ...(errorDetails && { error: errorDetails }),
    })

    // Also use VercelMonitoring for structured error logging
    if (error) {
      logError(error, context)
    }
  }

  /**
   * Critical logging
   */
  critical(
    message: string,
    error?: Error | AppError,
    context: LogContext = {}
  ): void {
    this.log('critical', message, context)
    if (error) {
      logError(error, { severity: 'critical', ...context })
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context: LogContext = {}
  ): void {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    }

    if (levels[level] < levels[this.logLevel]) {
      return
    }

    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.sanitizeContext(context),
    }

    // Log to appropriate console method
    switch (level) {
      case 'debug':
        console.debug('🔍 DEBUG', logData)
        break
      case 'info':
        console.log('ℹ️ INFO', logData)
        break
      case 'warn':
        console.warn('⚠️ WARN', logData)
        break
      case 'error':
        console.error('❌ ERROR', logData)
        break
      case 'critical':
        console.error('🚨 CRITICAL', logData)
        break
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(metrics: {
    operation: string
    duration: number
    success?: boolean
    provider?: string
    model?: string
    metadata?: Record<string, unknown>
  }): void {
    logPerformance(metrics.operation, metrics.duration, 'ms')
    this.debug(`Performance: ${metrics.operation}`, {
      duration: metrics.duration,
      success: metrics.success,
      provider: metrics.provider,
      model: metrics.model,
      ...metrics.metadata,
    })
  }

  /**
   * Log business metrics
   */
  logBusinessMetric(
    event: string,
    value?: number,
    metadata: Record<string, unknown> = {}
  ): void {
    logBusinessEvent({ event, value, metadata })
  }

  /**
   * Log AI provider interaction
   */
  logProviderInteraction(
    provider: string,
    model: string,
    operation: 'generate' | 'validate' | 'stream',
    success: boolean,
    duration: number,
    context: LogContext = {}
  ): void {
    logAIOperation({
      provider,
      model,
      operation,
      duration,
      success,
      error: context.error as string | undefined,
    })
  }

  /**
   * Log streaming metrics
   */
  logStreamingMetrics(
    provider: string,
    model: string,
    tokensReceived: number,
    duration: number,
    interrupted: boolean = false,
    context: LogContext = {}
  ): void {
    const tokensPerSecond =
      duration > 0 ? (tokensReceived / duration) * 1000 : 0

    logBusinessEvent({
      event: 'streaming_session',
      value: tokensReceived,
      metadata: {
        provider,
        model,
        duration,
        tokensPerSecond,
        interrupted,
      },
    })
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: string, context: LogContext = {}): void {
    logSecurityEvent(event, context)
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context }

    // Remove sensitive fields
    const sensitiveFields = ['apiKey', 'password', 'token', 'secret', 'key']
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }
}

/**
 * Export singleton instance and convenience functions
 */
const getLogger = () => LoggingService.getInstance()

export const logger = getLogger()

/**
 * Convenience functions for common logging patterns
 */
export const log = {
  debug: (message: string, context?: LogContext) =>
    getLogger().debug(message, context),
  info: (message: string, context?: LogContext) =>
    getLogger().info(message, context),
  warn: (message: string, context?: LogContext) =>
    getLogger().warn(message, context),
  error: (message: string, error?: AppError | Error, context?: LogContext) =>
    getLogger().error(message, error, context),
  critical: (message: string, error?: AppError | Error, context?: LogContext) =>
    getLogger().critical(message, error, context),
  performance: (metrics: {
    operation: string
    duration: number
    success?: boolean
    provider?: string
    model?: string
    metadata?: Record<string, unknown>
  }) => getLogger().logPerformance(metrics),
  business: (
    event: string,
    value?: number,
    metadata?: Record<string, unknown>
  ) => getLogger().logBusinessMetric(event, value, metadata),
  provider: (
    provider: string,
    model: string,
    operation: 'generate' | 'validate' | 'stream',
    success: boolean,
    duration: number,
    context?: LogContext
  ) =>
    getLogger().logProviderInteraction(
      provider,
      model,
      operation,
      success,
      duration,
      context
    ),
  streaming: (
    provider: string,
    model: string,
    tokensReceived: number,
    duration: number,
    interrupted?: boolean,
    context?: LogContext
  ) =>
    getLogger().logStreamingMetrics(
      provider,
      model,
      tokensReceived,
      duration,
      interrupted,
      context
    ),
}
