/**
 * System Monitor Service
 *
 * Provides comprehensive monitoring of system health following Dave Farley's principles:
 * - Fast feedback loops with real-time metrics collection
 * - Observable system behavior for debugging and optimization
 * - Continuous monitoring for proactive issue detection
 * - Structured logging for Vercel's built-in monitoring dashboard
 * - Single responsibility for system health tracking
 */

import { LoggingService } from '../LoggingService'
import { ConnectionPoolService } from '../ConnectionPoolService'
import { CircuitBreakerRegistry } from '../reliability/CircuitBreaker'
import { EventBus } from '../events/EventBus'

export interface SystemHealthMetrics {
  timestamp: number
  overall: SystemHealthStatus
  components: {
    connectionPool: ComponentHealth
    circuitBreakers: ComponentHealth
    eventBus: ComponentHealth
    memory: ComponentHealth
    performance: ComponentHealth
  }
  alerts: SystemAlert[]
  recommendations: SystemRecommendation[]
}

export interface SystemHealthStatus {
  status: 'healthy' | 'warning' | 'critical'
  score: number // 0-100
  uptime: number
  lastIncident: number | null
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical'
  metrics: Record<string, number>
  lastCheck: number
  issues: string[]
}

export interface SystemAlert {
  id: string
  type: 'performance' | 'error' | 'capacity' | 'availability'
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string
  message: string
  timestamp: number
  resolved: boolean
  metadata: Record<string, unknown>
}

export interface SystemRecommendation {
  id: string
  category: 'performance' | 'reliability' | 'scalability' | 'security'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  action: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  timestamp: number
}

export interface MonitoringConfig {
  checkInterval: number // How often to check health (ms)
  alertThresholds: {
    errorRate: number // Error rate threshold (0-1)
    responseTime: number // Response time threshold (ms)
    memoryUsage: number // Memory usage threshold (0-1)
    cpuUsage: number // CPU usage threshold (0-1)
  }
  retentionPeriod: number // How long to keep metrics (ms)
  enabledChecks: string[] // Which health checks to run
}

export class SystemMonitor {
  private static instance: SystemMonitor | null = null
  private logger: LoggingService
  private startTime = Date.now()
  private healthHistory: SystemHealthMetrics[] = []
  private alerts: SystemAlert[] = []
  private recommendations: SystemRecommendation[] = []
  private checkInterval: NodeJS.Timeout | null = null
  private alertIdCounter = 0
  private recommendationIdCounter = 0

  constructor(
    private config: MonitoringConfig = {
      checkInterval: 30000, // 30 seconds
      alertThresholds: {
        errorRate: 0.05, // 5% error rate
        responseTime: 5000, // 5 second response time
        memoryUsage: 0.85, // 85% memory usage
        cpuUsage: 0.8, // 80% CPU usage
      },
      retentionPeriod: 86400000, // 24 hours
      enabledChecks: [
        'connectionPool',
        'circuitBreakers',
        'eventBus',
        'memory',
        'performance',
      ],
    }
  ) {
    this.logger = LoggingService.getInstance()
  }

  /**
   * Singleton pattern for global monitoring
   */
  static getInstance(config?: MonitoringConfig): SystemMonitor {
    if (!this.instance) {
      this.instance = new SystemMonitor(config)
    }
    return this.instance
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (this.instance?.checkInterval) {
      clearInterval(this.instance.checkInterval)
    }
    this.instance = null
  }

