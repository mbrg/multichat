/**
 * Health Checkers Module
 *
 * Individual health check implementations following Single Responsibility Principle
 */

import { ComponentHealth, MonitoringConfig } from './types'
import { ConnectionPoolService } from '../ConnectionPoolService'
import { CircuitBreakerRegistry } from '../reliability/CircuitBreaker'
import { EventBus } from '../events/EventBus'

export class HealthCheckers {
  constructor(private config: MonitoringConfig) {}

  /**
   * Check connection pool health
   */
  async checkConnectionPool(): Promise<ComponentHealth> {
    try {
      const poolMetrics = ConnectionPoolService.getInstance().getMetrics()
      const utilizationRate = poolMetrics.activeConnections / 6 // Assuming max 6 connections
      const failureRate =
        poolMetrics.completedTasks > 0
          ? poolMetrics.failedTasks /
            (poolMetrics.completedTasks + poolMetrics.failedTasks)
          : 0

      const issues: string[] = []
      let status: ComponentHealth['status'] = 'healthy'

      if (utilizationRate > 0.8) {
        issues.push('High connection utilization')
        status = 'warning'
      }

      if (failureRate > this.config.alertThresholds.errorRate) {
        issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`)
        status = 'critical'
      }

      if (poolMetrics.queuedTasks > 10) {
        issues.push('Large task queue')
        status = status === 'critical' ? 'critical' : 'warning'
      }

      return {
        status,
        metrics: {
          activeConnections: poolMetrics.activeConnections,
          queuedTasks: poolMetrics.queuedTasks,
          completedTasks: poolMetrics.completedTasks,
          failedTasks: poolMetrics.failedTasks,
          averageExecutionTime: poolMetrics.averageExecutionTime,
          utilizationRate,
          failureRate,
        },
        lastCheck: Date.now(),
        issues,
      }
    } catch (error) {
      return {
        status: 'critical',
        metrics: {},
        lastCheck: Date.now(),
        issues: ['Failed to check connection pool health'],
      }
    }
  }

  /**
   * Check circuit breaker health
   */
  async checkCircuitBreakers(): Promise<ComponentHealth> {
    try {
      const registry = CircuitBreakerRegistry.getInstance()
      const allMetrics = registry.getAllMetrics()
      const unhealthyBreakers = registry.getUnhealthyBreakers()

      const totalBreakers = Object.keys(allMetrics).length
      const openBreakers = Object.values(allMetrics).filter(
        (m) => m.state === 'open'
      ).length
      const halfOpenBreakers = Object.values(allMetrics).filter(
        (m) => m.state === 'half-open'
      ).length

      const issues: string[] = []
      let status: ComponentHealth['status'] = 'healthy'

      if (unhealthyBreakers.length > 0) {
        issues.push(
          `${unhealthyBreakers.length} unhealthy circuit breakers: ${unhealthyBreakers.join(', ')}`
        )
        status =
          unhealthyBreakers.length > totalBreakers * 0.5
            ? 'critical'
            : 'warning'
      }

      return {
        status,
        metrics: {
          totalBreakers,
          openBreakers,
          halfOpenBreakers,
          unhealthyBreakers: unhealthyBreakers.length,
          healthyRatio:
            totalBreakers > 0
              ? (totalBreakers - unhealthyBreakers.length) / totalBreakers
              : 1,
        },
        lastCheck: Date.now(),
        issues,
      }
    } catch (error) {
      return {
        status: 'critical',
        metrics: {},
        lastCheck: Date.now(),
        issues: ['Failed to check circuit breaker health'],
      }
    }
  }

  /**
   * Check event bus health
   */
  async checkEventBus(): Promise<ComponentHealth> {
    try {
      const eventBus = EventBus.getInstance()
      const metrics = eventBus.getMetrics()

      const errorRate =
        metrics.totalEvents > 0 ? metrics.errorCount / metrics.totalEvents : 0

      const issues: string[] = []
      let status: ComponentHealth['status'] = 'healthy'

      if (errorRate > this.config.alertThresholds.errorRate) {
        issues.push(`High event error rate: ${(errorRate * 100).toFixed(1)}%`)
        status = 'critical'
      }

      if (metrics.averageProcessingTime > 100) {
        issues.push(
          `Slow event processing: ${metrics.averageProcessingTime.toFixed(1)}ms`
        )
        status = status === 'critical' ? 'critical' : 'warning'
      }

      return {
        status,
        metrics: {
          totalEvents: metrics.totalEvents,
          subscriberCount: metrics.subscriberCount,
          errorCount: metrics.errorCount,
          averageProcessingTime: metrics.averageProcessingTime,
          errorRate,
        },
        lastCheck: Date.now(),
        issues,
      }
    } catch (error) {
      return {
        status: 'critical',
        metrics: {},
        lastCheck: Date.now(),
        issues: ['Failed to check event bus health'],
      }
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage(): Promise<ComponentHealth> {
    try {
      // In browser environment, we can't access process.memoryUsage()
      // So we'll estimate based on performance.memory if available
      const memoryInfo = (performance as any).memory
      const issues: string[] = []
      let status: ComponentHealth['status'] = 'healthy'
      let metrics: Record<string, number> = {}

      if (memoryInfo) {
        const usedJSHeapSize = memoryInfo.usedJSHeapSize
        const totalJSHeapSize = memoryInfo.totalJSHeapSize
        const jsHeapSizeLimit = memoryInfo.jsHeapSizeLimit

        const heapUsageRatio = usedJSHeapSize / jsHeapSizeLimit
        const allocatedRatio = totalJSHeapSize / jsHeapSizeLimit

        metrics = {
          usedJSHeapSize,
          totalJSHeapSize,
          jsHeapSizeLimit,
          heapUsageRatio,
          allocatedRatio,
        }

        if (heapUsageRatio > this.config.alertThresholds.memoryUsage) {
          issues.push(
            `High memory usage: ${(heapUsageRatio * 100).toFixed(1)}%`
          )
          status = 'critical'
        } else if (
          heapUsageRatio >
          this.config.alertThresholds.memoryUsage * 0.8
        ) {
          issues.push(
            `Elevated memory usage: ${(heapUsageRatio * 100).toFixed(1)}%`
          )
          status = 'warning'
        }
      } else {
        issues.push('Memory monitoring not available in this environment')
        status = 'warning'
      }

      return {
        status,
        metrics,
        lastCheck: Date.now(),
        issues,
      }
    } catch (error) {
      return {
        status: 'critical',
        metrics: {},
        lastCheck: Date.now(),
        issues: ['Failed to check memory usage'],
      }
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformance(): Promise<ComponentHealth> {
    try {
      const issues: string[] = []
      let status: ComponentHealth['status'] = 'healthy'

      // Check if performance observer is supported
      const timing = performance.timing
      const navigation = performance.navigation

      const metrics: Record<string, number> = {
        navigationTiming: timing
          ? timing.loadEventEnd - timing.navigationStart
          : 0,
        navigationType: navigation ? navigation.type : 0,
      }

      // Add performance entries if available
      if (performance.getEntriesByType) {
        const measures = performance.getEntriesByType('measure')
        const marks = performance.getEntriesByType('mark')

        metrics.measureCount = measures.length
        metrics.markCount = marks.length

        if (measures.length > 0) {
          const avgDuration =
            measures.reduce((sum, m) => sum + m.duration, 0) / measures.length
          metrics.averageMeasureDuration = avgDuration

          if (avgDuration > this.config.alertThresholds.responseTime) {
            issues.push(
              `Slow performance measures: ${avgDuration.toFixed(1)}ms`
            )
            status = 'warning'
          }
        }
      }

      return {
        status,
        metrics,
        lastCheck: Date.now(),
        issues,
      }
    } catch (error) {
      return {
        status: 'critical',
        metrics: {},
        lastCheck: Date.now(),
        issues: ['Failed to check performance metrics'],
      }
    }
  }
}
