/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures in AI provider calls following Dave Farley's principles:
 * - Fast failure detection to maintain system responsiveness
 * - Automatic recovery mechanisms for resilient operations
 * - Clear state transitions with comprehensive monitoring
 * - Single responsibility for failure management
 */

export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerOptions {
  failureThreshold: number // Number of failures before opening circuit
  recoveryTimeout: number // Time in ms before attempting recovery
  monitoringWindow: number // Time window for failure tracking
  successThreshold: number // Successes needed in half-open to close circuit
  maxRetries: number // Maximum automatic retries
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failureCount: number
  successCount: number
  totalAttempts: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  stateChanges: number
  currentWindowFailures: number
  timeInCurrentState: number
}

export interface CircuitBreakerConfig {
  name: string
  options: CircuitBreakerOptions
}

/**
 * Circuit breaker for individual operations/providers
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed'
  private failureCount = 0
  private successCount = 0
  private totalAttempts = 0
  private lastFailureTime: number | null = null
  private lastSuccessTime: number | null = null
  private stateChanges = 0
  private stateChangeTime = Date.now()
  private failureWindow: number[] = []

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should be opened due to failures
    this.updateState()

    if (this.state === 'open') {
      throw new CircuitBreakerOpenError(
        `Circuit breaker ${this.name} is open. Last failure: ${this.lastFailureTime}`
      )
    }

    this.totalAttempts++
    const startTime = performance.now()

    try {
      const result = await operation()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(): void {
    this.successCount++
    this.lastSuccessTime = Date.now()

    if (this.state === 'half-open') {
      // Check if we have enough successes to close the circuit
      if (this.successCount >= this.options.successThreshold) {
        this.setState('closed')
        this.resetCounters()
      }
    } else if (this.state === 'closed') {
      // Remove old failures from the window
      this.cleanFailureWindow()
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.failureWindow.push(this.lastFailureTime)

    // Clean old failures outside the monitoring window
    this.cleanFailureWindow()

    // Check if we should open the circuit
    if (this.state === 'closed' && this.shouldOpenCircuit()) {
      this.setState('open')
    } else if (this.state === 'half-open') {
      // Any failure in half-open immediately opens the circuit
      this.setState('open')
    }
  }

  /**
   * Update circuit state based on time and conditions
   */
  private updateState(): void {
    const now = Date.now()

    if (this.state === 'open') {
      // Check if enough time has passed to attempt recovery
      if (
        this.lastFailureTime &&
        now - this.lastFailureTime >= this.options.recoveryTimeout
      ) {
        this.setState('half-open')
        this.successCount = 0 // Reset success counter for half-open period
      }
    }

    // Clean old failures
    this.cleanFailureWindow()
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    return this.failureWindow.length >= this.options.failureThreshold
  }

  /**
   * Clean failures outside the monitoring window
   */
  private cleanFailureWindow(): void {
    const now = Date.now()
    const windowStart = now - this.options.monitoringWindow

    this.failureWindow = this.failureWindow.filter(
      (time) => time >= windowStart
    )
  }

  /**
   * Set circuit state and track changes
   */
  private setState(newState: CircuitBreakerState): void {
    if (newState !== this.state) {
      this.state = newState
      this.stateChanges++
      this.stateChangeTime = Date.now()
    }
  }

  /**
   * Reset failure and success counters
   */
  private resetCounters(): void {
    this.failureCount = 0
    this.successCount = 0
    this.failureWindow = []
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    this.cleanFailureWindow()

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalAttempts: this.totalAttempts,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChanges: this.stateChanges,
      currentWindowFailures: this.failureWindow.length,
      timeInCurrentState: Date.now() - this.stateChangeTime,
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    this.updateState()
    return this.state
  }

  /**
   * Check if circuit is healthy (closed or half-open with recent success)
   */
  isHealthy(): boolean {
    this.updateState()

    if (this.state === 'closed') {
      return true
    }

    if (this.state === 'half-open' && this.successCount > 0) {
      return true
    }

    return false
  }

  /**
   * Force circuit to specific state (for testing/manual control)
   */
  forceState(state: CircuitBreakerState): void {
    this.setState(state)

    if (state === 'closed') {
      this.resetCounters()
    }
  }

  /**
   * Reset all metrics and state
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.totalAttempts = 0
    this.lastFailureTime = null
    this.lastSuccessTime = null
    this.stateChanges = 0
    this.stateChangeTime = Date.now()
    this.failureWindow = []
  }

  /**
   * Manually record success (for streaming operations that can't use execute())
   */
  recordOperationSuccess(): void {
    this.totalAttempts++
    this.recordSuccess()
  }

  /**
   * Manually record failure (for streaming operations that can't use execute())
   */
  recordOperationFailure(): void {
    this.totalAttempts++
    this.recordFailure()
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

/**
 * Circuit Breaker Registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry | null = null
  private breakers: Map<string, CircuitBreaker> = new Map()
  private configs: Map<string, CircuitBreakerConfig> = new Map()

  /**
   * Singleton instance
   */
  static getInstance(): CircuitBreakerRegistry {
    if (!this.instance) {
      this.instance = new CircuitBreakerRegistry()
    }
    return this.instance
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    this.instance = null
  }

  /**
   * Get or create circuit breaker for a service
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringWindow: 60000, // 1 minute
        successThreshold: 3,
        maxRetries: 3,
      }

      const finalOptions = { ...defaultOptions, ...options }
      const breaker = new CircuitBreaker(name, finalOptions)

      this.breakers.set(name, breaker)
      this.configs.set(name, { name, options: finalOptions })
    }

    return this.breakers.get(name)!
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {}

    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics()
    }

    return metrics
  }

  /**
   * Get all circuit breaker configurations
   */
  getAllConfigs(): Record<string, CircuitBreakerConfig> {
    const configs: Record<string, CircuitBreakerConfig> = {}

    for (const [name, config] of this.configs) {
      configs[name] = config
    }

    return configs
  }

  /**
   * Check if any circuit breakers are unhealthy
   */
  hasUnhealthyBreakers(): boolean {
    for (const breaker of this.breakers.values()) {
      if (!breaker.isHealthy()) {
        return true
      }
    }
    return false
  }

  /**
   * Get list of unhealthy circuit breaker names
   */
  getUnhealthyBreakers(): string[] {
    const unhealthy: string[] = []

    for (const [name, breaker] of this.breakers) {
      if (!breaker.isHealthy()) {
        unhealthy.push(name)
      }
    }

    return unhealthy
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }

  /**
   * Remove circuit breaker
   */
  removeBreaker(name: string): boolean {
    const removed = this.breakers.delete(name)
    this.configs.delete(name)
    return removed
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear()
    this.configs.clear()
  }
}

/**
 * Default registry instance
 */
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance()

/**
 * Helper function to create circuit breaker with common AI provider settings
 */
export function createAIProviderBreaker(providerName: string): CircuitBreaker {
  return CircuitBreakerRegistry.getInstance().getBreaker(
    `ai-provider-${providerName}`,
    {
      failureThreshold: 3, // Open after 3 failures
      recoveryTimeout: 60000, // Wait 1 minute before trying again
      monitoringWindow: 300000, // Track failures over 5 minutes
      successThreshold: 2, // Need 2 successes to close circuit
      maxRetries: 2,
    }
  )
}

export default CircuitBreaker
