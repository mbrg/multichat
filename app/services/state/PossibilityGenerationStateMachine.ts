/**
 * Possibility Generation State Machine
 * 
 * Implements a finite state machine for AI possibility generation following Dave Farley's principles:
 * - Explicit state transitions prevent invalid states and race conditions
 * - Fast feedback loops with immediate state updates
 * - Comprehensive error handling with automatic recovery
 * - Highly testable with predictable state transitions
 */

export type PossibilityGenerationState = 
  | 'idle'
  | 'initializing'
  | 'generating'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type PossibilityGenerationEvent = 
  | { type: 'START_GENERATION'; payload: { requestId: string; possibilityCount: number } }
  | { type: 'GENERATION_INITIALIZED'; payload: { requestId: string } }
  | { type: 'STREAMING_STARTED'; payload: { requestId: string; activeStreams: number } }
  | { type: 'TOKEN_RECEIVED'; payload: { requestId: string; possibilityId: string; token: string } }
  | { type: 'POSSIBILITY_COMPLETED'; payload: { requestId: string; possibilityId: string } }
  | { type: 'ALL_COMPLETED'; payload: { requestId: string; totalCompleted: number } }
  | { type: 'ERROR_OCCURRED'; payload: { requestId: string; error: Error; retryable: boolean } }
  | { type: 'CANCEL_GENERATION'; payload: { requestId: string; reason: string } }
  | { type: 'RETRY_GENERATION'; payload: { requestId: string; attempt: number } }
  | { type: 'RESET'; payload?: undefined }

export interface PossibilityGenerationContext {
  requestId: string | null
  possibilityCount: number
  completedCount: number
  activeStreams: number
  errors: Error[]
  retryAttempt: number
  maxRetries: number
  startTime: number | null
  lastActivity: number | null
}

export interface StateTransition {
  from: PossibilityGenerationState
  to: PossibilityGenerationState
  event: PossibilityGenerationEvent['type']
  guard?: (context: PossibilityGenerationContext, event: PossibilityGenerationEvent) => boolean
  action?: (context: PossibilityGenerationContext, event: PossibilityGenerationEvent) => Partial<PossibilityGenerationContext>
}

export type StateChangeListener = (
  newState: PossibilityGenerationState,
  oldState: PossibilityGenerationState,
  context: PossibilityGenerationContext,
  event: PossibilityGenerationEvent
) => void

export class PossibilityGenerationStateMachine {
  private currentState: PossibilityGenerationState = 'idle'
  private context: PossibilityGenerationContext = this.createInitialContext()
  private listeners: StateChangeListener[] = []
  private transitions: StateTransition[] = []

  constructor() {
    this.initializeTransitions()
  }