  /**
   * Start monitoring system health
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      return // Already monitoring
    }

    // Log to Vercel's monitoring dashboard
    console.log('🔥 SYSTEM_MONITOR_STARTED', {
      timestamp: new Date().toISOString(),
      component: 'SystemMonitor',
      checkInterval: this.config.checkInterval,
      enabledChecks: this.config.enabledChecks,
      alertThresholds: this.config.alertThresholds,
    })

    this.logger.logBusinessMetric('monitoring_started', 1, {
      component: 'SystemMonitor',
      checkInterval: this.config.checkInterval,
    })

    this.checkInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.config.checkInterval)

    // Perform initial health check
    this.performHealthCheck()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null

      this.logger.logBusinessMetric('monitoring_stopped', 1, {
        component: 'SystemMonitor',
      })
    }
  }

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    return this.performHealthCheck()
  }

  /**
   * Get health history
   */
  getHealthHistory(limit: number = 100): SystemHealthMetrics[] {
    return this.healthHistory.slice(-limit)
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
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<SystemHealthMetrics> {
    const timestamp = Date.now()
    const startTime = performance.now()

    try {
      // Check all components
      const components = {
        connectionPool: await this.checkConnectionPool(),
        circuitBreakers: await this.checkCircuitBreakers(),
        eventBus: await this.checkEventBus(),
        memory: await this.checkMemoryUsage(),
        performance: await this.checkPerformance(),
      }

      // Calculate overall health
      const overall = this.calculateOverallHealth(components)

      // Generate alerts and recommendations
      this.generateAlertsFromComponents(components)
      this.generateRecommendations(components)

      const healthMetrics: SystemHealthMetrics = {
        timestamp,
        overall,
        components,
        alerts: this.getActiveAlerts(),
        recommendations: this.recommendations,
      }

      // Store in history
      this.healthHistory.push(healthMetrics)
      this.cleanupOldData()

      // Log structured health metrics for Vercel dashboard
      this.logSystemHealthToVercel(healthMetrics, performance.now() - startTime)

      // Log performance of health check itself
      this.logger.logPerformance({
        operation: 'system_health_check',
        duration: performance.now() - startTime,
        success: overall.status !== 'critical',
        metadata: {
          overallStatus: overall.status,
          overallScore: overall.score,
          componentCount: Object.keys(components).length,
        },
      })

      return healthMetrics
    } catch (error) {
      this.logger.error('System health check failed', error as Error, {
        operation: 'performHealthCheck',
      })

      // Return degraded health status
      return {
        timestamp,
        overall: {
          status: 'critical',
          score: 0,
          uptime: timestamp - this.startTime,
          lastIncident: timestamp,
        },
        components: {} as any,
        alerts: this.getActiveAlerts(),
        recommendations: this.recommendations,
      }
    }
  }

  /**
   * Check connection pool health
   */
  private async checkConnectionPool(): Promise<ComponentHealth> {
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
  private async checkCircuitBreakers(): Promise<ComponentHealth> {
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
  private async checkEventBus(): Promise<ComponentHealth> {
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
  private async checkMemoryUsage(): Promise<ComponentHealth> {
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
  private async checkPerformance(): Promise<ComponentHealth> {
    try {
      const issues: string[] = []
      let status: ComponentHealth['status'] = 'healthy'

      // Check if performance observer is supported
      const timing = performance.timing
      const navigation = performance.navigation

      const metrics: Record<string, number> = {
        uptime: Date.now() - this.startTime,
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

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(
    components: SystemHealthMetrics['components']
  ): SystemHealthStatus {
    const componentStatuses = Object.values(components).map((c) => c.status)
    const criticalCount = componentStatuses.filter(
      (s) => s === 'critical'
    ).length
    const warningCount = componentStatuses.filter((s) => s === 'warning').length
    const healthyCount = componentStatuses.filter((s) => s === 'healthy').length

    let status: SystemHealthStatus['status']
    let score: number

    if (criticalCount > 0) {
      status = 'critical'
      score = Math.max(0, 40 - criticalCount * 10)
    } else if (warningCount > 0) {
      status = 'warning'
      score = Math.max(40, 80 - warningCount * 10)
    } else {
      status = 'healthy'
      score = 100
    }

    return {
      status,
      score,
      uptime: Date.now() - this.startTime,
      lastIncident:
        this.alerts.find((a) => !a.resolved && a.severity === 'critical')
          ?.timestamp || null,
    }
  }

  /**
   * Generate alerts from component health
   */
  private generateAlertsFromComponents(
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
  private generateRecommendations(
    components: SystemHealthMetrics['components']
  ): void {
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
   * Log system health metrics to Vercel dashboard
   */
  private logSystemHealthToVercel(
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
   * Log alerts to Vercel dashboard
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

  /**
   * Enhanced alert creation with Vercel logging
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

    // Log to Vercel dashboard
    this.logAlertToVercel(alert)

    this.logger.logBusinessMetric('alert_created', 1, {
      component: 'SystemMonitor',
      alertType: type,
      severity,
    })

    return alert.id
  }

  /**
   * Enhanced alert resolution with Vercel logging
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
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod

    // Clean health history
    this.healthHistory = this.healthHistory.filter((h) => h.timestamp > cutoff)

    // Clean old resolved alerts
    this.alerts = this.alerts.filter((a) => !a.resolved || a.timestamp > cutoff)
  }
}

export default SystemMonitor
