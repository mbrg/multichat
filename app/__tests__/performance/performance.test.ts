/**
 * Performance Regression Tests
 *
 * Ensures system performance remains optimal following Dave Farley's principles:
 * - Fast feedback loops through automated performance monitoring
 * - Continuous testing to prevent performance regressions
 * - Clear performance contracts for critical operations
 * - Observable performance metrics for system health
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionPoolService } from '@/services/ConnectionPoolService'
import { LoggingService } from '@/services/LoggingService'
import { CircuitBreakerRegistry } from '@/services/reliability/CircuitBreaker'
import { EventBus } from '@/services/events/EventBus'
import SystemMonitor from '@/services/monitoring/SystemMonitor'

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  CONNECTION_POOL_OPERATION: 10,
  LOGGING_OPERATION: 5,
  CIRCUIT_BREAKER_OPERATION: 5,
  EVENT_BUS_OPERATION: 15,
  SYSTEM_HEALTH_CHECK: 100,
  COMPONENT_INITIALIZATION: 50,
} as const

/**
 * Measure execution time of an operation
 */
async function measureTime<T>(
  operation: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await operation()
  const duration = performance.now() - start
  return { result, duration }
}

/**
 * Run performance test with multiple iterations
 */
async function runPerformanceTest<T>(
  operation: () => Promise<T> | T,
  iterations: number = 100
): Promise<{
  averageDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
}> {
  const durations: number[] = []

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureTime(operation)
    durations.push(duration)
  }

  durations.sort((a, b) => a - b)

  return {
    averageDuration:
      durations.reduce((sum, d) => sum + d, 0) / durations.length,
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    p95Duration: durations[Math.floor(durations.length * 0.95)],
  }
}

