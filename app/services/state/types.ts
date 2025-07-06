/**
 * State Machine Types
 *
 * Core type definitions for the possibility generation state machine
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
  | {
      type: 'START_GENERATION'
      payload: { requestId: string; possibilityCount: number }
    }
  | { type: 'GENERATION_INITIALIZED'; payload: { requestId: string } }
  | {
      type: 'STREAMING_STARTED'
      payload: { requestId: string; activeStreams: number }
    }
  | {
      type: 'TOKEN_RECEIVED'
      payload: { requestId: string; possibilityId: string; token: string }
    }
  | {
      type: 'POSSIBILITY_COMPLETED'
      payload: { requestId: string; possibilityId: string }
    }
  | {
      type: 'ALL_COMPLETED'
      payload: { requestId: string; totalCompleted: number }
    }
  | {
      type: 'ERROR_OCCURRED'
      payload: { requestId: string; error: Error; retryable: boolean }
    }
  | {
      type: 'CANCEL_GENERATION'
      payload: { requestId: string; reason: string }
    }
  | {
      type: 'RETRY_GENERATION'
      payload: { requestId: string; attempt: number }
    }
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
  guard?: (
    context: PossibilityGenerationContext,
    event: PossibilityGenerationEvent
  ) => boolean
  action?: (
    context: PossibilityGenerationContext,
    event: PossibilityGenerationEvent
  ) => Partial<PossibilityGenerationContext>
}

export type StateChangeListener = (
  newState: PossibilityGenerationState,
  oldState: PossibilityGenerationState,
  context: PossibilityGenerationContext,
  event: PossibilityGenerationEvent
) => void

export interface MachineStatus {
  state: PossibilityGenerationState
  progress: number
  duration: number | null
  isActive: boolean
  canRetry: boolean
  errorCount: number
}
