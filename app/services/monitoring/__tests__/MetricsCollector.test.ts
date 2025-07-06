/**
 * Metrics Collector Tests
 *
 * Comprehensive tests for the enhanced metrics collection system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MetricsCollector } from '../MetricsCollector'

// Mock Performance API
const mockPerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  callback,
}))

Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: mockPerformanceObserver,
})

global.performance = {
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
} as any

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({ ok: true })

describe('MetricsCollector', () => {
  let collector: MetricsCollector
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    collector = MetricsCollector.getInstance()
    collector.reset()
  })

  afterEach(() => {
    collector.cleanup()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = MetricsCollector.getInstance()
      const instance2 = MetricsCollector.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Possibility Generation Tracking', () => {
    it('should track possibility generation metrics', () => {
      const startTime = Date.now() - 5000
      const endTime = Date.now()
      const tokenCount = 150

      collector.trackPossibilityGeneration(startTime, endTime, tokenCount)

      const metrics = collector.getMetrics()
      expect(metrics.userExperience?.possibilityGenerationTime).toBe(
        endTime - startTime
      )
      expect(metrics.userExperience?.averageTokensPerSecond).toBe(
        tokenCount / 5
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 METRIC_POSSIBILITY_GENERATION',
        expect.objectContaining({
          metric: 'POSSIBILITY_GENERATION',
          value: endTime - startTime,
          metadata: {
            tokenCount,
            tokensPerSecond: tokenCount / 5,
          },
        })
      )
    })
  })

  describe('Streaming Latency Tracking', () => {
    it('should track streaming latency', () => {
      const latency = 250

      collector.trackStreamingLatency(latency)

      const metrics = collector.getMetrics()
      expect(metrics.userExperience?.streamingLatency).toBe(latency)

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 METRIC_STREAMING_LATENCY',
        expect.objectContaining({
          metric: 'STREAMING_LATENCY',
          value: latency,
        })
      )
    })
  })

  describe('AI Model Performance Tracking', () => {
    it('should track successful model performance', () => {
      collector.trackModelPerformance('gpt-4', 2000, true, 100)

      const metrics = collector.getMetrics()
      expect(metrics.aiPerformance?.modelResponseTimes?.['gpt-4']).toBe(2000)
      expect(metrics.aiPerformance?.modelErrorRates?.['gpt-4']).toBeLessThan(
        0.1
      )
      expect(metrics.aiPerformance?.tokenGenerationRate?.['gpt-4']).toBe(50) // 100 tokens / 2 seconds
    })

    it('should track failed model performance', () => {
      collector.trackModelPerformance('claude-3', 1000, false)

      const metrics = collector.getMetrics()
      expect(metrics.aiPerformance?.modelResponseTimes?.['claude-3']).toBe(1000)
      expect(
        metrics.aiPerformance?.modelErrorRates?.['claude-3']
      ).toBeGreaterThan(0)
    })

    it('should calculate moving averages for model metrics', () => {
      // First performance data point
      collector.trackModelPerformance('gpt-4', 2000, true, 100)

      // Second performance data point
      collector.trackModelPerformance('gpt-4', 3000, true, 150)

      const metrics = collector.getMetrics()
      // Should be average of 2000 and 3000 = 2500
      expect(metrics.aiPerformance?.modelResponseTimes?.['gpt-4']).toBe(2500)

      // Token rate should be average of 50 and 50 = 50
      expect(metrics.aiPerformance?.tokenGenerationRate?.['gpt-4']).toBe(50)
    })
  })

  describe('Business Metrics Tracking', () => {
    it('should track conversation started metric', () => {
      collector.trackBusinessMetric('conversation_started', 1)

      const metrics = collector.getMetrics()
      expect(metrics.business?.conversationsPerUser).toBe(1)

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 METRIC_BUSINESS_CONVERSATION_STARTED',
        expect.objectContaining({
          metric: 'BUSINESS_CONVERSATION_STARTED',
          value: 1,
        })
      )
    })

    it('should track feature adoption', () => {
      collector.trackBusinessMetric('feature_used', 1, { feature: 'streaming' })
      collector.trackBusinessMetric('feature_used', 1, { feature: 'streaming' })
      collector.trackBusinessMetric('feature_used', 1, { feature: 'models' })

      const metrics = collector.getMetrics()
      expect(metrics.business?.featureAdoptionRate?.streaming).toBe(2)
      expect(metrics.business?.featureAdoptionRate?.models).toBe(1)
    })

    it('should track retention rate', () => {
      collector.trackBusinessMetric('user_retention', 0.85)

      const metrics = collector.getMetrics()
      expect(metrics.business?.retentionRate).toBe(0.85)
    })
  })

  describe('Metric Accessors', () => {
    it('should get specific metrics by path', () => {
      collector.trackStreamingLatency(123)

      const latency = collector.getMetric('userExperience.streamingLatency')
      expect(latency).toBe(123)
    })

    it('should return undefined for non-existent metrics', () => {
      const result = collector.getMetric('nonexistent.metric')
      expect(result).toBeUndefined()
    })

    it('should handle deep metric paths', () => {
      collector.trackModelPerformance('gpt-4', 1000, true)

      const responseTime = collector.getMetric(
        'aiPerformance.modelResponseTimes.gpt-4'
      )
      expect(responseTime).toBe(1000)
    })
  })

  describe('Report Generation', () => {
    it('should generate comprehensive metrics report', () => {
      // Add some test data
      collector.trackPossibilityGeneration(Date.now() - 3000, Date.now(), 90)
      collector.trackStreamingLatency(200)
      collector.trackModelPerformance('gpt-4', 1500, true, 75)
      collector.trackBusinessMetric('conversation_started', 1)

      const report = collector.generateReport()

      expect(report).toHaveProperty('performance')
      expect(report).toHaveProperty('userExperience')
      expect(report).toHaveProperty('system')
      expect(report).toHaveProperty('business')
      expect(report).toHaveProperty('aiPerformance')

      expect(report.userExperience.possibilityGenerationTime).toBe(3000)
      expect(report.userExperience.streamingLatency).toBe(200)
      expect(report.aiPerformance.modelResponseTimes['gpt-4']).toBe(1500)
      expect(report.business.conversationsPerUser).toBe(1)
    })

    it('should include session duration in report', () => {
      const report = collector.generateReport()

      expect(report.userExperience.sessionDuration).toBeGreaterThanOrEqual(0)
      expect(typeof report.userExperience.sessionDuration).toBe('number')
    })
  })

  describe('Performance Observers', () => {
    it('should handle browser environment detection', () => {
      // Test behavior: should handle different environments correctly
      const metrics = collector.getMetrics()

      // In Node.js test environment, performance metrics should be empty/zero
      // This tests the actual behavior - graceful handling of missing browser APIs
      const report = collector.generateReport()

      expect(report.performance).toBeDefined()
      expect(typeof report.performance.pageLoadTime).toBe('number')
      expect(typeof report.performance.firstContentfulPaint).toBe('number')
      expect(typeof report.performance.largestContentfulPaint).toBe('number')

      // Values should be 0 in test environment (no browser APIs)
      expect(report.performance.pageLoadTime).toBe(0)
      expect(report.performance.firstContentfulPaint).toBe(0)
      expect(report.performance.largestContentfulPaint).toBe(0)
    })

    it('should not crash when performance observers are unavailable', () => {
      // Test behavior: constructor should not throw in any environment
      expect(() => new (MetricsCollector as any)()).not.toThrow()

      // Should still be able to collect other metrics
      const newCollector = new (MetricsCollector as any)()

      // Should track non-performance metrics successfully
      newCollector.trackStreamingLatency(100)
      expect(newCollector.getMetric('userExperience.streamingLatency')).toBe(
        100
      )

      // Clean up
      newCollector.cleanup()
    })

    it('should provide meaningful performance data in reports', () => {
      // Test behavior: reports should always have consistent structure
      const report = collector.generateReport()

      // Performance section should be present and well-structured
      expect(report.performance).toMatchObject({
        pageLoadTime: expect.any(Number),
        firstContentfulPaint: expect.any(Number),
        largestContentfulPaint: expect.any(Number),
        cumulativeLayoutShift: expect.any(Number),
        firstInputDelay: expect.any(Number),
        timeToInteractive: expect.any(Number),
      })

      // All values should be non-negative numbers
      Object.values(report.performance).forEach((value) => {
        expect(typeof value).toBe('number')
        expect(value).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Reset and Cleanup', () => {
    it('should reset metrics', () => {
      collector.trackStreamingLatency(100)
      expect(collector.getMetric('userExperience.streamingLatency')).toBe(100)

      collector.reset()
      expect(
        collector.getMetric('userExperience.streamingLatency')
      ).toBeUndefined()
    })

    it('should cleanup observers', () => {
      const disconnectSpy = vi.fn()
      collector['observers'] = [{ disconnect: disconnectSpy } as any]

      collector.cleanup()
      expect(disconnectSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle performance observer errors gracefully', () => {
      // Mock PerformanceObserver to throw
      const originalObserver = global.PerformanceObserver
      Object.defineProperty(global, 'PerformanceObserver', {
        writable: true,
        value: vi.fn().mockImplementation(() => {
          throw new Error('Observer not supported')
        }),
      })

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // Should not throw
      expect(() => new MetricsCollector()).not.toThrow()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Performance observers not supported:',
        expect.any(Error)
      )

      // Restore
      Object.defineProperty(global, 'PerformanceObserver', {
        writable: true,
        value: originalObserver,
      })
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Integration Tests', () => {
    it('should track complete user flow metrics', () => {
      // Simulate a complete user interaction
      const startTime = Date.now() - 5000

      // User starts conversation
      collector.trackBusinessMetric('conversation_started', 1)

      // Model generates response
      collector.trackModelPerformance('gpt-4', 2000, true, 120)
      collector.trackPossibilityGeneration(startTime, Date.now(), 120)

      // User experiences streaming
      collector.trackStreamingLatency(150)

      // Feature usage
      collector.trackBusinessMetric('feature_used', 1, {
        feature: 'multi_model',
      })

      const report = collector.generateReport()

      // Verify all metrics are captured
      expect(report.business.conversationsPerUser).toBe(1)
      expect(report.business.featureAdoptionRate.multi_model).toBe(1)
      expect(report.aiPerformance.modelResponseTimes['gpt-4']).toBe(2000)
      expect(report.userExperience.possibilityGenerationTime).toBe(5000)
      expect(report.userExperience.streamingLatency).toBe(150)
    })
  })
})
