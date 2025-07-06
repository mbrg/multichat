/**
 * Possibility Generation State Machine - Refactored
 *
 * Simplified state machine following Dave Farley's principles:
 * - Single Responsibility Principle through focused modules
 * - Clear separation of concerns
 * - Simplified logic with utility functions
 * - Better testability through composition
 */

import {
  PossibilityGenerationState,
  PossibilityGenerationEvent,
  PossibilityGenerationContext,
  StateTransition,
  StateChangeListener,
  MachineStatus,
} from './types'
import { TransitionDefinitions } from './TransitionDefinitions'
import { StateUtils } from './StateUtils'

export class PossibilityGenerationStateMachine {
  private currentState: PossibilityGenerationState = 'idle'
  private context: PossibilityGenerationContext
  private listeners: StateChangeListener[] = []
  private transitions: StateTransition[]

  constructor() {
    this.context = TransitionDefinitions.createInitialContext()
    this.transitions = TransitionDefinitions.getTransitions()
  }

  /**
   * Send an event to the state machine
   */
  send(event: PossibilityGenerationEvent): boolean {
    if (!StateUtils.validateEventPayload(event)) {
      console.warn('Invalid event payload:', event)
      return false
    }

    const validTransition = this.findValidTransition(event)
    if (!validTransition) {
      console.warn(`Invalid transition: ${this.currentState} + ${event.type}`)
      return false
    }

    this.executeTransition(validTransition, event)
    return true
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
      (t) => t.from === this.currentState && t.event === eventType
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
  getStatus(): MachineStatus {
    return StateUtils.getStatus(this.currentState, this.context)
  }

  /**
   * Force reset to idle state
   */
  reset(): void {
    this.send({ type: 'RESET' })
  }

  /**
   * Find valid transition for event
   */
  private findValidTransition(
    event: PossibilityGenerationEvent
  ): StateTransition | null {
    const candidates = this.transitions.filter(
      (t) => t.from === this.currentState && t.event === event.type
    )

    for (const transition of candidates) {
      // Check guard condition if present
      if (!transition.guard || transition.guard(this.context, event)) {
        return transition
      }
    }

    return null
  }

  /**
   * Execute a state transition
   */
  private executeTransition(
    transition: StateTransition,
    event: PossibilityGenerationEvent
  ): void {
    const oldState = this.currentState
    const newState = transition.to

    // Apply action if present
    if (transition.action) {
      const contextUpdate = transition.action(this.context, event)
      this.context = { ...this.context, ...contextUpdate }
    }

    // Update state
    this.currentState = newState

    // Notify listeners safely
    this.notifyListeners(newState, oldState, event)
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(
    newState: PossibilityGenerationState,
    oldState: PossibilityGenerationState,
    event: PossibilityGenerationEvent
  ): void {
    this.listeners.forEach((listener) => {
      StateUtils.callListener(listener, newState, oldState, this.context, event)
    })
  }
}

export default PossibilityGenerationStateMachine

// Export all types for backward compatibility
export type {
  PossibilityGenerationState,
  PossibilityGenerationEvent,
  PossibilityGenerationContext,
  StateTransition,
  StateChangeListener,
  MachineStatus,
} from './types'
