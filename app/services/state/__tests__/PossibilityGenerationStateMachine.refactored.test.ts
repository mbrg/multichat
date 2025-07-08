/**
 * Possibility Generation State Machine Refactored Tests
 *
 * Comprehensive tests for the refactored state machine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import PossibilityGenerationStateMachine from '../PossibilityGenerationStateMachine'
import { PossibilityGenerationEvent } from '../types'

describe('PossibilityGenerationStateMachine Refactored', () => {
  let machine: PossibilityGenerationStateMachine

  beforeEach(() => {
    machine = new PossibilityGenerationStateMachine()
  })

  describe('Initial State', () => {
    it('should start in idle state', () => {
      expect(machine.getState()).toBe('idle')
    })

    it('should have initial context', () => {
      const context = machine.getContext()
      expect(context.requestId).toBeNull()
      expect(context.possibilityCount).toBe(0)
      expect(context.completedCount).toBe(0)
      expect(context.retryAttempt).toBe(0)
      expect(context.maxRetries).toBe(3)
    })
  })

  describe('State Transitions', () => {
    it('should transition from idle to initializing on START_GENERATION', () => {
      const event: PossibilityGenerationEvent = {
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      }

      const result = machine.send(event)
      expect(result).toBe(true)
      expect(machine.getState()).toBe('initializing')

      const context = machine.getContext()
      expect(context.requestId).toBe('test-123')
      expect(context.possibilityCount).toBe(5)
    })

    it('should transition from initializing to generating', () => {
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })

      const result = machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })

      expect(result).toBe(true)
      expect(machine.getState()).toBe('generating')
    })

    it('should transition from generating to streaming', () => {
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })

      const result = machine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'test-123', activeStreams: 3 },
      })

      expect(result).toBe(true)
      expect(machine.getState()).toBe('streaming')
      expect(machine.getContext().activeStreams).toBe(3)
    })

    it('should complete generation when all possibilities are done', () => {
      // Set up streaming state
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 2 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })
      machine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'test-123', activeStreams: 2 },
      })

      // Complete all possibilities
      const result = machine.send({
        type: 'ALL_COMPLETED',
        payload: { requestId: 'test-123', totalCompleted: 2 },
      })

      expect(result).toBe(true)
      expect(machine.getState()).toBe('completed')
      expect(machine.getContext().completedCount).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should transition to failed on non-retryable error', () => {
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })

      const result = machine.send({
        type: 'ERROR_OCCURRED',
        payload: {
          requestId: 'test-123',
          error: new Error('Test error'),
          retryable: false,
        },
      })

      expect(result).toBe(true)
      expect(machine.getState()).toBe('failed')
      expect(machine.getContext().errors).toHaveLength(1)
    })

    it('should support retry after failure', () => {
      // Get to failed state
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })
      machine.send({
        type: 'ERROR_OCCURRED',
        payload: {
          requestId: 'test-123',
          error: new Error('Test error'),
          retryable: false,
        },
      })

      // Retry
      const result = machine.send({
        type: 'RETRY_GENERATION',
        payload: { requestId: 'test-123', attempt: 1 },
      })

      expect(result).toBe(true)
      expect(machine.getState()).toBe('initializing')
      expect(machine.getContext().retryAttempt).toBe(1)
      expect(machine.getContext().errors).toHaveLength(0) // Errors cleared on retry
    })
  })

  describe('Cancellation', () => {
    it('should cancel from generating state', () => {
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })

      const result = machine.send({
        type: 'CANCEL_GENERATION',
        payload: { requestId: 'test-123', reason: 'User cancelled' },
      })

      expect(result).toBe(true)
      expect(machine.getState()).toBe('cancelled')
      expect(machine.getContext().activeStreams).toBe(0)
    })
  })

  describe('Reset', () => {
    it('should reset to idle from any state', () => {
      // Get to completed state
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 1 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })
      machine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'test-123', activeStreams: 1 },
      })
      machine.send({
        type: 'ALL_COMPLETED',
        payload: { requestId: 'test-123', totalCompleted: 1 },
      })

      expect(machine.getState()).toBe('completed')

      // Reset
      machine.reset()
      expect(machine.getState()).toBe('idle')

      const context = machine.getContext()
      expect(context.requestId).toBeNull()
      expect(context.possibilityCount).toBe(0)
    })
  })

  describe('State Queries', () => {
    it('should check if in specific state', () => {
      expect(machine.is('idle')).toBe(true)
      expect(machine.is('generating')).toBe(false)
    })

    it('should check if can handle event', () => {
      expect(machine.can('START_GENERATION')).toBe(true)
      expect(machine.can('STREAMING_STARTED')).toBe(false)
    })
  })

  describe('Status Information', () => {
    it('should provide status summary', () => {
      const status = machine.getStatus()

      expect(status.state).toBe('idle')
      expect(status.progress).toBe(0)
      expect(status.duration).toBeNull()
      expect(status.isActive).toBe(false)
      expect(status.canRetry).toBe(false)
      expect(status.errorCount).toBe(0)
    })

    it('should calculate progress correctly', () => {
      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 4 },
      })
      machine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'test-123' },
      })
      machine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'test-123', activeStreams: 4 },
      })

      // Complete 2 out of 4
      machine.send({
        type: 'POSSIBILITY_COMPLETED',
        payload: { requestId: 'test-123', possibilityId: 'p1' },
      })
      machine.send({
        type: 'POSSIBILITY_COMPLETED',
        payload: { requestId: 'test-123', possibilityId: 'p2' },
      })

      const status = machine.getStatus()
      expect(status.progress).toBe(0.5) // 2/4 = 0.5
      expect(status.isActive).toBe(true)
    })
  })

  describe('Event Listeners', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn()
      const unsubscribe = machine.onStateChange(listener)

      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })

      expect(listener).toHaveBeenCalledWith(
        'initializing',
        'idle',
        expect.any(Object),
        expect.any(Object)
      )

      unsubscribe()
    })

    it('should unsubscribe listeners', () => {
      const listener = vi.fn()
      const unsubscribe = machine.onStateChange(listener)

      unsubscribe()

      machine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'test-123', possibilityCount: 5 },
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Invalid Transitions', () => {
    it('should reject invalid events', () => {
      const result = machine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'test-123', activeStreams: 1 },
      })

      expect(result).toBe(false)
      expect(machine.getState()).toBe('idle') // State unchanged
    })

    it('should handle malformed events', () => {
      const result = machine.send(null as any)
      expect(result).toBe(false)
    })
  })
})
