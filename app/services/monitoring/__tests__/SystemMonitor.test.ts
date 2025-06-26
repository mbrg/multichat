import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SystemMonitor from '../SystemMonitor'
import { LoggingService } from '../../LoggingService'
import { ConnectionPoolService } from '../../ConnectionPoolService'
import { CircuitBreakerRegistry } from '../../reliability/CircuitBreaker'
import { EventBus } from '../../events/EventBus'

// Mock console methods to capture Vercel logs
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.stubGlobal('console', mockConsole)

describe('SystemMonitor', () => {
  let monitor: SystemMonitor
  let mockLogger: LoggingService

  beforeEach(() => {
    // Reset all singletons
    SystemMonitor.reset()
    LoggingService.reset()
    ConnectionPoolService.reset()
    CircuitBreakerRegistry.reset()
    EventBus.reset()

    // Create mock logger
    mockLogger = LoggingService.getInstance()
    vi.spyOn(mockLogger, 'logBusinessMetric').mockImplementation(() => {})
    vi.spyOn(mockLogger, 'logPerformance').mockImplementation(() => {})
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {})

    monitor = SystemMonitor.getInstance({
      checkInterval: 100,
      alertThresholds: {
        errorRate: 0.1,
        responseTime: 1000,
        memoryUsage: 0.8,
        cpuUsage: 0.8,
      },
      retentionPeriod: 60000,
      enabledChecks: ['connectionPool', 'circuitBreakers', 'eventBus', 'memory', 'performance']
    })

    // Clear all console mocks
    mockConsole.log.mockClear()
    mockConsole.warn.mockClear()
    mockConsole.error.mockClear()
  })

  afterEach(() => {
    if (monitor) {
      monitor.stopMonitoring()
    }
    SystemMonitor.reset()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = SystemMonitor.getInstance()
      const instance2 = SystemMonitor.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should reset instance', () => {
      const instance1 = SystemMonitor.getInstance()
      SystemMonitor.reset()
      const instance2 = SystemMonitor.getInstance()
      
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      monitor.startMonitoring()
      
      // Check that Vercel log was created
      expect(mockConsole.log).toHaveBeenCalledWith(
        '🔥 SYSTEM_MONITOR_STARTED',
        expect.objectContaining({
          timestamp: expect.any(String),
          component: 'SystemMonitor',
          checkInterval: 100
        })
      )
      
      expect(mockLogger.logBusinessMetric).toHaveBeenCalledWith(
        'monitoring_started',
        1,
        expect.objectContaining({
          component: 'SystemMonitor'
        })
      )
    })

    it('should not start monitoring twice', () => {
      monitor.startMonitoring()
      mockConsole.log.mockClear()
      
      monitor.startMonitoring()
      
      // Should not log again
      expect(mockConsole.log).not.toHaveBeenCalledWith(
        '🔥 SYSTEM_MONITOR_STARTED',
        expect.any(Object)
      )
    })

    it('should stop monitoring', () => {
      monitor.startMonitoring()
      monitor.stopMonitoring()
      
      expect(mockLogger.logBusinessMetric).toHaveBeenCalledWith(
        'monitoring_stopped',
        1,
        expect.objectContaining({
          component: 'SystemMonitor'
        })
      )
    })
  })

  describe('health checks', () => {
    it('should perform health check', async () => {
      const health = await monitor.getSystemHealth()
      
      expect(health).toMatchObject({
        timestamp: expect.any(Number),
        overall: {
          status: expect.stringMatching(/^(healthy|warning|critical)$/),
          score: expect.any(Number),
          uptime: expect.any(Number)
        },
        components: {
          connectionPool: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|warning|critical)$/),
            metrics: expect.any(Object)
          }),
          circuitBreakers: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|warning|critical)$/),
            metrics: expect.any(Object)
          }),
          eventBus: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|warning|critical)$/),
            metrics: expect.any(Object)
          })
        },
        alerts: expect.any(Array),
        recommendations: expect.any(Array)
      })
    })

    it('should log healthy status to Vercel', async () => {
      await monitor.getSystemHealth()
      
      // Should log system health status or metrics
      const healthyCalls = mockConsole.log.mock.calls.filter(call => 
        typeof call[0] === 'string' && (call[0].includes('SYSTEM_HEALTH') || call[0].includes('SYSTEM_METRICS'))
      )
      
      expect(healthyCalls.length).toBeGreaterThan(0)
    })

    it('should log metrics to Vercel', async () => {
      await monitor.getSystemHealth()
      
      // Should log system metrics
      expect(mockConsole.log).toHaveBeenCalledWith(
        '📊 SYSTEM_METRICS',
        expect.objectContaining({
          timestamp: expect.any(String),
          connectionPool: expect.any(Object),
          circuitBreakers: expect.any(Object),
          eventBus: expect.any(Object)
        })
      )
    })

    it('should handle health check errors gracefully', async () => {
      // Mock the entire health check to throw error by mocking a core component
      vi.spyOn(monitor as any, 'checkConnectionPool').mockImplementation(() => {
        throw new Error('Connection pool error')
      })
      
      const health = await monitor.getSystemHealth()
      
      expect(health.overall.status).toBe('critical')
      expect(health.overall.score).toBe(0)
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('alerts', () => {
    it('should create alert', () => {
      const alertId = monitor.addAlert(
        'performance',
        'high',
        'TestComponent',
        'Test alert message',
        { testData: 'value' }
      )
      
      expect(alertId).toBe('alert-1')
      
      const alerts = monitor.getActiveAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        id: alertId,
        type: 'performance',
        severity: 'high',
        component: 'TestComponent',
        message: 'Test alert message',
        resolved: false
      })
    })

    it('should log alerts to Vercel with correct severity', () => {
      monitor.addAlert('error', 'critical', 'TestComponent', 'Critical error')
      monitor.addAlert('performance', 'high', 'TestComponent', 'High priority issue')
      monitor.addAlert('capacity', 'medium', 'TestComponent', 'Medium priority issue')
      monitor.addAlert('availability', 'low', 'TestComponent', 'Low priority issue')
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '🚨 CRITICAL_ALERT',
        expect.objectContaining({
          severity: 'critical',
          message: 'Critical error'
        })
      )
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '🔴 HIGH_ALERT',
        expect.objectContaining({
          severity: 'high',
          message: 'High priority issue'
        })
      )
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '🟠 MEDIUM_ALERT',
        expect.objectContaining({
          severity: 'medium',
          message: 'Medium priority issue'
        })
      )
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        '🟡 LOW_ALERT',
        expect.objectContaining({
          severity: 'low',
          message: 'Low priority issue'
        })
      )
    })

    it('should resolve alert', () => {
      const alertId = monitor.addAlert('error', 'medium', 'TestComponent', 'Test error')
      
      const resolved = monitor.resolveAlert(alertId)
      expect(resolved).toBe(true)
      
      const activeAlerts = monitor.getActiveAlerts()
      expect(activeAlerts).toHaveLength(0)
      
      // Check Vercel log for resolution
      expect(mockConsole.log).toHaveBeenCalledWith(
        '✅ ALERT_RESOLVED',
        expect.objectContaining({
          alertId,
          type: 'error',
          severity: 'medium',
          component: 'TestComponent',
          resolutionTime: expect.any(Number)
        })
      )
    })

    it('should not resolve non-existent alert', () => {
      const resolved = monitor.resolveAlert('non-existent')
      expect(resolved).toBe(false)
    })

    it('should get all alerts', () => {
      monitor.addAlert('error', 'high', 'Component1', 'Error 1')
      const alertId = monitor.addAlert('performance', 'medium', 'Component2', 'Error 2')
      monitor.resolveAlert(alertId)
      
      const allAlerts = monitor.getAllAlerts()
      expect(allAlerts).toHaveLength(2)
      
      const activeAlerts = monitor.getActiveAlerts()
      expect(activeAlerts).toHaveLength(1)
    })
  })

  describe('health history', () => {
    it('should store health history', async () => {
      await monitor.getSystemHealth()
      
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1))
      
      await monitor.getSystemHealth()
      
      const history = monitor.getHealthHistory()
      expect(history).toHaveLength(2)
      expect(history[0].timestamp).toBeLessThanOrEqual(history[1].timestamp)
    })

    it('should limit health history', async () => {
      // Generate more history than limit
      for (let i = 0; i < 5; i++) {
        await monitor.getSystemHealth()
      }
      
      const history = monitor.getHealthHistory(3)
      expect(history).toHaveLength(3)
    })
  })

  describe('recommendations', () => {
    it('should get recommendations', () => {
      const recommendations = monitor.getRecommendations()
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('periodic monitoring', () => {
    it('should perform periodic health checks', async () => {
      monitor.startMonitoring()
      
      // Wait for a couple of intervals
      await new Promise(resolve => setTimeout(resolve, 250))
      
      monitor.stopMonitoring()
      
      // Should have performed multiple health checks
      const metricsCalls = mockConsole.log.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('SYSTEM_METRICS')
      )
      
      expect(metricsCalls.length).toBeGreaterThan(0)
    })
  })

  describe('component health checks', () => {
    it('should check connection pool health', async () => {
      const health = await monitor.getSystemHealth()
      
      expect(health.components.connectionPool).toMatchObject({
        status: expect.stringMatching(/^(healthy|warning|critical)$/),
        metrics: expect.objectContaining({
          activeConnections: expect.any(Number),
          queuedTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          failedTasks: expect.any(Number)
        }),
        lastCheck: expect.any(Number),
        issues: expect.any(Array)
      })
    })

    it('should check circuit breaker health', async () => {
      const health = await monitor.getSystemHealth()
      
      expect(health.components.circuitBreakers).toMatchObject({
        status: expect.stringMatching(/^(healthy|warning|critical)$/),
        metrics: expect.objectContaining({
          totalBreakers: expect.any(Number),
          openBreakers: expect.any(Number),
          unhealthyBreakers: expect.any(Number),
          healthyRatio: expect.any(Number)
        }),
        lastCheck: expect.any(Number),
        issues: expect.any(Array)
      })
    })

    it('should check event bus health', async () => {
      const health = await monitor.getSystemHealth()
      
      expect(health.components.eventBus).toMatchObject({
        status: expect.stringMatching(/^(healthy|warning|critical)$/),
        metrics: expect.objectContaining({
          totalEvents: expect.any(Number),
          subscriberCount: expect.any(Number),
          errorCount: expect.any(Number),
          averageProcessingTime: expect.any(Number),
          errorRate: expect.any(Number)
        }),
        lastCheck: expect.any(Number),
        issues: expect.any(Array)
      })
    })
  })

  describe('Vercel logging format', () => {
    it('should use structured logging format for Vercel', async () => {
      await monitor.getSystemHealth()
      
      // Check that all logs have proper structure
      mockConsole.log.mock.calls.forEach(call => {
        if (typeof call[0] === 'string' && call[0].includes('SYSTEM_')) {
          expect(call[1]).toMatchObject({
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
          })
        }
      })
    })

    it('should include emojis for easy visual identification', async () => {
      const alertId = monitor.addAlert('error', 'critical', 'TestComponent', 'Test error')
      monitor.resolveAlert(alertId)
      await monitor.getSystemHealth()
      
      const allCalls = [
        ...mockConsole.log.mock.calls,
        ...mockConsole.warn.mock.calls,
        ...mockConsole.error.mock.calls
      ]
      
      const logMessages = allCalls.map(call => call[0]).filter(msg => typeof msg === 'string')
      
      expect(logMessages.some(msg => msg.includes('🚨'))).toBe(true) // Critical alert
      expect(logMessages.some(msg => msg.includes('✅'))).toBe(true) // Alert resolved or health OK
      expect(logMessages.some(msg => msg.includes('📊'))).toBe(true) // Metrics
    })
  })
})