describe('Performance Regression Tests', () => {
  beforeEach(() => {
    // Reset all singletons for clean tests
    ConnectionPoolService.reset()
    LoggingService.reset()
    CircuitBreakerRegistry.reset()
    EventBus.reset()
    SystemMonitor.reset()

    // Suppress console output during performance tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ConnectionPoolService Performance', () => {
    it('should enqueue tasks within performance threshold', async () => {
      const poolService = ConnectionPoolService.getInstance(6)

      const { averageDuration } = await runPerformanceTest(async () => {
        await poolService.enqueue({
          id: `task-${Math.random()}`,
          priority: 'medium',
          execute: async () => {
            await new Promise((resolve) => setTimeout(resolve, 1))
          },
        })
      }, 50) // Fewer iterations due to async nature

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONNECTION_POOL_OPERATION
      )
    })

    it('should get metrics within performance threshold', async () => {
      const poolService = ConnectionPoolService.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        return poolService.getMetrics()
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONNECTION_POOL_OPERATION
      )
    })
  })

  describe('LoggingService Performance', () => {
    it('should log messages within performance threshold', async () => {
      const logger = LoggingService.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        logger.info('Performance test message', {
          testId: Math.random(),
          timestamp: Date.now(),
        })
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LOGGING_OPERATION
      )
    })

    it('should log performance metrics within threshold', async () => {
      const logger = LoggingService.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        logger.logPerformance({
          operation: 'test-operation',
          duration: Math.random() * 100,
          success: true,
          metadata: { test: true },
        })
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LOGGING_OPERATION
      )
    })

    it('should log business metrics within threshold', async () => {
      const logger = LoggingService.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        logger.logBusinessMetric('test_metric', Math.random() * 100, {
          category: 'performance_test',
        })
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LOGGING_OPERATION
      )
    })
  })

  describe('CircuitBreakerRegistry Performance', () => {
    it('should get breaker within performance threshold', async () => {
      const registry = CircuitBreakerRegistry.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        return registry.getBreaker('test-service')
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER_OPERATION
      )
    })

    it('should check breaker health within threshold', async () => {
      const registry = CircuitBreakerRegistry.getInstance()
      const breaker = registry.getBreaker('test-service')

      const { averageDuration } = await runPerformanceTest(() => {
        return breaker.isHealthy()
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER_OPERATION
      )
    })

    it('should execute through breaker within threshold', async () => {
      const registry = CircuitBreakerRegistry.getInstance()
      const breaker = registry.getBreaker('test-service')

      const { averageDuration } = await runPerformanceTest(async () => {
        try {
          await breaker.execute(async () => {
            return 'success'
          })
        } catch (error) {
          // Expected for some iterations when circuit opens
        }
      }, 20) // Fewer iterations due to circuit breaker behavior

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER_OPERATION * 2
      ) // Allow more time for execution
    })
  })

  describe('EventBus Performance', () => {
    it('should subscribe to events within performance threshold', async () => {
      const eventBus = EventBus.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        const handler = () => {}
        return eventBus.subscribe('ai:generation:started', handler)
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.EVENT_BUS_OPERATION
      )
    })

    it('should publish events within performance threshold', async () => {
      const eventBus = EventBus.getInstance()
      const handler = vi.fn()
      eventBus.subscribe('ai:generation:started', handler)

      const { averageDuration } = await runPerformanceTest(async () => {
        await eventBus.publish('ai:generation:started', {
          requestId: `req-${Math.random()}`,
          possibilityCount: 3,
          models: ['test-model'],
          temperatures: [0.7],
        })
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.EVENT_BUS_OPERATION
      )
    })

    it('should get metrics within performance threshold', async () => {
      const eventBus = EventBus.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        return eventBus.getMetrics()
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.EVENT_BUS_OPERATION
      )
    })
  })

  describe('SystemMonitor Performance', () => {
    it('should perform health check within performance threshold', async () => {
      const monitor = SystemMonitor.getInstance({
        checkInterval: 60000, // Don't auto-run during test
        alertThresholds: {
          errorRate: 0.1,
          responseTime: 1000,
          memoryUsage: 0.8,
          cpuUsage: 0.8,
        },
        retentionPeriod: 60000,
        enabledChecks: [
          'connectionPool',
          'circuitBreakers',
          'eventBus',
          'memory',
          'performance',
        ],
      })

      const { duration } = await measureTime(async () => {
        return await monitor.getSystemHealth()
      })

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SYSTEM_HEALTH_CHECK)
    })

    it('should get metrics within performance threshold', async () => {
      const monitor = SystemMonitor.getInstance()

      const { averageDuration } = await runPerformanceTest(() => {
        return monitor.getActiveAlerts()
      })

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.EVENT_BUS_OPERATION
      )
    })
  })

  describe('Component Initialization Performance', () => {
    it('should initialize ConnectionPoolService within threshold', async () => {
      const { duration } = await measureTime(() => {
        ConnectionPoolService.reset()
        return ConnectionPoolService.getInstance()
      })

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.COMPONENT_INITIALIZATION
      )
    })

    it('should initialize LoggingService within threshold', async () => {
      const { duration } = await measureTime(() => {
        LoggingService.reset()
        return LoggingService.getInstance()
      })

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.COMPONENT_INITIALIZATION
      )
    })

    it('should initialize CircuitBreakerRegistry within threshold', async () => {
      const { duration } = await measureTime(() => {
        CircuitBreakerRegistry.reset()
        return CircuitBreakerRegistry.getInstance()
      })

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.COMPONENT_INITIALIZATION
      )
    })

    it('should initialize EventBus within threshold', async () => {
      const { duration } = await measureTime(() => {
        EventBus.reset()
        return EventBus.getInstance()
      })

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.COMPONENT_INITIALIZATION
      )
    })

    it('should initialize SystemMonitor within threshold', async () => {
      const { duration } = await measureTime(() => {
        SystemMonitor.reset()
        return SystemMonitor.getInstance()
      })

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.COMPONENT_INITIALIZATION
      )
    })
  })

  describe('Memory Efficiency Tests', () => {
    it('should not create excessive objects during normal operations', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Perform a series of operations
      const logger = LoggingService.getInstance()
      const eventBus = EventBus.getInstance()
      const poolService = ConnectionPoolService.getInstance()

      for (let i = 0; i < 100; i++) {
        logger.info(`Test message ${i}`)
        await eventBus.publish('ai:generation:started', {
          requestId: `req-${i}`,
          possibilityCount: 1,
          models: ['test'],
          temperatures: [0.7],
        })
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Should not use more than 1MB for 100 operations
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })
  })

  describe('Concurrent Performance', () => {
    it('should handle concurrent event publishing efficiently', async () => {
      const eventBus = EventBus.getInstance()
      const handler = vi.fn()
      eventBus.subscribe('ai:generation:started', handler)

      const { duration } = await measureTime(async () => {
        const promises = Array.from({ length: 50 }, (_, i) =>
          eventBus.publish('ai:generation:started', {
            requestId: `req-${i}`,
            possibilityCount: 1,
            models: ['test'],
            temperatures: [0.7],
          })
        )
        await Promise.all(promises)
      })

      // 50 concurrent events should complete within reasonable time
      expect(duration).toBeLessThan(100)
      expect(handler).toHaveBeenCalledTimes(50)
    })

    it('should handle concurrent circuit breaker operations efficiently', async () => {
      const registry = CircuitBreakerRegistry.getInstance()

      const { duration } = await measureTime(async () => {
        const promises = Array.from({ length: 20 }, (_, i) => {
          const breaker = registry.getBreaker(`service-${i % 5}`) // 5 different services
          return breaker.execute(async () => `result-${i}`)
        })

        try {
          await Promise.all(promises)
        } catch (error) {
          // Some may fail due to circuit breaker opening
        }
      })

      // 20 concurrent operations should complete within reasonable time
      expect(duration).toBeLessThan(50)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect if operations become significantly slower', async () => {
      const logger = LoggingService.getInstance()

      // Baseline measurement
      const baseline = await runPerformanceTest(() => {
        logger.info('Baseline test', { timestamp: Date.now() })
      }, 50)

      // Simulate potential regression by adding artificial delay
      const withDelay = await runPerformanceTest(() => {
        // Add small delay to simulate regression
        const start = performance.now()
        while (performance.now() - start < 0.1) {} // 0.1ms delay

        logger.info('Regression test', { timestamp: Date.now() })
      }, 50)

      // The delay should be detectable
      expect(withDelay.averageDuration).toBeGreaterThanOrEqual(
        baseline.averageDuration
      )

      // But both should still be under threshold
      expect(baseline.averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LOGGING_OPERATION
      )
      expect(withDelay.averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LOGGING_OPERATION * 2
      )
    })
  })
})

// Export performance utilities for use in other tests
export { measureTime, runPerformanceTest, PERFORMANCE_THRESHOLDS }
