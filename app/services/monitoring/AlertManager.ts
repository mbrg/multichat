/**
 * Alert Manager Module
 *
 * Manages system alerts and recommendations following Single Responsibility Principle
 */

import { SystemAlert, SystemRecommendation, SystemHealthMetrics } from './types'
import { LoggingService } from '../LoggingService'

export class AlertManager {
  private alerts: SystemAlert[] = []
  private recommendations: SystemRecommendation[] = []
  private alertIdCounter = 0
  private recommendationIdCounter = 0
  private logger: LoggingService

  constructor() {
    this.logger = LoggingService.getInstance()
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter((alert) => !alert.resolved)
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): SystemAlert[] {
    return this.alerts.slice(-limit)
  }

  /**
   * Get recommendations
   */
  getRecommendations(): SystemRecommendation[] {
    return this.recommendations
  }

  /**
   * Add alert with Vercel logging
   */
  addAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    component: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): string {
    const alert: SystemAlert = {
      id: `alert-${++this.alertIdCounter}`,
      type,
      severity,
      component,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata,
    }

    this.alerts.push(alert)
    this.logAlertToVercel(alert)

    this.logger.logBusinessMetric('alert_created', 1, {
      component: 'SystemMonitor',
      alertType: type,
      severity,
    })

    return alert.id
  }

  /**
   * Resolve alert with Vercel logging
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId)
    if (alert) {
      alert.resolved = true

      // Log resolution to Vercel dashboard
      console.log('✅ ALERT_RESOLVED', {
        timestamp: new Date().toISOString(),
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        component: alert.component,
        resolutionTime: Date.now() - alert.timestamp,
      })

      this.logger.logBusinessMetric('alert_resolved', 1, {
        component: 'SystemMonitor',
        alertId,
        alertType: alert.type,
      })
      return true
    }
    return false
  }

  /**
   * Generate alerts from component health
   */
  generateAlertsFromComponents(
    components: SystemHealthMetrics['components']
  ): void {
    for (const [componentName, health] of Object.entries(components)) {
      if (health.status === 'critical') {
        const existingAlert = this.alerts.find(
          (a) =>
            !a.resolved &&
            a.component === componentName &&
            a.severity === 'critical'
        )

        if (!existingAlert) {
          this.addAlert(
            'availability',
            'critical',
            componentName,
            `${componentName} is in critical state: ${health.issues.join(', ')}`,
            { healthMetrics: health.metrics }
          )
        }
      }
    }
  }

  /**
   * Generate system recommendations
   */
  generateRecommendations(components: SystemHealthMetrics['components']): void {
    // Clear old recommendations
    this.recommendations = []

    // Check connection pool utilization
    const poolHealth = components.connectionPool
    if (poolHealth.metrics.utilizationRate > 0.7) {
      this.recommendations.push({
        id: `rec-${++this.recommendationIdCounter}`,
        category: 'performance',
        priority: 'medium',
        title: 'Increase Connection Pool Size',
        description:
          'Connection pool utilization is high, consider increasing the pool size',
        action: 'Review ConnectionPoolService maxConcurrentConnections setting',
        impact: 'medium',
        effort: 'low',
        timestamp: Date.now(),
      })
    }

    // Check circuit breaker health
    const cbHealth = components.circuitBreakers
    if (cbHealth.metrics.unhealthyBreakers > 0) {
      this.recommendations.push({
        id: `rec-${++this.recommendationIdCounter}`,
        category: 'reliability',
        priority: 'high',
        title: 'Review Circuit Breaker Configuration',
        description:
          'Some circuit breakers are unhealthy, review thresholds and recovery settings',
        action: 'Check AI provider configurations and network connectivity',
        impact: 'high',
        effort: 'medium',
        timestamp: Date.now(),
      })
    }

    // Check event bus performance
    const eventHealth = components.eventBus
    if (eventHealth.metrics.averageProcessingTime > 50) {
      this.recommendations.push({
        id: `rec-${++this.recommendationIdCounter}`,
        category: 'performance',
        priority: 'medium',
        title: 'Optimize Event Handlers',
        description:
          'Event processing is slower than optimal, review event handler performance',
        action: 'Profile event handlers and optimize slow operations',
        impact: 'medium',
        effort: 'medium',
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Clean up old alerts
   */
  cleanupOldAlerts(retentionPeriod: number): void {
    const cutoff = Date.now() - retentionPeriod
    this.alerts = this.alerts.filter((a) => !a.resolved || a.timestamp > cutoff)
  }

  /**
   * Log alert to Vercel dashboard
   */
  private logAlertToVercel(alert: SystemAlert): void {
    const logData = {
      timestamp: new Date().toISOString(),
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      component: alert.component,
      message: alert.message,
      metadata: alert.metadata,
    }

    switch (alert.severity) {
      case 'critical':
        console.error('🚨 CRITICAL_ALERT', logData)
        break
      case 'high':
        console.error('🔴 HIGH_ALERT', logData)
        break
      case 'medium':
        console.warn('🟠 MEDIUM_ALERT', logData)
        break
      case 'low':
        console.log('🟡 LOW_ALERT', logData)
        break
    }
  }
}
