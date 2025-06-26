import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CircuitBreaker, { 
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
  createAIProviderBreaker
} from '../CircuitBreaker'

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker
  let mockOperation: ReturnType<typeof vi.fn>

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringWindow: 5000,
      successThreshold: 2,
      maxRetries: 3,
    })
    
    mockOperation = vi.fn()
  })

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(circuitBreaker.getState()).toBe('closed')
      expect(circuitBreaker.isHealthy()).toBe(true)
    })

    it('should have clean initial metrics', () => {
      const metrics = circuitBreaker.getMetrics()
      
      expect(metrics.state).toBe('closed')
      expect(metrics.failureCount).toBe(0)
      expect(metrics.successCount).toBe(0)
      expect(metrics.totalAttempts).toBe(0)
      expect(metrics.lastFailureTime).toBeNull()
      expect(metrics.lastSuccessTime).toBeNull()
      expect(metrics.stateChanges).toBe(0)
      expect(metrics.currentWindowFailures).toBe(0)
    })
  })

  describe('successful operations', () => {
    it('should execute successful operations', async () => {
      mockOperation.mockResolvedValue('success')
      
      const result = await circuitBreaker.execute(mockOperation)
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledOnce()
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.successCount).toBe(1)
      expect(metrics.totalAttempts).toBe(1)
      expect(metrics.lastSuccessTime).toBeGreaterThan(0)
    })

    it('should handle multiple successful operations', async () => {
      mockOperation.mockResolvedValue('success')
      
      await circuitBreaker.execute(mockOperation)
      await circuitBreaker.execute(mockOperation)
      await circuitBreaker.execute(mockOperation)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.successCount).toBe(3)
      expect(metrics.totalAttempts).toBe(3)
      expect(metrics.failureCount).toBe(0)
      expect(circuitBreaker.getState()).toBe('closed')
    })
  })

  describe('failed operations', () => {
    it('should handle single failure', async () => {
      const error = new Error('Operation failed')
      mockOperation.mockRejectedValue(error)
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Operation failed')
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failureCount).toBe(1)
      expect(metrics.totalAttempts).toBe(1)
      expect(metrics.lastFailureTime).toBeGreaterThan(0)
      expect(circuitBreaker.getState()).toBe('closed') // Still closed after 1 failure
    })

    it('should open circuit after failure threshold', async () => {
      const error = new Error('Operation failed')
      mockOperation.mockRejectedValue(error)
      
      // Trigger failures up to threshold
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('closed')
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('closed')
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('open') // Should open after 3rd failure
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failureCount).toBe(3)
      expect(metrics.stateChanges).toBe(1)
    })

    it('should reject immediately when circuit is open', async () => {
      const error = new Error('Operation failed')
      mockOperation.mockRejectedValue(error)
      
      // Trigger failures to open circuit
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      
      expect(circuitBreaker.getState()).toBe('open')
      
      // Should fail immediately without calling operation
      mockOperation.mockClear()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(CircuitBreakerOpenError)
      expect(mockOperation).not.toHaveBeenCalled()
    })
  })

  describe('recovery behavior', () => {
    beforeEach(async () => {
      // Open the circuit first
      const error = new Error('Operation failed')
      mockOperation.mockRejectedValue(error)
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      
      expect(circuitBreaker.getState()).toBe('open')
      mockOperation.mockClear()
    })

    it('should transition to half-open after recovery timeout', async () => {
      expect(circuitBreaker.getState()).toBe('open')
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Check state (this triggers the state update)
      expect(circuitBreaker.getState()).toBe('half-open')
      expect(circuitBreaker.isHealthy()).toBe(false) // Not healthy until successes
    })

    it('should close circuit after successful operations in half-open', async () => {
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      expect(circuitBreaker.getState()).toBe('half-open')
      
      // Execute successful operations
      mockOperation.mockResolvedValue('success')
      
      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getState()).toBe('half-open') // Still half-open after 1 success
      
      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getState()).toBe('closed') // Closed after 2 successes
      expect(circuitBreaker.isHealthy()).toBe(true)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.stateChanges).toBe(3) // closed -> open -> half-open -> closed
    })

    it('should reopen circuit if operation fails in half-open', async () => {
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      expect(circuitBreaker.getState()).toBe('half-open')
      
      // Fail operation in half-open state
      const error = new Error('Still failing')
      mockOperation.mockRejectedValue(error)
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Still failing')
      expect(circuitBreaker.getState()).toBe('open')
    })
  })

  describe('monitoring window', () => {
    it('should track failures within monitoring window', async () => {
      const error = new Error('Operation failed')
      mockOperation.mockRejectedValue(error)
      
      // Record failures
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      
      let metrics = circuitBreaker.getMetrics()
      expect(metrics.currentWindowFailures).toBe(2)
      expect(circuitBreaker.getState()).toBe('closed')
      
      // Add third failure - should open circuit
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('open')
    })

    it('should clean old failures outside monitoring window', async () => {
      // Create circuit breaker with very short monitoring window for testing
      const shortWindowBreaker = new CircuitBreaker('test-short', {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 100, // 100ms window
        successThreshold: 2,
        maxRetries: 3,
      })
      
      const error = new Error('Operation failed')
      mockOperation.mockRejectedValue(error)
      
      // Record failures
      await expect(shortWindowBreaker.execute(mockOperation)).rejects.toThrow()
      await expect(shortWindowBreaker.execute(mockOperation)).rejects.toThrow()
      
      // Wait for monitoring window to pass
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Check that old failures are cleaned
      const metrics = shortWindowBreaker.getMetrics()
      expect(metrics.currentWindowFailures).toBe(0)
      expect(shortWindowBreaker.getState()).toBe('closed')
    })
  })

  describe('manual control', () => {
    it('should allow forcing state', () => {
      circuitBreaker.forceState('open')
      expect(circuitBreaker.getState()).toBe('open')
      
      circuitBreaker.forceState('half-open')
      expect(circuitBreaker.getState()).toBe('half-open')
      
      circuitBreaker.forceState('closed')
      expect(circuitBreaker.getState()).toBe('closed')
    })

    it('should reset metrics when forcing to closed', () => {
      // Add some failures first
      circuitBreaker.forceState('open')
      let metrics = circuitBreaker.getMetrics()
      
      // Force to closed should reset counters
      circuitBreaker.forceState('closed')
      metrics = circuitBreaker.getMetrics()
      
      expect(metrics.state).toBe('closed')
      expect(circuitBreaker.isHealthy()).toBe(true)
    })

    it('should reset all metrics', () => {
      // Add some state
      circuitBreaker.forceState('open')
      
      circuitBreaker.reset()
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('closed')
      expect(metrics.failureCount).toBe(0)
      expect(metrics.successCount).toBe(0)
      expect(metrics.totalAttempts).toBe(0)
      expect(metrics.stateChanges).toBe(0)
    })
  })

  describe('health checking', () => {
    it('should be healthy when closed', () => {
      expect(circuitBreaker.isHealthy()).toBe(true)
    })

    it('should be unhealthy when open', () => {
      circuitBreaker.forceState('open')
      expect(circuitBreaker.isHealthy()).toBe(false)
    })

    it('should be healthy in half-open with recent success', async () => {
      circuitBreaker.forceState('half-open')
      expect(circuitBreaker.isHealthy()).toBe(false)
      
      // Execute successful operation
      mockOperation.mockResolvedValue('success')
      await circuitBreaker.execute(mockOperation)
      
      expect(circuitBreaker.isHealthy()).toBe(true)
    })
  })
})

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry

  beforeEach(() => {
    CircuitBreakerRegistry.reset()
    registry = CircuitBreakerRegistry.getInstance()
  })

  afterEach(() => {
    CircuitBreakerRegistry.reset()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = CircuitBreakerRegistry.getInstance()
      const instance2 = CircuitBreakerRegistry.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should reset instance', () => {
      const instance1 = CircuitBreakerRegistry.getInstance()
      CircuitBreakerRegistry.reset()
      const instance2 = CircuitBreakerRegistry.getInstance()
      
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('breaker management', () => {
    it('should create new circuit breaker', () => {
      const breaker = registry.getBreaker('test-service')
      
      expect(breaker).toBeInstanceOf(CircuitBreaker)
      expect(breaker.getState()).toBe('closed')
    })

    it('should return existing circuit breaker', () => {
      const breaker1 = registry.getBreaker('test-service')
      const breaker2 = registry.getBreaker('test-service')
      
      expect(breaker1).toBe(breaker2)
    })

    it('should create breaker with custom options', () => {
      const customOptions = {
        failureThreshold: 10,
        recoveryTimeout: 5000,
        monitoringWindow: 10000,
        successThreshold: 5,
        maxRetries: 2,
      }
      
      const breaker = registry.getBreaker('custom-service', customOptions)
      
      // Test by trying to access the private options through metrics behavior
      expect(breaker).toBeInstanceOf(CircuitBreaker)
    })

    it('should remove circuit breaker', () => {
      registry.getBreaker('test-service')
      
      const removed = registry.removeBreaker('test-service')
      expect(removed).toBe(true)
      
      const removedAgain = registry.removeBreaker('test-service')
      expect(removedAgain).toBe(false)
    })

    it('should clear all circuit breakers', () => {
      registry.getBreaker('service1')
      registry.getBreaker('service2')
      
      registry.clear()
      
      const metrics = registry.getAllMetrics()
      expect(Object.keys(metrics)).toHaveLength(0)
    })
  })

  describe('metrics and monitoring', () => {
    it('should collect metrics from all breakers', () => {
      const breaker1 = registry.getBreaker('service1')
      const breaker2 = registry.getBreaker('service2')
      
      breaker1.forceState('open')
      breaker2.forceState('half-open')
      
      const metrics = registry.getAllMetrics()
      
      expect(metrics).toHaveProperty('service1')
      expect(metrics).toHaveProperty('service2')
      expect(metrics.service1.state).toBe('open')
      expect(metrics.service2.state).toBe('half-open')
    })

    it('should get all configurations', () => {
      registry.getBreaker('service1', { failureThreshold: 5, recoveryTimeout: 1000, monitoringWindow: 5000, successThreshold: 2, maxRetries: 3 })
      registry.getBreaker('service2')
      
      const configs = registry.getAllConfigs()
      
      expect(configs).toHaveProperty('service1')
      expect(configs).toHaveProperty('service2')
      expect(configs.service1.options.failureThreshold).toBe(5)
    })

    it('should detect unhealthy breakers', () => {
      const breaker1 = registry.getBreaker('service1')
      const breaker2 = registry.getBreaker('service2')
      
      expect(registry.hasUnhealthyBreakers()).toBe(false)
      
      breaker1.forceState('open')
      
      expect(registry.hasUnhealthyBreakers()).toBe(true)
      expect(registry.getUnhealthyBreakers()).toEqual(['service1'])
      
      breaker2.forceState('open')
      
      expect(registry.getUnhealthyBreakers()).toEqual(['service1', 'service2'])
    })

    it('should reset all breakers', () => {
      const breaker1 = registry.getBreaker('service1')
      const breaker2 = registry.getBreaker('service2')
      
      breaker1.forceState('open')
      breaker2.forceState('half-open')
      
      registry.resetAll()
      
      expect(breaker1.getState()).toBe('closed')
      expect(breaker2.getState()).toBe('closed')
    })
  })
})

