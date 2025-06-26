/**
 * Global Event Bus
 *
 * Implements a type-safe publish-subscribe pattern following Dave Farley's principles:
 * - Decouples components for fast feedback loops
 * - Enables multiple subscribers for better extensibility
 * - Type-safe events prevent runtime errors
 * - Highly testable with clear event contracts
 */

export type EventType =
  // AI Generation Events
  | 'ai:generation:started'
  | 'ai:generation:progress'
  | 'ai:generation:completed'
  | 'ai:generation:failed'
  | 'ai:generation:cancelled'
  | 'ai:possibility:created'
  | 'ai:possibility:updated'
  | 'ai:possibility:completed'
  | 'ai:token:received'

  // User Interface Events
  | 'ui:possibility:selected'
  | 'ui:possibility:continued'
  | 'ui:settings:opened'
  | 'ui:settings:saved'
  | 'ui:message:sent'

  // System Events
  | 'system:error:occurred'
  | 'system:performance:measured'
  | 'system:connection:status'
  | 'system:auth:changed'

  // API Events
  | 'api:key:validated'
  | 'api:key:expired'
  | 'api:provider:failed'
  | 'api:rate:limited'

export interface BaseEvent {
  type: EventType
  timestamp: number
  id: string
  source?: string
}

// AI Generation Events
export interface AIGenerationStartedEvent extends BaseEvent {
  type: 'ai:generation:started'
  data: {
    requestId: string
    possibilityCount: number
    models: string[]
    temperatures: number[]
  }
}

export interface AIGenerationProgressEvent extends BaseEvent {
  type: 'ai:generation:progress'
  data: {
    requestId: string
    completedCount: number
    totalCount: number
    activeStreams: number
  }
}

export interface AIGenerationCompletedEvent extends BaseEvent {
  type: 'ai:generation:completed'
  data: {
    requestId: string
    totalCompleted: number
    duration: number
    averageTokensPerSecond: number
  }
}

export interface AIGenerationFailedEvent extends BaseEvent {
  type: 'ai:generation:failed'
  data: {
    requestId: string
    error: Error
    retryable: boolean
    failedProviders: string[]
  }
}

export interface AIPossibilityCreatedEvent extends BaseEvent {
  type: 'ai:possibility:created'
  data: {
    requestId: string
    possibilityId: string
    provider: string
    model: string
    temperature: number
  }
}

export interface AITokenReceivedEvent extends BaseEvent {
  type: 'ai:token:received'
  data: {
    requestId: string
    possibilityId: string
    token: string
    totalTokens: number
  }
}

// UI Events
export interface UIPossibilitySelectedEvent extends BaseEvent {
  type: 'ui:possibility:selected'
  data: {
    possibilityId: string
    provider: string
    model: string
    temperature: number
  }
}

export interface UIMessageSentEvent extends BaseEvent {
  type: 'ui:message:sent'
  data: {
    content: string
    attachmentCount: number
    characterCount: number
  }
}

export interface UISettingsSavedEvent extends BaseEvent {
  type: 'ui:settings:saved'
  data: {
    section: 'api-keys' | 'system-instructions' | 'temperatures'
    changedFields: string[]
  }
}

// System Events
export interface SystemErrorOccurredEvent extends BaseEvent {
  type: 'system:error:occurred'
  data: {
    error: Error
    component: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    context: Record<string, unknown>
  }
}

export interface SystemPerformanceMeasuredEvent extends BaseEvent {
  type: 'system:performance:measured'
  data: {
    operation: string
    duration: number
    memoryUsage?: number
    metadata: Record<string, unknown>
  }
}

export interface SystemAuthChangedEvent extends BaseEvent {
  type: 'system:auth:changed'
  data: {
    isAuthenticated: boolean
    userId?: string
    provider: string
  }
}

// API Events
export interface APIKeyValidatedEvent extends BaseEvent {
  type: 'api:key:validated'
  data: {
    provider: string
    isValid: boolean
    expiresAt?: Date
  }
}

export interface APIProviderFailedEvent extends BaseEvent {
  type: 'api:provider:failed'
  data: {
    provider: string
    model: string
    error: Error
    requestId: string
  }
}

// Union type for all events
export type AppEvent =
  | AIGenerationStartedEvent
  | AIGenerationProgressEvent
  | AIGenerationCompletedEvent
  | AIGenerationFailedEvent
  | AIPossibilityCreatedEvent
  | AITokenReceivedEvent
  | UIPossibilitySelectedEvent
  | UIMessageSentEvent
  | UISettingsSavedEvent
  | SystemErrorOccurredEvent
  | SystemPerformanceMeasuredEvent
  | SystemAuthChangedEvent
  | APIKeyValidatedEvent
  | APIProviderFailedEvent

export type EventHandler<T extends AppEvent = AppEvent> = (
  event: T
) => void | Promise<void>

export interface EventSubscription {
  unsubscribe: () => void
}

export interface EventBusMetrics {
  totalEvents: number
  subscriberCount: number
  eventTypeCounts: Record<EventType, number>
  averageProcessingTime: number
  errorCount: number
}

