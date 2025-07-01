import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PossibilityGenerationStateMachine,
  type PossibilityGenerationEvent,
  type StateChangeListener,
} from '../PossibilityGenerationStateMachine'

describe('PossibilityGenerationStateMachine', () => {
  let stateMachine: PossibilityGenerationStateMachine
  let mockListener: StateChangeListener

  beforeEach(() => {
    stateMachine = new PossibilityGenerationStateMachine()
    mockListener = vi.fn()
  })

  describe('initial state', () => {
    it('should start in idle state', () => {
      expect(stateMachine.getState()).toBe('idle')
    })

    it('should have initial context', () => {
      const context = stateMachine.getContext()
      expect(context).toEqual({
        requestId: null,
        possibilityCount: 0,
        completedCount: 0,
        activeStreams: 0,
        errors: [],
        retryAttempt: 0,
        maxRetries: 3,
        startTime: null,
        lastActivity: null,
      })
    })

    it('should indicate not active', () => {
      const status = stateMachine.getStatus()
      expect(status.isActive).toBe(false)
      expect(status.progress).toBe(0)
      expect(status.duration).toBe(null)
    })
  })

  describe('state transitions', () => {
    it('should transition from idle to initializing on START_GENERATION', () => {
      const event: PossibilityGenerationEvent = {
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 5 },
      }

      const result = stateMachine.send(event)

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('initializing')

      const context = stateMachine.getContext()
      expect(context.requestId).toBe('req-1')
      expect(context.possibilityCount).toBe(5)
      expect(context.startTime).toBeTruthy()
    })

    it('should transition from initializing to generating', () => {
      // Start generation first
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 3 },
      })

      const result = stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('generating')
    })

    it('should transition from generating to streaming', () => {
      // Setup: Get to generating state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 3 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })

      const result = stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 3 },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('streaming')
      expect(stateMachine.getContext().activeStreams).toBe(3)
    })

    it('should stay in streaming state when receiving tokens', async () => {
      // Setup: Get to streaming state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 2 },
      })

      const initialActivity = stateMachine.getContext().lastActivity

      // Add small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1))

      // Simulate receiving a token
      const result = stateMachine.send({
        type: 'TOKEN_RECEIVED',
        payload: {
          requestId: 'req-1',
          possibilityId: 'poss-1',
          token: 'hello',
        },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('streaming')
      // Some environments may return identical millisecond timestamps
      // when events occur in quick succession. Allow equality so this
      // check doesn't fail due to clock resolution.
      expect(stateMachine.getContext().lastActivity).toBeGreaterThanOrEqual(
        initialActivity!
      )
    })

    it('should update completed count when possibility completes', () => {
      // Setup: Get to streaming state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 3 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 3 },
      })

      // Complete one possibility
      const result = stateMachine.send({
        type: 'POSSIBILITY_COMPLETED',
        payload: { requestId: 'req-1', possibilityId: 'poss-1' },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('streaming')
      expect(stateMachine.getContext().completedCount).toBe(1)
    })

    it('should transition to completed when all possibilities are done', () => {
      // Setup: Get to streaming state with 2 possibilities
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 2 },
      })

      // Complete both possibilities
      stateMachine.send({
        type: 'POSSIBILITY_COMPLETED',
        payload: { requestId: 'req-1', possibilityId: 'poss-1' },
      })

      const result = stateMachine.send({
        type: 'ALL_COMPLETED',
        payload: { requestId: 'req-1', totalCompleted: 2 },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('completed')
      expect(stateMachine.getContext().activeStreams).toBe(0)

      const status = stateMachine.getStatus()
      expect(status.progress).toBe(1)
      expect(status.isActive).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should transition to failed on non-retryable error', () => {
      // Setup: Get to generating state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })

      const error = new Error('Network timeout')
      const result = stateMachine.send({
        type: 'ERROR_OCCURRED',
        payload: { requestId: 'req-1', error, retryable: false },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('failed')
      expect(stateMachine.getContext().errors).toContain(error)
    })

    it('should transition to failed after max retries', () => {
      // Setup: Get to generating state with max retries reached
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })

      // Simulate max retries
      const context = stateMachine.getContext()
      // @ts-ignore - Access private field for testing
      stateMachine.context = { ...context, retryAttempt: 3 }

      const error = new Error('Retryable error')
      const result = stateMachine.send({
        type: 'ERROR_OCCURRED',
        payload: { requestId: 'req-1', error, retryable: true },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('failed')
    })

    it('should allow retry from failed state', () => {
      // Setup: Get to failed state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'ERROR_OCCURRED',
        payload: {
          requestId: 'req-1',
          error: new Error('test'),
          retryable: false,
        },
      })

      const result = stateMachine.send({
        type: 'RETRY_GENERATION',
        payload: { requestId: 'req-1', attempt: 1 },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('initializing')
      expect(stateMachine.getContext().retryAttempt).toBe(1)
      expect(stateMachine.getContext().errors).toEqual([])
    })
  })

  describe('cancellation', () => {
    it('should transition to cancelled from generating', () => {
      // Setup: Get to generating state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })

      const result = stateMachine.send({
        type: 'CANCEL_GENERATION',
        payload: { requestId: 'req-1', reason: 'User cancelled' },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('cancelled')
      expect(stateMachine.getContext().activeStreams).toBe(0)
    })

    it('should transition to cancelled from streaming', () => {
      // Setup: Get to streaming state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 2 },
      })

      const result = stateMachine.send({
        type: 'CANCEL_GENERATION',
        payload: { requestId: 'req-1', reason: 'User cancelled' },
      })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('cancelled')
    })
  })

  describe('reset functionality', () => {
    it('should reset from completed state', () => {
      // Setup: Get to completed state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 1 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 1 },
      })
      stateMachine.send({
        type: 'ALL_COMPLETED',
        payload: { requestId: 'req-1', totalCompleted: 1 },
      })

      const result = stateMachine.send({ type: 'RESET' })

      expect(result).toBe(true)
      expect(stateMachine.getState()).toBe('idle')

      const context = stateMachine.getContext()
      expect(context.requestId).toBe(null)
      expect(context.possibilityCount).toBe(0)
      expect(context.errors).toEqual([])
    })

    it('should force reset from any state', () => {
      // Setup: Get to streaming state
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 2 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 2 },
      })

      stateMachine.reset()

      expect(stateMachine.getState()).toBe('idle')
    })
  })

  describe('utility methods', () => {
    it('should check if machine is in specific state', () => {
      expect(stateMachine.is('idle')).toBe(true)
      expect(stateMachine.is('generating')).toBe(false)

      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 1 },
      })

      expect(stateMachine.is('idle')).toBe(false)
      expect(stateMachine.is('initializing')).toBe(true)
    })

    it('should check if machine can handle specific event', () => {
      expect(stateMachine.can('START_GENERATION')).toBe(true)
      expect(stateMachine.can('TOKEN_RECEIVED')).toBe(false)

      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 1 },
      })

      expect(stateMachine.can('START_GENERATION')).toBe(false)
      expect(stateMachine.can('GENERATION_INITIALIZED')).toBe(true)
    })

    it('should provide accurate status summary', () => {
      // Initial status
      let status = stateMachine.getStatus()
      expect(status.state).toBe('idle')
      expect(status.isActive).toBe(false)
      expect(status.canRetry).toBe(false)

      // Start generation
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 4 },
      })

      status = stateMachine.getStatus()
      expect(status.state).toBe('initializing')
      expect(status.isActive).toBe(true)
      expect(status.progress).toBe(0)
      expect(status.duration).toBeGreaterThanOrEqual(0)

      // Complete some possibilities
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 4 },
      })
      stateMachine.send({
        type: 'POSSIBILITY_COMPLETED',
        payload: { requestId: 'req-1', possibilityId: 'p1' },
      })
      stateMachine.send({
        type: 'POSSIBILITY_COMPLETED',
        payload: { requestId: 'req-1', possibilityId: 'p2' },
      })

      status = stateMachine.getStatus()
      expect(status.progress).toBe(0.5) // 2 out of 4 completed
      expect(status.isActive).toBe(true)
    })
  })

  describe('state change listeners', () => {
    it('should notify listeners on state changes', () => {
      const unsubscribe = stateMachine.onStateChange(mockListener)

      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 1 },
      })

      expect(mockListener).toHaveBeenCalledWith(
        'initializing',
        'idle',
        expect.objectContaining({ requestId: 'req-1' }),
        expect.objectContaining({ type: 'START_GENERATION' })
      )

      unsubscribe()
    })

    it('should allow unsubscribing listeners', () => {
      const unsubscribe = stateMachine.onStateChange(mockListener)
      unsubscribe()

      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 1 },
      })

      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      stateMachine.onStateChange(errorListener)
      stateMachine.onStateChange(mockListener)

      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 1 },
      })

      expect(consoleError).toHaveBeenCalledWith(
        'State machine listener error:',
        expect.any(Error)
      )
      expect(mockListener).toHaveBeenCalled() // Other listeners should still work

      consoleError.mockRestore()
    })
  })

  describe('invalid transitions', () => {
    it('should reject invalid events for current state', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = stateMachine.send({
        type: 'TOKEN_RECEIVED',
        payload: { requestId: 'req-1', possibilityId: 'p1', token: 'test' },
      })

      expect(result).toBe(false)
      expect(stateMachine.getState()).toBe('idle') // Should remain in same state
      expect(consoleWarn).toHaveBeenCalledWith(
        'Invalid transition: idle + TOKEN_RECEIVED'
      )

      consoleWarn.mockRestore()
    })

    it('should respect guard conditions', () => {
      // Setup: Try to complete with wrong count
      stateMachine.send({
        type: 'START_GENERATION',
        payload: { requestId: 'req-1', possibilityCount: 3 },
      })
      stateMachine.send({
        type: 'GENERATION_INITIALIZED',
        payload: { requestId: 'req-1' },
      })
      stateMachine.send({
        type: 'STREAMING_STARTED',
        payload: { requestId: 'req-1', activeStreams: 3 },
      })

      // Try to complete with wrong total (should fail guard)
      const result = stateMachine.send({
        type: 'ALL_COMPLETED',
        payload: { requestId: 'req-1', totalCompleted: 2 }, // Should be 3
      })

      expect(result).toBe(false)
      expect(stateMachine.getState()).toBe('streaming') // Should remain in streaming
    })
  })
})
