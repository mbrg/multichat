/**
 * State Machine Utils
 *
 * Utility functions for state machine operations
 */

import {
  PossibilityGenerationState,
  PossibilityGenerationContext,
  MachineStatus,
} from './types'

export class StateUtils {
  /**
   * Check if machine is in an active state
   */
  static isActiveState(state: PossibilityGenerationState): boolean {
    return ['initializing', 'generating', 'streaming'].includes(state)
  }

  /**
   * Check if machine is in a terminal state
   */
  static isTerminalState(state: PossibilityGenerationState): boolean {
    return ['completed', 'failed', 'cancelled'].includes(state)
  }

  /**
   * Calculate progress percentage
   */
  static calculateProgress(context: PossibilityGenerationContext): number {
    return context.possibilityCount > 0
      ? context.completedCount / context.possibilityCount
      : 0
  }

  /**
   * Calculate duration since start
   */
  static calculateDuration(
    context: PossibilityGenerationContext
  ): number | null {
    return context.startTime ? Date.now() - context.startTime : null
  }

  /**
   * Check if retry is possible
   */
  static canRetry(
    context: PossibilityGenerationContext,
    currentState: PossibilityGenerationState
  ): boolean {
    return (
      context.retryAttempt < context.maxRetries &&
      (currentState === 'failed' || context.errors.length > 0)
    )
  }

  /**
   * Get machine status summary
   */
  static getStatus(
    state: PossibilityGenerationState,
    context: PossibilityGenerationContext
  ): MachineStatus {
    return {
      state,
      progress: StateUtils.calculateProgress(context),
      duration: StateUtils.calculateDuration(context),
      isActive: StateUtils.isActiveState(state),
      canRetry: StateUtils.canRetry(context, state),
      errorCount: context.errors.length,
    }
  }

  /**
   * Validate transition event payload
   */
  static validateEventPayload(event: any): boolean {
    // Basic validation - extend as needed
    if (!event || typeof event !== 'object') {
      return false
    }

    if (!event.type || typeof event.type !== 'string') {
      return false
    }

    // Payload is optional for some events
    return true
  }

  /**
   * Safely call listener function
   */
  static callListener(listener: Function, ...args: any[]): void {
    try {
      listener(...args)
    } catch (error) {
      console.error('State machine listener error:', error)
    }
  }
}