export class EventBus {
  private static instance: EventBus | null = null
  private subscribers: Map<EventType, Set<EventHandler>> = new Map()
  private wildcardSubscribers: Set<EventHandler> = new Set()
  private metrics: EventBusMetrics = {
    totalEvents: 0,
    subscriberCount: 0,
    eventTypeCounts: {} as Record<EventType, number>,
    averageProcessingTime: 0,
    errorCount: 0,
  }
  private processingTimes: number[] = []
  private maxProcessingTimes = 100 // Keep last 100 processing times for average

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!this.instance) {
      this.instance = new EventBus()
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
   * Subscribe to specific event type
   */
  subscribe<T extends AppEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): EventSubscription {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }

    const handlers = this.subscribers.get(eventType)!
    handlers.add(handler as EventHandler)
    this.updateSubscriberCount()

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler)
        if (handlers.size === 0) {
          this.subscribers.delete(eventType)
        }
        this.updateSubscriberCount()
      },
    }
  }

  /**
   * Subscribe to all events (wildcard subscription)
   */
  subscribeAll(handler: EventHandler): EventSubscription {
    this.wildcardSubscribers.add(handler)
    this.updateSubscriberCount()

    return {
      unsubscribe: () => {
        this.wildcardSubscribers.delete(handler)
        this.updateSubscriberCount()
      },
    }
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T extends AppEvent>(
    eventType: T['type'],
    data: T['data'],
    options: { source?: string; id?: string } = {}
  ): Promise<void> {
    const startTime = performance.now()

    const event: T = {
      type: eventType,
      data,
      timestamp: Date.now(),
      id: options.id ?? this.generateEventId(),
      source: options.source,
    } as T

    // Update metrics
    this.metrics.totalEvents++
    this.metrics.eventTypeCounts[eventType] =
      (this.metrics.eventTypeCounts[eventType] || 0) + 1

    // Get all relevant handlers
    const specificHandlers = this.subscribers.get(eventType) || new Set()
    const allHandlers = [...specificHandlers, ...this.wildcardSubscribers]

    // Execute all handlers
    const handlerPromises = allHandlers.map(async (handler) => {
      try {
        await handler(event)
      } catch (error) {
        this.metrics.errorCount++
        console.error(`Event handler error for ${eventType}:`, error)

        // Publish error event (but prevent infinite loops)
        if (eventType !== 'system:error:occurred') {
          this.publish('system:error:occurred', {
            error: error instanceof Error ? error : new Error(String(error)),
            component: 'EventBus',
            severity: 'medium',
            context: {
              originalEventType: eventType,
              originalEventId: event.id,
            },
          })
        }
      }
    })

    await Promise.all(handlerPromises)

    // Update processing time metrics
    const processingTime = performance.now() - startTime
    this.processingTimes.push(processingTime)
    if (this.processingTimes.length > this.maxProcessingTimes) {
      this.processingTimes.shift()
    }
    this.metrics.averageProcessingTime =
      this.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.processingTimes.length
  }

  /**
   * Publish event synchronously (use with caution)
   */
  publishSync<T extends AppEvent>(
    eventType: T['type'],
    data: T['data'],
    options: { source?: string; id?: string } = {}
  ): void {
    const event: T = {
      type: eventType,
      data,
      timestamp: Date.now(),
      id: options.id ?? this.generateEventId(),
      source: options.source,
    } as T

    // Update metrics
    this.metrics.totalEvents++
    this.metrics.eventTypeCounts[eventType] =
      (this.metrics.eventTypeCounts[eventType] || 0) + 1

    // Get all relevant handlers
    const specificHandlers = this.subscribers.get(eventType) || new Set()
    const allHandlers = [...specificHandlers, ...this.wildcardSubscribers]

    // Execute all handlers synchronously
    allHandlers.forEach((handler) => {
      try {
        const result = handler(event)
        // If handler returns a promise, warn about async usage
        if (result instanceof Promise) {
          console.warn(
            `Async handler used in publishSync for ${eventType}. Consider using publish() instead.`
          )
        }
      } catch (error) {
        this.metrics.errorCount++
        console.error(`Event handler error for ${eventType}:`, error)
      }
    })
  }

  /**
   * Get current event bus metrics
   */
  getMetrics(): Readonly<EventBusMetrics> {
    return { ...this.metrics }
  }

  /**
   * Clear all subscribers (use with caution)
   */
  clear(): void {
    this.subscribers.clear()
    this.wildcardSubscribers.clear()
    this.updateSubscriberCount()
  }

  /**
   * Get all active event types
   */
  getActiveEventTypes(): EventType[] {
    return Array.from(this.subscribers.keys())
  }

  /**
   * Get subscriber count for specific event type
   */
  getSubscriberCount(eventType?: EventType): number {
    if (eventType) {
      return (
        (this.subscribers.get(eventType)?.size || 0) +
        this.wildcardSubscribers.size
      )
    }
    return this.metrics.subscriberCount
  }

  /**
   * Check if any subscribers exist for event type
   */
  hasSubscribers(eventType: EventType): boolean {
    return this.getSubscriberCount(eventType) > 0
  }

  private updateSubscriberCount(): void {
    let totalSubscribers = this.wildcardSubscribers.size
    for (const handlers of this.subscribers.values()) {
      totalSubscribers += handlers.size
    }
    this.metrics.subscriberCount = totalSubscribers
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance and factory functions
export const eventBus = EventBus.getInstance()

/**
 * Convenience function for subscribing to events
 */
export function on<T extends AppEvent>(
  eventType: T['type'],
  handler: EventHandler<T>
): EventSubscription {
  return eventBus.subscribe(eventType, handler)
}

/**
 * Convenience function for publishing events
 */
export function emit<T extends AppEvent>(
  eventType: T['type'],
  data: T['data'],
  options?: { source?: string; id?: string }
): Promise<void> {
  return eventBus.publish(eventType, data, options)
}

/**
 * Convenience function for synchronous event publishing
 */
export function emitSync<T extends AppEvent>(
  eventType: T['type'],
  data: T['data'],
  options?: { source?: string; id?: string }
): void {
  return eventBus.publishSync(eventType, data, options)
}

export default EventBus
