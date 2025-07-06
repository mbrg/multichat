/**
 * Transition Definitions
 *
 * Defines all state transitions for the possibility generation state machine
 * Separated for clarity and maintainability
 */

import { StateTransition, PossibilityGenerationContext } from './types'

export class TransitionDefinitions {
  /**
   * Create initial context
   */
  static createInitialContext(): PossibilityGenerationContext {
    return {
      requestId: null,
      possibilityCount: 0,
      completedCount: 0,
      activeStreams: 0,
      errors: [],
      retryAttempt: 0,
      maxRetries: 3,
      startTime: null,
      lastActivity: null,
    }
  }

  /**
   * Get all state transitions
   */
  static getTransitions(): StateTransition[] {
    return [
      // Starting generation
      {
        from: 'idle',
        to: 'initializing',
        event: 'START_GENERATION',
        action: (context, event) => {
          if (event.type === 'START_GENERATION' && event.payload) {
            return {
              requestId: event.payload.requestId,
              possibilityCount: event.payload.possibilityCount,
              completedCount: 0,
              activeStreams: 0,
              errors: [],
              retryAttempt: 0,
              startTime: Date.now(),
              lastActivity: Date.now(),
            }
          }
          return context
        },
      },

      // Initialization complete
      {
        from: 'initializing',
        to: 'generating',
        event: 'GENERATION_INITIALIZED',
        action: () => ({
          lastActivity: Date.now(),
        }),
      },

      // Streaming starts
      {
        from: 'generating',
        to: 'streaming',
        event: 'STREAMING_STARTED',
        action: (context, event) => {
          if (event.type === 'STREAMING_STARTED' && event.payload) {
            return {
              activeStreams: event.payload.activeStreams,
              lastActivity: Date.now(),
            }
          }
          return { lastActivity: Date.now() }
        },
      },

      // Token received during streaming
      {
        from: 'streaming',
        to: 'streaming',
        event: 'TOKEN_RECEIVED',
        action: () => ({
          lastActivity: Date.now(),
        }),
      },

      // Individual possibility completes
      {
        from: 'streaming',
        to: 'streaming',
        event: 'POSSIBILITY_COMPLETED',
        action: (context) => ({
          completedCount: context.completedCount + 1,
          lastActivity: Date.now(),
        }),
      },

      // All possibilities complete
      {
        from: 'streaming',
        to: 'completed',
        event: 'ALL_COMPLETED',
        guard: (context, event) => {
          if (event.type === 'ALL_COMPLETED' && event.payload) {
            return event.payload.totalCompleted === context.possibilityCount
          }
          return false
        },
        action: (context, event) => {
          if (event.type === 'ALL_COMPLETED' && event.payload) {
            return {
              completedCount: event.payload.totalCompleted,
              activeStreams: 0,
              lastActivity: Date.now(),
            }
          }
          return { lastActivity: Date.now() }
        },
      },

      ...TransitionDefinitions.getErrorTransitions(),
      ...TransitionDefinitions.getRetryTransitions(),
      ...TransitionDefinitions.getCancellationTransitions(),
      ...TransitionDefinitions.getResetTransitions(),
    ]
  }

  /**
   * Error handling transitions
   */
  private static getErrorTransitions(): StateTransition[] {
    const errorAction = (context: PossibilityGenerationContext, event: any) => {
      if (event.type === 'ERROR_OCCURRED' && event.payload?.error) {
        return {
          errors: [...context.errors, event.payload.error],
          lastActivity: Date.now(),
        }
      }
      return { lastActivity: Date.now() }
    }

    const errorGuard = (context: PossibilityGenerationContext, event: any) => {
      if (event.type === 'ERROR_OCCURRED' && event.payload) {
        return (
          !event.payload.retryable || context.retryAttempt >= context.maxRetries
        )
      }
      return true
    }

    return [
      {
        from: 'generating',
        to: 'failed',
        event: 'ERROR_OCCURRED',
        guard: errorGuard,
        action: errorAction,
      },
      {
        from: 'streaming',
        to: 'failed',
        event: 'ERROR_OCCURRED',
        guard: errorGuard,
        action: errorAction,
      },
    ]
  }

  /**
   * Retry logic transitions
   */
  private static getRetryTransitions(): StateTransition[] {
    const retryAction = (context: PossibilityGenerationContext, event: any) => {
      if (event.type === 'RETRY_GENERATION' && event.payload) {
        return {
          retryAttempt: event.payload.attempt,
          errors: [], // Clear errors on retry
          lastActivity: Date.now(),
        }
      }
      return { lastActivity: Date.now() }
    }

    const retryGuard = (context: PossibilityGenerationContext) =>
      context.retryAttempt < context.maxRetries

    return [
      {
        from: 'generating',
        to: 'initializing',
        event: 'RETRY_GENERATION',
        guard: retryGuard,
        action: retryAction,
      },
      {
        from: 'failed',
        to: 'initializing',
        event: 'RETRY_GENERATION',
        guard: retryGuard,
        action: retryAction,
      },
    ]
  }

  /**
   * Cancellation transitions
   */
  private static getCancellationTransitions(): StateTransition[] {
    const cancelAction = () => ({
      activeStreams: 0,
      lastActivity: Date.now(),
    })

    return [
      {
        from: 'generating',
        to: 'cancelled',
        event: 'CANCEL_GENERATION',
        action: cancelAction,
      },
      {
        from: 'streaming',
        to: 'cancelled',
        event: 'CANCEL_GENERATION',
        action: cancelAction,
      },
    ]
  }

  /**
   * Reset transitions
   */
  private static getResetTransitions(): StateTransition[] {
    const resetAction = () => TransitionDefinitions.createInitialContext()

    const states: Array<
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'initializing'
      | 'generating'
      | 'streaming'
    > = [
      'completed',
      'failed',
      'cancelled',
      'initializing',
      'generating',
      'streaming',
    ]

    return states.map((state) => ({
      from: state,
      to: 'idle' as const,
      event: 'RESET' as const,
      action: resetAction,
    }))
  }
}
