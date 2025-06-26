/**
 * Comprehensive Logging Service
 *
 * Structured logging system following Dave Farley's principles:
 * - Clear, searchable logs for debugging and monitoring
 * - Contextual information for troubleshooting
 * - Performance and business metrics tracking
 * - Security-first approach (no sensitive data logging)
 */

import type { AppError, ErrorType } from '../types/errors'

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

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context: LogContext
  error?: {
    type: string
    message: string
    stack?: string
    retryable?: boolean
  }
}

export interface PerformanceMetrics {
  operation: string
  duration: number
  success: boolean
  provider?: string
  model?: string
  timestamp: Date
}

export interface BusinessMetrics {
  event: string
  value?: number
  metadata: Record<string, unknown>
  timestamp: Date
}

/**
 * Main logging service
 */
export class LoggingService {
  private static instance: LoggingService | null = null
  private logLevel: LogLevel = 'info'
  private logs: LogEntry[] = []
  private performanceMetrics: PerformanceMetrics[] = []
  private businessMetrics: BusinessMetrics[] = []
  private maxLogEntries = 1000 // Keep last 1000 log entries in memory

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel
  }

  /**
   * Singleton pattern for global logging
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
    error?: AppError | Error,
    context: LogContext = {}
  ): void {
    const errorInfo = error ? this.formatError(error) : undefined
    this.log('error', message, context, errorInfo)
  }

  /**
   * Critical error logging
   */
  critical(
    message: string,
    error?: AppError | Error,
    context: LogContext = {}
  ): void {
    const errorInfo = error ? this.formatError(error) : undefined
    this.log('critical', message, context, errorInfo)

    // Critical errors should be immediately visible
    console.error('[CRITICAL]', message, { context, error: errorInfo })
  }

  /**
   * Log performance metrics
   */
  logPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const entry: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
    }

    this.performanceMetrics.push(entry)
    this.trimMetrics()

    // Log slow operations
    if (metrics.duration > 5000) {
      // 5 seconds
      this.warn('Slow operation detected', {
        operation: metrics.operation,
        duration: metrics.duration,
        provider: metrics.provider,
        model: metrics.model,
      })
    }

    this.debug('Performance metric recorded', {
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success,
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
    const entry: BusinessMetrics = {
      event,
      value,
      metadata,
      timestamp: new Date(),
    }

    this.businessMetrics.push(entry)
    this.trimMetrics()

    this.info('Business metric recorded', {
      event,
      value,
      ...metadata,
    })
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
    this.logPerformance({
      operation: `${provider}_${operation}`,
      duration,
      success,
      provider,
      model,
    })

    this.info(`Provider interaction: ${provider} ${operation}`, {
      provider,
      model,
      operation,
      success,
      duration,
      ...context,
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

    this.logBusinessMetric('streaming_session', tokensReceived, {
      provider,
      model,
      duration,
      tokensPerSecond,
      interrupted,
    })

    this.info('Streaming session completed', {
      provider,
      model,
      tokensReceived,
      duration,
      tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
      interrupted,
      ...context,
    })
  }

  /**
   * Log user behavior
   */
  logUserBehavior(
    action: string,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    // Remove sensitive information
    const sanitizedMetadata = this.sanitizeMetadata(metadata)

    this.logBusinessMetric('user_action', 1, {
      action,
      ...sanitizedMetadata,
    })

    this.info(`User action: ${action}`, {
      userId: userId ? this.hashUserId(userId) : undefined,
      ...sanitizedMetadata,
    })
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(since?: Date): PerformanceMetrics[] {
    if (!since) return this.performanceMetrics
    return this.performanceMetrics.filter((m) => m.timestamp >= since)
  }

  /**
   * Get business metrics summary
   */
  getBusinessMetrics(since?: Date): BusinessMetrics[] {
    if (!since) return this.businessMetrics
    return this.businessMetrics.filter((m) => m.timestamp >= since)
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportLogsAsCSV()
    }
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context: LogContext,
    error?: LogEntry['error']
  ): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.sanitizeContext(context),
      error,
    }

    this.logs.push(entry)
    this.trimLogs()

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(entry)
    }
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    }

    return levels[level] >= levels[this.logLevel]
  }

  /**
   * Format error for logging
   */
  private formatError(error: AppError | Error): LogEntry['error'] {
    if (error instanceof Error && 'type' in error) {
      const appError = error as AppError
      return {
        type: appError.type || 'unknown',
        message: appError.message,
        stack: appError.stack,
        retryable: 'retryable' in appError ? appError.retryable : undefined,
      }
    }

    return {
      type: 'generic',
      message: error.message,
      stack: error.stack,
    }
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context }

    // Remove or hash sensitive fields
    if (sanitized.userId) {
      sanitized.userId = this.hashUserId(sanitized.userId as string)
    }

    // Remove any keys that might contain sensitive data
    const sensitiveKeys = ['apiKey', 'token', 'password', 'secret', 'auth']
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        delete sanitized[key]
      }
    }

    return sanitized
  }

  /**
   * Sanitize metadata for business metrics
   */
  private sanitizeMetadata(
    metadata: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...metadata }

    // Remove sensitive fields
    const sensitiveKeys = [
      'apiKey',
      'token',
      'password',
      'secret',
      'auth',
      'content',
    ]
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        delete sanitized[key]
      }
    }

    return sanitized
  }

  /**
   * Hash user ID for privacy
   */
  private hashUserId(userId: string): string {
    // Simple hash for user ID (replace with proper hashing in production)
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Trim logs to prevent memory issues
   */
  private trimLogs(): void {
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }
  }

  /**
   * Trim metrics to prevent memory issues
   */
  private trimMetrics(): void {
    if (this.performanceMetrics.length > this.maxLogEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(
        -this.maxLogEntries
      )
    }

    if (this.businessMetrics.length > this.maxLogEntries) {
      this.businessMetrics = this.businessMetrics.slice(-this.maxLogEntries)
    }
  }

  /**
   * Output to console for development
   */
  private outputToConsole(entry: LogEntry): void {
    const { level, message, context, error } = entry
    const timestamp = entry.timestamp.toISOString()

    const logData: Record<string, any> = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    }

    if (error) {
      logData.error = error
    }

    switch (level) {
      case 'debug':
        console.debug('[DEBUG]', logData)
        break
      case 'info':
        console.info('[INFO]', logData)
        break
      case 'warn':
        console.warn('[WARN]', logData)
        break
      case 'error':
      case 'critical':
        console.error(`[${level.toUpperCase()}]`, logData)
        break
    }
  }

  /**
   * Export logs as CSV
   */
  private exportLogsAsCSV(): string {
    const headers = ['timestamp', 'level', 'message', 'context', 'error']
    const rows = this.logs.map((log) => [
      log.timestamp.toISOString(),
      log.level,
      log.message,
      JSON.stringify(log.context),
      log.error ? JSON.stringify(log.error) : '',
    ])

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')
  }
}

/**
 * Get default logger instance
 */
export function getLogger(): LoggingService {
  return LoggingService.getInstance(
    (process.env.NODE_ENV === 'development' ? 'debug' : 'info') as LogLevel
  )
}

/**
 * Default logger instance
 */
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
  performance: (metrics: Omit<PerformanceMetrics, 'timestamp'>) =>
    getLogger().logPerformance(metrics),
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
  userAction: (
    action: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ) => getLogger().logUserBehavior(action, userId, metadata),
}