  private createInitialContext(): PossibilityGenerationContext {
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

  private initializeTransitions(): void {
    this.transitions = [
      // Starting generation
      {
        from: 'idle',
        to: 'initializing',
        event: 'START_GENERATION',
        action: (context, event) => ({
          requestId: event.payload.requestId,
          possibilityCount: event.payload.possibilityCount,
          completedCount: 0,
          activeStreams: 0,
          errors: [],
          retryAttempt: 0,
          startTime: Date.now(),
          lastActivity: Date.now(),
        }),
      },

      // Initialization complete
      {
        from: 'initializing',
        to: 'generating',
        event: 'GENERATION_INITIALIZED',
        action: (context) => ({
          lastActivity: Date.now(),
        }),
      },

      // Streaming starts
      {
        from: 'generating',
        to: 'streaming',
        event: 'STREAMING_STARTED',
        action: (context, event) => ({
          activeStreams: event.payload.activeStreams,
          lastActivity: Date.now(),
        }),
      },

      // Token received during streaming
      {
        from: 'streaming',
        to: 'streaming',
        event: 'TOKEN_RECEIVED',
        action: (context) => ({
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
        guard: (context, event) => event.payload.totalCompleted === context.possibilityCount,
        action: (context, event) => ({
          completedCount: event.payload.totalCompleted,
          activeStreams: 0,
          lastActivity: Date.now(),
        }),
      },

      // Error handling
      {
        from: 'generating',
        to: 'failed',
        event: 'ERROR_OCCURRED',
        guard: (context, event) => !event.payload.retryable || context.retryAttempt >= context.maxRetries,
        action: (context, event) => ({
          errors: [...context.errors, event.payload.error],
          lastActivity: Date.now(),
        }),
      },

      {
        from: 'streaming',
        to: 'failed',
        event: 'ERROR_OCCURRED',
        guard: (context, event) => !event.payload.retryable || context.retryAttempt >= context.maxRetries,
        action: (context, event) => ({
          errors: [...context.errors, event.payload.error],
          lastActivity: Date.now(),
        }),
      },

      // Retry logic
      {
        from: 'generating',
        to: 'initializing',
        event: 'RETRY_GENERATION',
        guard: (context) => context.retryAttempt < context.maxRetries,
        action: (context, event) => ({
          retryAttempt: event.payload.attempt,
          errors: [], // Clear errors on retry
          lastActivity: Date.now(),
        }),
      },

      {
        from: 'failed',
        to: 'initializing',
        event: 'RETRY_GENERATION',
        guard: (context) => context.retryAttempt < context.maxRetries,
        action: (context, event) => ({
          retryAttempt: event.payload.attempt,
          errors: [], // Clear errors on retry
          lastActivity: Date.now(),
        }),
      },

      // Cancellation
      {
        from: 'generating',
        to: 'cancelled',
        event: 'CANCEL_GENERATION',
        action: (context) => ({
          activeStreams: 0,
          lastActivity: Date.now(),
        }),
      },

      {
        from: 'streaming',
        to: 'cancelled',
        event: 'CANCEL_GENERATION',
        action: (context) => ({
          activeStreams: 0,
          lastActivity: Date.now(),
        }),
      },

      // Reset from any state
      {
        from: 'completed',
        to: 'idle',
        event: 'RESET',
        action: () => this.createInitialContext(),
      },

      {
        from: 'failed',
        to: 'idle',
        event: 'RESET',
        action: () => this.createInitialContext(),
      },

      {
        from: 'cancelled',
        to: 'idle',
        event: 'RESET',
        action: () => this.createInitialContext(),
      },
    ]
  }

  /**
   * Send an event to the state machine
   */
  send(event: PossibilityGenerationEvent): boolean {
    const validTransitions = this.transitions.filter(
      t => t.from === this.currentState && t.event === event.type
    )

    for (const transition of validTransitions) {
      // Check guard condition if present
      if (transition.guard && !transition.guard(this.context, event)) {
        continue
      }

      const oldState = this.currentState
      const newState = transition.to

      // Apply action if present
      if (transition.action) {
        const contextUpdate = transition.action(this.context, event)
        this.context = { ...this.context, ...contextUpdate }
      }

      // Update state
      this.currentState = newState

      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(newState, oldState, this.context, event)
        } catch (error) {
          console.error('State machine listener error:', error)
        }
      })

      return true
    }

    // No valid transition found
    console.warn(`Invalid transition: ${this.currentState} + ${event.type}`)
    return false
  }

  /**
   * Get current state
   */
  getState(): PossibilityGenerationState {
    return this.currentState
  }

  /**
   * Get current context
   */
  getContext(): Readonly<PossibilityGenerationContext> {
    return { ...this.context }
  }

  /**
   * Check if machine is in a specific state
   */
  is(state: PossibilityGenerationState): boolean {
    return this.currentState === state
  }

  /**
   * Check if machine can handle a specific event
   */
  can(eventType: PossibilityGenerationEvent['type']): boolean {
    return this.transitions.some(
      t => t.from === this.currentState && t.event === eventType
    )
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get machine status summary
   */
  getStatus(): {
    state: PossibilityGenerationState
    progress: number
    duration: number | null
    isActive: boolean
    canRetry: boolean
    errorCount: number
  } {
    const now = Date.now()
    const isActive = ['initializing', 'generating', 'streaming'].includes(this.currentState)
    
    return {
      state: this.currentState,
      progress: this.context.possibilityCount > 0 
        ? this.context.completedCount / this.context.possibilityCount 
        : 0,
      duration: this.context.startTime ? now - this.context.startTime : null,
      isActive,
      canRetry: this.context.retryAttempt < this.context.maxRetries && 
               (this.currentState === 'failed' || this.context.errors.length > 0),
      errorCount: this.context.errors.length,
    }
  }

  /**
   * Force reset to idle state (use with caution)
   */
  reset(): void {
    this.send({ type: 'RESET' })
  }
}

export default PossibilityGenerationStateMachine