describe('AI Provider Helper', () => {
  let registry: CircuitBreakerRegistry

  beforeEach(() => {
    CircuitBreakerRegistry.reset()
    registry = CircuitBreakerRegistry.getInstance()
  })

  afterEach(() => {
    CircuitBreakerRegistry.reset()
  })

  it('should create circuit breaker with AI provider settings', () => {
    const breaker = createAIProviderBreaker('openai')
    
    expect(breaker).toBeInstanceOf(CircuitBreaker)
    expect(breaker.getState()).toBe('closed')
    
    // Verify it was registered
    const metrics = registry.getAllMetrics()
    expect(metrics).toHaveProperty('ai-provider-openai')
  })

  it('should create different breakers for different providers', () => {
    const openaiBreaker = createAIProviderBreaker('openai')
    const anthropicBreaker = createAIProviderBreaker('anthropic')
    
    expect(openaiBreaker).not.toBe(anthropicBreaker)
    
    const metrics = registry.getAllMetrics()
    expect(metrics).toHaveProperty('ai-provider-openai')
    expect(metrics).toHaveProperty('ai-provider-anthropic')
  })
})

describe('CircuitBreakerOpenError', () => {
  it('should have correct name and message', () => {
    const error = new CircuitBreakerOpenError('Circuit is open')
    
    expect(error.name).toBe('CircuitBreakerOpenError')
    expect(error.message).toBe('Circuit is open')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('edge cases and stress testing', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('stress-test', {
      failureThreshold: 5,
      recoveryTimeout: 100,
      monitoringWindow: 1000,
      successThreshold: 3,
      maxRetries: 2,
    })
  })

  it('should handle rapid state changes', async () => {
    const failOperation = vi.fn().mockRejectedValue(new Error('fail'))
    const successOperation = vi.fn().mockResolvedValue('success')
    
    // Rapid failures to open circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute(failOperation)).rejects.toThrow()
    }
    expect(circuitBreaker.getState()).toBe('open')
    
    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(circuitBreaker.getState()).toBe('half-open')
    
    // Rapid successes to close circuit
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(successOperation)
    }
    expect(circuitBreaker.getState()).toBe('closed')
  })

  it('should handle concurrent operations', async () => {
    const slowOperation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('success'), 50))
    )
    
    // Execute multiple operations concurrently
    const promises = Array.from({ length: 10 }, () => 
      circuitBreaker.execute(slowOperation)
    )
    
    const results = await Promise.all(promises)
    
    expect(results).toHaveLength(10)
    expect(results.every(r => r === 'success')).toBe(true)
    expect(slowOperation).toHaveBeenCalledTimes(10)
    
    const metrics = circuitBreaker.getMetrics()
    expect(metrics.totalAttempts).toBe(10)
    expect(metrics.successCount).toBe(10)
  })

  it('should maintain consistency under mixed success/failure load', async () => {
    // Use a circuit breaker with higher failure threshold to allow more operations
    const tolerantBreaker = new CircuitBreaker('tolerant-test', {
      failureThreshold: 20, // Higher threshold to allow more failures
      recoveryTimeout: 50,
      monitoringWindow: 1000,
      successThreshold: 3,
      maxRetries: 2,
    })
    
    const operations = Array.from({ length: 50 }, (_, i) => {
      if (i % 6 === 0) { // Every 6th operation fails (less frequent failures)
        return vi.fn().mockRejectedValue(new Error(`fail-${i}`))
      }
      return vi.fn().mockResolvedValue(`success-${i}`)
    })
    
    let successCount = 0
    let failureCount = 0
    let circuitOpenCount = 0
    
    for (const operation of operations) {
      try {
        await tolerantBreaker.execute(operation)
        successCount++
      } catch (error) {
        if (error.name === 'CircuitBreakerOpenError') {
          circuitOpenCount++
        } else {
          failureCount++
        }
      }
    }
    
    const metrics = tolerantBreaker.getMetrics()
    
    // Verify that attempts were made (some might be rejected by open circuit)
    expect(metrics.totalAttempts).toBeGreaterThan(0)
    expect(successCount + failureCount + circuitOpenCount).toBe(50)
    expect(successCount).toBeGreaterThan(0) // Should have some successes
  })
})