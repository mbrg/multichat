/**
 * Vercel Logger Module
 *
 * Handles structured logging to Vercel dashboard for system monitoring
 */

import { SystemHealthMetrics } from './types'

export class VercelLogger {
  /**
   * Log system health metrics to Vercel dashboard
   */
  logSystemHealthToVercel(
    healthMetrics: SystemHealthMetrics,
    checkDuration: number
  ): void {
    const { overall, components, alerts } = healthMetrics

    // Overall system health log
    if (overall.status !== 'healthy') {
      console.warn('⚠️ SYSTEM_HEALTH_ALERT', {
        timestamp: new Date().toISOString(),
        status: overall.status,
        score: overall.score,
        uptime: overall.uptime,
        lastIncident: overall.lastIncident,
        checkDuration: Math.round(checkDuration),
        activeAlerts: alerts.length,
      })
    } else {
      console.log('✅ SYSTEM_HEALTH_OK', {
        timestamp: new Date().toISOString(),
        score: overall.score,
        uptime: overall.uptime,
        checkDuration: Math.round(checkDuration),
      })
    }

    // Component-specific health logs
    for (const [componentName, health] of Object.entries(components)) {
      if (health.status === 'critical') {
        console.error('🚨 COMPONENT_CRITICAL', {
          timestamp: new Date().toISOString(),
          component: componentName,
          status: health.status,
          issues: health.issues,
          metrics: health.metrics,
        })
      } else if (health.status === 'warning') {
        console.warn('⚠️ COMPONENT_WARNING', {
          timestamp: new Date().toISOString(),
          component: componentName,
          status: health.status,
          issues: health.issues,
          metrics: health.metrics,
        })
      }
    }

    // Performance metrics log
    console.log('📊 SYSTEM_METRICS', {
      timestamp: new Date().toISOString(),
      connectionPool: {
        active: components.connectionPool.metrics.activeConnections,
        queued: components.connectionPool.metrics.queuedTasks,
        utilization: components.connectionPool.metrics.utilizationRate,
        failureRate: components.connectionPool.metrics.failureRate,
      },
      circuitBreakers: {
        total: components.circuitBreakers.metrics.totalBreakers,
        open: components.circuitBreakers.metrics.openBreakers,
        unhealthy: components.circuitBreakers.metrics.unhealthyBreakers,
        healthyRatio: components.circuitBreakers.metrics.healthyRatio,
      },
      eventBus: {
        totalEvents: components.eventBus.metrics.totalEvents,
        subscribers: components.eventBus.metrics.subscriberCount,
        errorRate: components.eventBus.metrics.errorRate,
        avgProcessingTime: components.eventBus.metrics.averageProcessingTime,
      },
      memory: {
        heapUsage: components.memory.metrics.heapUsageRatio,
        allocated: components.memory.metrics.allocatedRatio,
      },
    })
  }

  /**
   * Log monitoring start event
   */
  logMonitoringStart(
    checkInterval: number,
    enabledChecks: string[],
    alertThresholds: any
  ): void {
    console.log('🔥 SYSTEM_MONITOR_STARTED', {
      timestamp: new Date().toISOString(),
      component: 'SystemMonitor',
      checkInterval,
      enabledChecks,
      alertThresholds,
    })
  }
}
