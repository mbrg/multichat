/**
 * System Monitor Service - Refactored
 *
 * Simplified orchestrator following Dave Farley's principles:
 * - Single Responsibility Principle through focused modules
 * - Dependency Injection for testability
 * - Clean separation of concerns
 * - Composition over inheritance
 */

import { LoggingService } from '../LoggingService'
import {
  SystemHealthMetrics,
  SystemHealthStatus,
  MonitoringConfig,
  SystemAlert,
  SystemRecommendation,
} from './types'
import { HealthCheckers } from './HealthCheckers'
import { AlertManager } from './AlertManager'
import { HealthCalculator } from './HealthCalculator'
import { VercelLogger } from './VercelLogger'

export class SystemMonitor {
  private static instance: SystemMonitor | null = null
  private logger: LoggingService
  private healthHistory: SystemHealthMetrics[] = []
  private checkInterval: NodeJS.Timeout | null = null

  // Composed modules following Single Responsibility Principle
  private healthCheckers: HealthCheckers
  private alertManager: AlertManager
  private healthCalculator: HealthCalculator
  private vercelLogger: VercelLogger

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

    // Initialize focused modules
    this.healthCheckers = new HealthCheckers(config)
    this.alertManager = new AlertManager()
    this.healthCalculator = new HealthCalculator()
    this.vercelLogger = new VercelLogger()
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

    this.vercelLogger.logMonitoringStart(
      this.config.checkInterval,
      this.config.enabledChecks,
      this.config.alertThresholds
    )

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
    return this.alertManager.getActiveAlerts()
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): SystemAlert[] {
    return this.alertManager.getAllAlerts(limit)
  }

  /**
   * Get recommendations
   */
  getRecommendations(): SystemRecommendation[] {
    return this.alertManager.getRecommendations()
  }

  /**
   * Add alert (delegated to AlertManager)
   */
  addAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    component: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): string {
    return this.alertManager.addAlert(
      type,
      severity,
      component,
      message,
      metadata
    )
  }

  /**
   * Resolve alert (delegated to AlertManager)
   */
  resolveAlert(alertId: string): boolean {
    return this.alertManager.resolveAlert(alertId)
  }

  /**
   * Perform comprehensive health check - orchestrates all modules
   */
  private async performHealthCheck(): Promise<SystemHealthMetrics> {
    const timestamp = Date.now()
    const startTime = performance.now()

    try {
      // Check all components using HealthCheckers
      const components = {
        connectionPool: await this.healthCheckers.checkConnectionPool(),
        circuitBreakers: await this.healthCheckers.checkCircuitBreakers(),
        eventBus: await this.healthCheckers.checkEventBus(),
        memory: await this.healthCheckers.checkMemoryUsage(),
        performance: await this.healthCheckers.checkPerformance(),
      }

      // Generate alerts and recommendations using AlertManager
      this.alertManager.generateAlertsFromComponents(components)
      this.alertManager.generateRecommendations(components)

      // Calculate overall health using HealthCalculator
      const overall = this.healthCalculator.calculateOverallHealth(
        components,
        this.alertManager.getActiveAlerts()
      )

      const healthMetrics: SystemHealthMetrics = {
        timestamp,
        overall,
        components,
        alerts: this.getActiveAlerts(),
        recommendations: this.getRecommendations(),
      }

      // Store in history
      this.healthHistory.push(healthMetrics)
      this.cleanupOldData()

      // Log to Vercel dashboard using VercelLogger
      this.vercelLogger.logSystemHealthToVercel(
        healthMetrics,
        performance.now() - startTime
      )

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
          uptime: timestamp - Date.now(),
          lastIncident: timestamp,
        },
        components: {} as any,
        alerts: this.getActiveAlerts(),
        recommendations: this.getRecommendations(),
      }
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod

    // Clean health history
    this.healthHistory = this.healthHistory.filter((h) => h.timestamp > cutoff)

    // Clean old alerts via AlertManager
    this.alertManager.cleanupOldAlerts(this.config.retentionPeriod)
  }
}

export default SystemMonitor

// Export types for backward compatibility
export type {
  SystemHealthMetrics,
  SystemHealthStatus,
  MonitoringConfig,
  SystemAlert,
  SystemRecommendation,
} from './types'
