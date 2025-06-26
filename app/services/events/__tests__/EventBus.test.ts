import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  EventBus,
  eventBus,
  on,
  emit,
  emitSync,
  type AIGenerationStartedEvent,
  type UIMessageSentEvent,
  type SystemErrorOccurredEvent,
} from '../EventBus'

describe('EventBus', () => {
  let testEventBus: EventBus

  beforeEach(() => {
    // Create fresh instance for each test
    EventBus.reset()
    testEventBus = EventBus.getInstance()
  })

  afterEach(() => {
    testEventBus.clear()
    EventBus.reset()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = EventBus.getInstance()
      const instance2 = EventBus.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should reset instance', () => {
      const instance1 = EventBus.getInstance()
      EventBus.reset()
      const instance2 = EventBus.getInstance()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('event subscription', () => {
    it('should subscribe to specific event type', () => {
      const handler = vi.fn()

      const subscription = testEventBus.subscribe(
        'ai:generation:started',
        handler
      )

      expect(testEventBus.getSubscriberCount('ai:generation:started')).toBe(1)
      expect(subscription.unsubscribe).toBeInstanceOf(Function)
    })

    it('should allow multiple subscribers for same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      testEventBus.subscribe('ai:generation:started', handler1)
      testEventBus.subscribe('ai:generation:started', handler2)

      expect(testEventBus.getSubscriberCount('ai:generation:started')).toBe(2)
    })

    it('should subscribe to all events with wildcard', () => {
      const handler = vi.fn()

      const subscription = testEventBus.subscribeAll(handler)

      expect(testEventBus.getSubscriberCount()).toBe(1)
      expect(subscription.unsubscribe).toBeInstanceOf(Function)
    })

    it('should unsubscribe correctly', () => {
      const handler = vi.fn()

      const subscription = testEventBus.subscribe(
        'ai:generation:started',
        handler
      )
      expect(testEventBus.getSubscriberCount('ai:generation:started')).toBe(1)

      subscription.unsubscribe()
      expect(testEventBus.getSubscriberCount('ai:generation:started')).toBe(0)
    })

    it('should remove event type when no subscribers remain', () => {
      const handler = vi.fn()

      const subscription = testEventBus.subscribe(
        'ai:generation:started',
        handler
      )
      expect(testEventBus.getActiveEventTypes()).toContain(
        'ai:generation:started'
      )

      subscription.unsubscribe()
      expect(testEventBus.getActiveEventTypes()).not.toContain(
        'ai:generation:started'
      )
    })
  })

  describe('event publishing', () => {
    it('should publish events to specific subscribers', async () => {
      const handler = vi.fn()

      testEventBus.subscribe('ai:generation:started', handler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 3,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai:generation:started',
          data: {
            requestId: 'req-1',
            possibilityCount: 3,
            models: ['gpt-4'],
            temperatures: [0.7],
          },
          timestamp: expect.any(Number),
          id: expect.any(String),
        })
      )
    })

    it('should publish events to wildcard subscribers', async () => {
      const wildcardHandler = vi.fn()
      const specificHandler = vi.fn()

      testEventBus.subscribeAll(wildcardHandler)
      testEventBus.subscribe('ui:message:sent', specificHandler)

      await testEventBus.publish('ui:message:sent', {
        content: 'Hello world',
        attachmentCount: 0,
        characterCount: 11,
      })

      expect(wildcardHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:message:sent',
          data: expect.objectContaining({
            content: 'Hello world',
          }),
        })
      )

      expect(specificHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:message:sent',
        })
      )
    })

    it('should include custom event ID and source', async () => {
      const handler = vi.fn()

      testEventBus.subscribe('ai:generation:started', handler)

      await testEventBus.publish(
        'ai:generation:started',
        {
          requestId: 'req-1',
          possibilityCount: 1,
          models: ['gpt-4'],
          temperatures: [0.7],
        },
        {
          id: 'custom-id',
          source: 'test-component',
        }
      )

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'custom-id',
          source: 'test-component',
        })
      )
    })

    it('should handle async handlers', async () => {
      const asyncHandler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      testEventBus.subscribe('ai:generation:started', asyncHandler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      expect(asyncHandler).toHaveBeenCalled()
    })

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const goodHandler = vi.fn()
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      testEventBus.subscribe('ai:generation:started', errorHandler)
      testEventBus.subscribe('ai:generation:started', goodHandler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      expect(consoleError).toHaveBeenCalledWith(
        'Event handler error for ai:generation:started:',
        expect.any(Error)
      )
      expect(goodHandler).toHaveBeenCalled() // Other handlers should still execute

      consoleError.mockRestore()
    })

    it('should publish error events for handler failures', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const systemErrorHandler = vi.fn()
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      testEventBus.subscribe('ai:generation:started', errorHandler)
      testEventBus.subscribe('system:error:occurred', systemErrorHandler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      expect(systemErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:error:occurred',
          data: expect.objectContaining({
            error: expect.any(Error),
            component: 'EventBus',
            context: expect.objectContaining({
              originalEventType: 'ai:generation:started',
            }),
          }),
        })
      )

      consoleError.mockRestore()
    })
  })

  describe('synchronous publishing', () => {
    it('should publish events synchronously', () => {
      const handler = vi.fn()

      testEventBus.subscribe('ui:message:sent', handler)

      testEventBus.publishSync('ui:message:sent', {
        content: 'Hello',
        attachmentCount: 0,
        characterCount: 5,
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:message:sent',
          data: expect.objectContaining({
            content: 'Hello',
          }),
        })
      )
    })

    it('should warn about async handlers in sync mode', () => {
      const asyncHandler = vi.fn(async () => {
        await Promise.resolve()
      })
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      testEventBus.subscribe('ui:message:sent', asyncHandler)

      testEventBus.publishSync('ui:message:sent', {
        content: 'Hello',
        attachmentCount: 0,
        characterCount: 5,
      })

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Async handler used in publishSync')
      )

      consoleWarn.mockRestore()
    })
  })

  describe('metrics tracking', () => {
    it('should track event metrics', async () => {
      const handler = vi.fn()

      testEventBus.subscribe('ai:generation:started', handler)
      testEventBus.subscribe('ui:message:sent', handler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      await testEventBus.publish('ui:message:sent', {
        content: 'Hello',
        attachmentCount: 0,
        characterCount: 5,
      })

      const metrics = testEventBus.getMetrics()

      expect(metrics.totalEvents).toBe(2)
      expect(metrics.subscriberCount).toBe(2)
      expect(metrics.eventTypeCounts['ai:generation:started']).toBe(1)
      expect(metrics.eventTypeCounts['ui:message:sent']).toBe(1)
      expect(metrics.averageProcessingTime).toBeGreaterThan(0)
    })

    it('should track error count in metrics', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Test error')
      })
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      testEventBus.subscribe('ai:generation:started', errorHandler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      const metrics = testEventBus.getMetrics()
      expect(metrics.errorCount).toBe(1)

      consoleError.mockRestore()
    })

    it('should update subscriber count accurately', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const sub1 = testEventBus.subscribe('ai:generation:started', handler1)
      expect(testEventBus.getMetrics().subscriberCount).toBe(1)

      const sub2 = testEventBus.subscribeAll(handler2)
      expect(testEventBus.getMetrics().subscriberCount).toBe(2)

      sub1.unsubscribe()
      expect(testEventBus.getMetrics().subscriberCount).toBe(1)

      sub2.unsubscribe()
      expect(testEventBus.getMetrics().subscriberCount).toBe(0)
    })
  })

  describe('utility methods', () => {
    it('should check if subscribers exist', () => {
      expect(testEventBus.hasSubscribers('ai:generation:started')).toBe(false)

      testEventBus.subscribe('ai:generation:started', vi.fn())
      expect(testEventBus.hasSubscribers('ai:generation:started')).toBe(true)
    })

    it('should return active event types', () => {
      expect(testEventBus.getActiveEventTypes()).toEqual([])

      testEventBus.subscribe('ai:generation:started', vi.fn())
      testEventBus.subscribe('ui:message:sent', vi.fn())

      const activeTypes = testEventBus.getActiveEventTypes()
      expect(activeTypes).toContain('ai:generation:started')
      expect(activeTypes).toContain('ui:message:sent')
    })

    it('should clear all subscribers', () => {
      testEventBus.subscribe('ai:generation:started', vi.fn())
      testEventBus.subscribeAll(vi.fn())

      expect(testEventBus.getMetrics().subscriberCount).toBe(2)

      testEventBus.clear()

      expect(testEventBus.getMetrics().subscriberCount).toBe(0)
      expect(testEventBus.getActiveEventTypes()).toEqual([])
    })

    it('should get subscriber count for specific event type', () => {
      testEventBus.subscribe('ai:generation:started', vi.fn())
      testEventBus.subscribe('ai:generation:started', vi.fn())
      testEventBus.subscribeAll(vi.fn()) // This counts for all event types

      expect(testEventBus.getSubscriberCount('ai:generation:started')).toBe(3) // 2 specific + 1 wildcard
      expect(testEventBus.getSubscriberCount('ui:message:sent')).toBe(1) // 0 specific + 1 wildcard
    })
  })

  describe('convenience functions', () => {
    it('should work with on() convenience function', () => {
      const handler = vi.fn()

      const subscription = on('ai:generation:started', handler)

      expect(eventBus.getSubscriberCount('ai:generation:started')).toBe(1)
      expect(subscription.unsubscribe).toBeInstanceOf(Function)
    })

    it('should work with emit() convenience function', async () => {
      const handler = vi.fn()

      on('ai:generation:started', handler)

      await emit('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should work with emitSync() convenience function', () => {
      const handler = vi.fn()

      on('ui:message:sent', handler)

      emitSync('ui:message:sent', {
        content: 'Hello',
        attachmentCount: 0,
        characterCount: 5,
      })

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('event ID generation', () => {
    it('should generate unique event IDs', async () => {
      const handler = vi.fn()

      testEventBus.subscribe('ai:generation:started', handler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-2',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      expect(handler).toHaveBeenCalledTimes(2)

      const [call1, call2] = handler.mock.calls
      expect(call1[0].id).not.toBe(call2[0].id)
    })

    it('should include timestamp in events', async () => {
      const handler = vi.fn()
      const beforeTime = Date.now()

      testEventBus.subscribe('ai:generation:started', handler)

      await testEventBus.publish('ai:generation:started', {
        requestId: 'req-1',
        possibilityCount: 1,
        models: ['gpt-4'],
        temperatures: [0.7],
      })

      const afterTime = Date.now()
      const event = handler.mock.calls[0][0]

      expect(event.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(event.timestamp).toBeLessThanOrEqual(afterTime)
    })
  })
})
