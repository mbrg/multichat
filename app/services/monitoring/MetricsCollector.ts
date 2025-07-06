/**
 * Enhanced Metrics Collector
 *
 * Collects detailed performance and business metrics following Dave Farley's principles:
 * - Comprehensive observability for debugging and optimization
 * - Fast feedback loops with real-time metrics
 * - Business metrics aligned with user value
 */

export interface DetailedMetrics {
  // Performance Metrics
  performance: {
    pageLoadTime: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
    firstInputDelay: number
    timeToInteractive: number
  }

  // User Experience Metrics
  userExperience: {
    possibilityGenerationTime: number
    streamingLatency: number
    averageTokensPerSecond: number
    userEngagementScore: number
    sessionDuration: number
    bounceRate: number
  }

  // System Performance
  system: {
    memoryUsage: number
    cpuUtilization: number
    networkLatency: number
    errorRate: number
    throughput: number
    concurrentUsers: number
  }

  // Business Metrics
  business: {
    dailyActiveUsers: number
    conversationsPerUser: number
    averageConversationLength: number
    featureAdoptionRate: Record<string, number>
    retentionRate: number
    conversionFunnel: Record<string, number>
  }

  // AI Performance
  aiPerformance: {
    modelResponseTimes: Record<string, number>
    modelErrorRates: Record<string, number>
    tokenGenerationRate: Record<string, number>
    modelUtilization: Record<string, number>
    qualityScores: Record<string, number>
  }
}

