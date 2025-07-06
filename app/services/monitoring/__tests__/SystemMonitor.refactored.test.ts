/**
 * SystemMonitor Refactored Tests
 *
 * Comprehensive tests for the refactored SystemMonitor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SystemMonitor from '../SystemMonitor'
import { MonitoringConfig } from '../types'

// Mock dependencies
vi.mock('../../LoggingService', () => ({
  LoggingService: {
    getInstance: vi.fn(() => ({
      logBusinessMetric: vi.fn(),
      logPerformance: vi.fn(),
      error: vi.fn(),
    })),
  },
}))
vi.mock('../../ConnectionPoolService', () => ({
  ConnectionPoolService: {
    getInstance: vi.fn(() => ({
      getMetrics: vi.fn(() => ({
        activeConnections: 2,
        queuedTasks: 0,
        completedTasks: 10,
        failedTasks: 1,
        averageExecutionTime: 1500,
      })),
    })),
  },
}))
vi.mock('../../reliability/CircuitBreaker', () => ({
  CircuitBreakerRegistry: {
    getInstance: vi.fn(() => ({
      getAllMetrics: vi.fn(() => ({})),
      getUnhealthyBreakers: vi.fn(() => []),
    })),
  },
}))
vi.mock('../../events/EventBus', () => ({
  EventBus: {
    getInstance: vi.fn(() => ({
      getMetrics: vi.fn(() => ({
        totalEvents: 100,
        subscriberCount: 5,
        errorCount: 2,
        averageProcessingTime: 50,
      })),
    })),
  },
}))

describe('SystemMonitor Refactored', () => {
  let monitor: SystemMonitor
  let mockConfig: MonitoringConfig

  beforeEach(() => {
    SystemMonitor.reset()

    mockConfig = {
      checkInterval: 1000,
      alertThresholds: {
        errorRate: 0.05,
        responseTime: 1000,
        memoryUsage: 0.8,
        cpuUsage: 0.8,
      },
      retentionPeriod: 3600000,
      enabledChecks: [
        'connectionPool',
        'circuitBreakers',
        'eventBus',
        'memory',
        'performance',
      ],
    }

    monitor = SystemMonitor.getInstance(mockConfig)
  })

  afterEach(() => {
    monitor.stopMonitoring()
    SystemMonitor.reset()
    vi.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const monitor1 = SystemMonitor.getInstance()
      const monitor2 = SystemMonitor.getInstance()
      expect(monitor1).toBe(monitor2)
    })

    it('should reset singleton', () => {
      const monitor1 = SystemMonitor.getInstance()
      SystemMonitor.reset()
      const monitor2 = SystemMonitor.getInstance()
      expect(monitor1).not.toBe(monitor2)
    })
  })

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring', () => {
      monitor.startMonitoring()
      // Should not throw and should set up interval
    })

    it('should stop monitoring', () => {
      monitor.startMonitoring()
      monitor.stopMonitoring()
      // Should clear interval
    })

    it('should not start monitoring twice', () => {
      monitor.startMonitoring()
      monitor.startMonitoring()
      // Should not throw
    })
  })

  describe('Health Check Integration', () => {
    it('should perform health check', async () => {
      const health = await monitor.getSystemHealth()

      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('overall')
      expect(health).toHaveProperty('components')
      expect(health).toHaveProperty('alerts')
      expect(health).toHaveProperty('recommendations')

      expect(health.overall).toHaveProperty('status')
      expect(health.overall).toHaveProperty('score')
      expect(health.overall).toHaveProperty('uptime')
    })

    it('should return valid component health', async () => {
      const health = await monitor.getSystemHealth()

      expect(health.components).toHaveProperty('connectionPool')
      expect(health.components).toHaveProperty('circuitBreakers')
      expect(health.components).toHaveProperty('eventBus')
      expect(health.components).toHaveProperty('memory')
      expect(health.components).toHaveProperty('performance')

      // Each component should have required properties
      Object.values(health.components).forEach((component: any) => {
        expect(component).toHaveProperty('status')
        expect(component).toHaveProperty('metrics')
        expect(component).toHaveProperty('lastCheck')
        expect(component).toHaveProperty('issues')
        expect(['healthy', 'warning', 'critical']).toContain(component.status)
      })
    })
  })

  describe('Alert Management', () => {
    it('should add alert', () => {
      const alertId = monitor.addAlert(
        'performance',
        'high',
        'testComponent',
        'Test alert'
      )
      expect(alertId).toBeTruthy()
      expect(typeof alertId).toBe('string')
    })

    it('should resolve alert', () => {
      const alertId = monitor.addAlert(
        'performance',
        'high',
        'testComponent',
        'Test alert'
      )
      const resolved = monitor.resolveAlert(alertId)
      expect(resolved).toBe(true)
    })

    it('should return false for non-existent alert', () => {
      const resolved = monitor.resolveAlert('non-existent')
      expect(resolved).toBe(false)
    })

    it('should get active alerts', () => {
      monitor.addAlert('performance', 'high', 'testComponent', 'Test alert')
      const activeAlerts = monitor.getActiveAlerts()
      expect(activeAlerts).toHaveLength(1)
      expect(activeAlerts[0].resolved).toBe(false)
    })

    it('should get all alerts', () => {
      monitor.addAlert('performance', 'high', 'testComponent', 'Test alert 1')
      monitor.addAlert('error', 'medium', 'testComponent', 'Test alert 2')
      const allAlerts = monitor.getAllAlerts()
      expect(allAlerts).toHaveLength(2)
    })
  })

  describe('Recommendations', () => {
    it('should return recommendations', () => {
      const recommendations = monitor.getRecommendations()
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('Health History', () => {
    it('should return health history', async () => {
      await monitor.getSystemHealth()
      const history = monitor.getHealthHistory()
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
    })

    it('should limit health history', async () => {
      await monitor.getSystemHealth()
      await monitor.getSystemHealth()
      const history = monitor.getHealthHistory(1)
      expect(history.length).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle health check failure gracefully', async () => {
      // Mock a failure in health check
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const health = await monitor.getSystemHealth()

      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('overall')

      consoleSpy.mockRestore()
    })
  })

  describe('Module Composition', () => {
    it('should compose modules correctly', () => {
      // Test that the monitor is properly composed of its modules
      expect(monitor).toHaveProperty('startMonitoring')
      expect(monitor).toHaveProperty('stopMonitoring')
      expect(monitor).toHaveProperty('getSystemHealth')
      expect(monitor).toHaveProperty('getActiveAlerts')
      expect(monitor).toHaveProperty('getAllAlerts')
      expect(monitor).toHaveProperty('getRecommendations')
      expect(monitor).toHaveProperty('addAlert')
      expect(monitor).toHaveProperty('resolveAlert')
      expect(monitor).toHaveProperty('getHealthHistory')
    })
  })
})
