/**
 * Vercel Monitoring Service
 *
 * Serverless-compatible monitoring that only uses:
 * - Structured console logs for Vercel's log aggregation
 * - Custom metrics that integrate with Vercel Analytics
 *
 * No state, no singletons, no intervals - just pure functions
 * that log metrics for each request/operation.
 */

export interface RequestMetrics {
  duration: number
  statusCode: number
  path: string
  method: string
  error?: string
}

export interface AIOperationMetrics {
  provider: string
  model: string
  operation: 'chat' | 'completion' | 'stream' | 'generate' | 'validate'
  duration: number
  tokens?: number
  success: boolean
  error?: string
}

export interface BusinessEventMetrics {
  event: string
  value?: number
  metadata?: Record<string, unknown>
}

/**
 * Serverless monitoring for Vercel
 * All methods are stateless and log directly to console
 */
export class VercelMonitoring {
  /**
   * Log a request with structured data for Vercel logs
   */
  static logRequest(metrics: RequestMetrics): void {
    const logData = {
      type: 'REQUEST',
      timestamp: new Date().toISOString(),
      duration: Math.round(metrics.duration),
      statusCode: metrics.statusCode,
      path: metrics.path,
      method: metrics.method,
      ...(metrics.error && { error: metrics.error }),
    }

    if (metrics.statusCode >= 500) {
      console.error('🚨 REQUEST_ERROR', logData)
    } else if (metrics.statusCode >= 400) {
      console.warn('⚠️ REQUEST_CLIENT_ERROR', logData)
    } else {
      console.log('📊 REQUEST_SUCCESS', logData)
    }
  }

  /**
   * Log AI operation metrics
   */
  static logAIOperation(metrics: AIOperationMetrics): void {
    const logData = {
      type: 'AI_OPERATION',
      timestamp: new Date().toISOString(),
      provider: metrics.provider,
      model: metrics.model,
      operation: metrics.operation,
      duration: Math.round(metrics.duration),
      ...(metrics.tokens && { tokens: metrics.tokens }),
      success: metrics.success,
      ...(metrics.error && { error: metrics.error }),
    }

    if (!metrics.success) {
      console.error('🤖 AI_OPERATION_FAILED', logData)
    } else if (metrics.duration > 5000) {
      console.warn('⚠️ AI_OPERATION_SLOW', logData)
    } else {
      console.log('✅ AI_OPERATION_SUCCESS', logData)
    }
  }

  /**
   * Log business events and metrics
   */
  static logBusinessEvent(metrics: BusinessEventMetrics): void {
    console.log('💼 BUSINESS_EVENT', {
      type: 'BUSINESS_EVENT',
      timestamp: new Date().toISOString(),
      event: metrics.event,
      ...(metrics.value !== undefined && { value: metrics.value }),
      ...(metrics.metadata && { metadata: metrics.metadata }),
    })
  }

  /**
   * Log performance metrics (Web Vitals, etc)
   */
  static logPerformance(
    metric: string,
    value: number,
    unit: string = 'ms'
  ): void {
    console.log('⚡ PERFORMANCE_METRIC', {
      type: 'PERFORMANCE',
      timestamp: new Date().toISOString(),
      metric,
      value: Math.round(value),
      unit,
    })
  }

  /**
   * Log errors with context
   */
  static logError(error: Error, context?: Record<string, unknown>): void {
    console.error('❌ APPLICATION_ERROR', {
      type: 'ERROR',
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...(context && { context }),
    })
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    event: string,
    metadata?: Record<string, unknown>
  ): void {
    console.warn('🔒 SECURITY_EVENT', {
      type: 'SECURITY',
      timestamp: new Date().toISOString(),
      event,
      ...(metadata && { metadata }),
    })
  }

  /**
   * Log rate limit events
   */
  static logRateLimit(provider: string, remaining?: number): void {
    console.warn('🚦 RATE_LIMIT', {
      type: 'RATE_LIMIT',
      timestamp: new Date().toISOString(),
      provider,
      ...(remaining !== undefined && { remaining }),
    })
  }

  /**
   * Log memory usage (useful for debugging)
   */
  static logMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      console.log('💾 MEMORY_USAGE', {
        type: 'MEMORY',
        timestamp: new Date().toISOString(),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
      })
    }
  }
}

// Export convenience functions for direct usage
export const logRequest = VercelMonitoring.logRequest
export const logAIOperation = VercelMonitoring.logAIOperation
export const logBusinessEvent = VercelMonitoring.logBusinessEvent
export const logPerformance = VercelMonitoring.logPerformance
export const logError = VercelMonitoring.logError
export const logSecurityEvent = VercelMonitoring.logSecurityEvent
export const logRateLimit = VercelMonitoring.logRateLimit
export const logMemoryUsage = VercelMonitoring.logMemoryUsage