export class MetricsCollector {
  private static instance: MetricsCollector | null = null
  private metrics: Partial<DetailedMetrics> = {}
  private startTime = Date.now()
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializePerformanceObservers()
    this.initializeUserExperienceTracking()
  }

  static getInstance(): MetricsCollector {
    if (!this.instance) {
      this.instance = new MetricsCollector()
    }
    return this.instance
  }

  /**
   * Initialize performance observers
   */
  private initializePerformanceObservers(): void {
    if (typeof window === 'undefined') return

    // Web Vitals Collection
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry

        this.updateMetric(
          'performance.largestContentfulPaint',
          lastEntry.startTime
        )
        this.logMetric('LCP', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.updateMetric(
            'performance.firstInputDelay',
            entry.processingStart - entry.startTime
          )
          this.logMetric('FID', entry.processingStart - entry.startTime)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })

        this.updateMetric('performance.cumulativeLayoutShift', clsValue)
        this.logMetric('CLS', clsValue)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // Navigation Timing
      window.addEventListener('load', () => {
        setTimeout(() => {
          const nav = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming
          if (nav) {
            this.updateMetric(
              'performance.pageLoadTime',
              nav.loadEventEnd - nav.fetchStart
            )
            this.updateMetric(
              'performance.firstContentfulPaint',
              nav.domContentLoadedEventEnd - nav.fetchStart
            )
            this.updateMetric(
              'performance.timeToInteractive',
              nav.domInteractive - nav.fetchStart
            )
          }
        }, 0)
      })
    } catch (error) {
      console.warn('Performance observers not supported:', error)
    }
  }

  /**
   * Initialize user experience tracking
   */
  private initializeUserExperienceTracking(): void {
    if (typeof window === 'undefined') return

    // Track session duration
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - this.startTime
      this.updateMetric('userExperience.sessionDuration', sessionDuration)
      this.logMetric('SESSION_DURATION', sessionDuration)
    })

    // Track user engagement
    let lastActivity = Date.now()
    let engagementEvents = 0

    const trackEngagement = () => {
      engagementEvents++
      lastActivity = Date.now()
    }

    ;['click', 'keydown', 'scroll', 'mousemove'].forEach((event) => {
      document.addEventListener(event, trackEngagement, { passive: true })
    })

    // Calculate engagement score periodically
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity
      const engagementScore =
        timeSinceLastActivity < 30000 ? engagementEvents / 10 : 0
      this.updateMetric('userExperience.userEngagementScore', engagementScore)
      engagementEvents = 0
    }, 30000)
  }

  /**
   * Track possibility generation performance
   */
  trackPossibilityGeneration(
    startTime: number,
    endTime: number,
    tokenCount: number
  ): void {
    const duration = endTime - startTime
    const tokensPerSecond = tokenCount / (duration / 1000)

    this.updateMetric('userExperience.possibilityGenerationTime', duration)
    this.updateMetric('userExperience.averageTokensPerSecond', tokensPerSecond)

    this.logMetric('POSSIBILITY_GENERATION', duration, {
      tokenCount,
      tokensPerSecond,
    })
  }

  /**
   * Track streaming latency
   */
  trackStreamingLatency(latency: number): void {
    this.updateMetric('userExperience.streamingLatency', latency)
    this.logMetric('STREAMING_LATENCY', latency)
  }

  /**
   * Track AI model performance
   */
  trackModelPerformance(
    model: string,
    responseTime: number,
    success: boolean,
    tokenCount?: number
  ): void {
    // Update model-specific metrics
    const currentModelTimes =
      this.getMetric('aiPerformance.modelResponseTimes') || {}
    const currentErrorRates =
      this.getMetric('aiPerformance.modelErrorRates') || {}
    const currentTokenRates =
      this.getMetric('aiPerformance.tokenGenerationRate') || {}

    // Update response times (moving average)
    const currentTime = currentModelTimes[model] || responseTime
    currentModelTimes[model] = (currentTime + responseTime) / 2
    this.updateMetric('aiPerformance.modelResponseTimes', currentModelTimes)

    // Update error rates
    const currentErrorRate = currentErrorRates[model] || 0
    const newErrorRate = success
      ? currentErrorRate * 0.95
      : currentErrorRate * 0.95 + 0.05
    currentErrorRates[model] = newErrorRate
    this.updateMetric('aiPerformance.modelErrorRates', currentErrorRates)

    // Update token generation rates
    if (tokenCount && success) {
      const tokensPerSecond = tokenCount / (responseTime / 1000)
      const currentRate = currentTokenRates[model] || tokensPerSecond
      currentTokenRates[model] = (currentRate + tokensPerSecond) / 2
      this.updateMetric('aiPerformance.tokenGenerationRate', currentTokenRates)
    }

    this.logMetric('MODEL_PERFORMANCE', responseTime, {
      model,
      success,
      tokenCount,
      errorRate: currentErrorRates[model],
    })
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(
    metric: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    this.logMetric(`BUSINESS_${metric.toUpperCase()}`, value, metadata)

    // Update specific business metrics
    switch (metric) {
      case 'conversation_started':
        this.incrementMetric('business.conversationsPerUser')
        break
      case 'feature_used':
        if (metadata?.feature) {
          const adoptionRates =
            this.getMetric('business.featureAdoptionRate') || {}
          adoptionRates[metadata.feature] =
            (adoptionRates[metadata.feature] || 0) + 1
          this.updateMetric('business.featureAdoptionRate', adoptionRates)
        }
        break
      case 'user_retention':
        this.updateMetric('business.retentionRate', value)
        break
    }
  }

  /**
   * Track system performance
   */
  trackSystemPerformance(): void {
    if (typeof window === 'undefined') return

    // Memory usage
    const memoryInfo = (performance as any).memory
    if (memoryInfo) {
      const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit
      this.updateMetric('system.memoryUsage', memoryUsage)
    }

    // Network latency (estimated)
    const startTime = Date.now()
    fetch('/api/health', { method: 'HEAD' })
      .then(() => {
        const latency = Date.now() - startTime
        this.updateMetric('system.networkLatency', latency)
      })
      .catch(() => {
        // Ignore network errors for latency measurement
      })

    // Error rate tracking
    window.addEventListener('error', () => {
      this.incrementMetric('system.errorRate')
    })

    window.addEventListener('unhandledrejection', () => {
      this.incrementMetric('system.errorRate')
    })
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Partial<DetailedMetrics> {
    return { ...this.metrics }
  }

  /**
   * Get specific metric
   */
  getMetric(path: string): any {
    const keys = path.split('.')
    let current: any = this.metrics

    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * Update metric value
   */
  private updateMetric(path: string, value: any): void {
    const keys = path.split('.')
    let current: any = this.metrics

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  /**
   * Increment metric value
   */
  private incrementMetric(path: string, increment: number = 1): void {
    const currentValue = this.getMetric(path) || 0
    this.updateMetric(path, currentValue + increment)
  }

  /**
   * Log metric to console and external systems
   */
  private logMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    // Structured logging for Vercel dashboard
    console.log(`📊 METRIC_${name}`, {
      timestamp: new Date().toISOString(),
      metric: name,
      value,
      metadata: metadata || {},
      sessionDuration: Date.now() - this.startTime,
    })
  }

  /**
   * Generate performance report
   */
  generateReport(): DetailedMetrics {
    this.trackSystemPerformance()

    return {
      performance: {
        pageLoadTime: this.getMetric('performance.pageLoadTime') || 0,
        firstContentfulPaint:
          this.getMetric('performance.firstContentfulPaint') || 0,
        largestContentfulPaint:
          this.getMetric('performance.largestContentfulPaint') || 0,
        cumulativeLayoutShift:
          this.getMetric('performance.cumulativeLayoutShift') || 0,
        firstInputDelay: this.getMetric('performance.firstInputDelay') || 0,
        timeToInteractive: this.getMetric('performance.timeToInteractive') || 0,
      },
      userExperience: {
        possibilityGenerationTime:
          this.getMetric('userExperience.possibilityGenerationTime') || 0,
        streamingLatency:
          this.getMetric('userExperience.streamingLatency') || 0,
        averageTokensPerSecond:
          this.getMetric('userExperience.averageTokensPerSecond') || 0,
        userEngagementScore:
          this.getMetric('userExperience.userEngagementScore') || 0,
        sessionDuration: Date.now() - this.startTime,
        bounceRate: this.getMetric('userExperience.bounceRate') || 0,
      },
      system: {
        memoryUsage: this.getMetric('system.memoryUsage') || 0,
        cpuUtilization: this.getMetric('system.cpuUtilization') || 0,
        networkLatency: this.getMetric('system.networkLatency') || 0,
        errorRate: this.getMetric('system.errorRate') || 0,
        throughput: this.getMetric('system.throughput') || 0,
        concurrentUsers: this.getMetric('system.concurrentUsers') || 1,
      },
      business: {
        dailyActiveUsers: this.getMetric('business.dailyActiveUsers') || 0,
        conversationsPerUser:
          this.getMetric('business.conversationsPerUser') || 0,
        averageConversationLength:
          this.getMetric('business.averageConversationLength') || 0,
        featureAdoptionRate:
          this.getMetric('business.featureAdoptionRate') || {},
        retentionRate: this.getMetric('business.retentionRate') || 0,
        conversionFunnel: this.getMetric('business.conversionFunnel') || {},
      },
      aiPerformance: {
        modelResponseTimes:
          this.getMetric('aiPerformance.modelResponseTimes') || {},
        modelErrorRates: this.getMetric('aiPerformance.modelErrorRates') || {},
        tokenGenerationRate:
          this.getMetric('aiPerformance.tokenGenerationRate') || {},
        modelUtilization:
          this.getMetric('aiPerformance.modelUtilization') || {},
        qualityScores: this.getMetric('aiPerformance.qualityScores') || {},
      },
    }
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics = {}
    this.startTime = Date.now()
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []
  }
}
