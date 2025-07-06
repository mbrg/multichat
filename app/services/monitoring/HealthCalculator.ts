/**
 * Health Calculator Module
 *
 * Calculates overall system health from component health metrics
 */

import { SystemHealthStatus, SystemHealthMetrics } from './types'

export class HealthCalculator {
  private startTime = Date.now()

  /**
   * Calculate overall system health from component health
   */
  calculateOverallHealth(
    components: SystemHealthMetrics['components'],
    alerts: SystemHealthMetrics['alerts']
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
        alerts.find((a) => !a.resolved && a.severity === 'critical')
          ?.timestamp || null,
    }
  }

  /**
   * Reset start time (for testing)
   */
  resetStartTime(): void {
    this.startTime = Date.now()
  }
}
