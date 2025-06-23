/**
 * Utility functions for processing log probabilities and calculating response probabilities
 * from AI model responses. Provides consistent probability calculation across all providers.
 */

// Type for log probability data that can come from various AI providers
export type LogProbData = Array<{
  token: string
  logprob: number
  [key: string]: unknown // Allow additional fields from different providers
}>

/**
 * Calculates the overall probability of a response from log probabilities.
 *
 * This function takes an array of token log probabilities and computes the
 * overall probability of the entire response by:
 * 1. Computing the average log probability across all tokens
 * 2. Converting to probability space using Math.exp()
 * 3. Clamping to a reasonable range to handle edge cases
 *
 * @param logprobs - Array of log probability objects from the AI model
 * @returns Probability value between 0.01 and 0.99, or null if logprobs unavailable
 */
export function calculateProbabilityFromLogprobs(
  logprobs: LogProbData | undefined | null
): number | null {
  // Return null if no logprobs available (honest representation)
  if (!logprobs || logprobs.length === 0) {
    return null
  }

  try {
    // Extract log probability values from the structured logprob data
    const logprobValues = logprobs
      .map((tokenLogprob) => {
        // Handle different possible structures of logprob data
        if (typeof tokenLogprob === 'object' && tokenLogprob !== null) {
          // Standard structure: { token: string, logprob: number, ... }
          if (
            'logprob' in tokenLogprob &&
            typeof tokenLogprob.logprob === 'number'
          ) {
            // Additional check for valid finite numbers (no NaN, Infinity)
            if (Number.isFinite(tokenLogprob.logprob)) {
              return tokenLogprob.logprob
            }
          }
        }

        // If we can't extract a valid logprob, treat as missing data
        return null
      })
      .filter((logprob): logprob is number => logprob !== null)

    // If we couldn't extract any valid logprobs, return null
    if (logprobValues.length === 0) {
      return null
    }

    // Calculate the average log probability across all tokens
    const totalLogprob = logprobValues.reduce(
      (sum, logprob) => sum + logprob,
      0
    )
    const avgLogprob = totalLogprob / logprobValues.length

    // Convert from log space to probability space
    const probability = Math.exp(avgLogprob)

    // Clamp to reasonable range to handle edge cases
    // Very low: 0.01 (1%), Very high: 0.99 (99%)
    return Math.max(0.01, Math.min(0.99, probability))
  } catch (error) {
    // If anything goes wrong in probability calculation, return null
    // This maintains honest representation rather than guessing
    console.warn('Error calculating probability from logprobs:', error)
    return null
  }
}

/**
 * Checks if a provider/model supports log probabilities based on response data.
 *
 * @param logprobs - Log probability data from the model response
 * @returns true if logprobs are available and usable, false otherwise
 */
export function hasLogprobSupport(
  logprobs: LogProbData | undefined | null
): boolean {
  return calculateProbabilityFromLogprobs(logprobs) !== null
}

/**
 * Formats a probability value for display in the UI.
 *
 * @param probability - Probability value between 0 and 1, or null
 * @returns Formatted percentage string or null indicator
 */
export function formatProbabilityForDisplay(
  probability: number | null
): string {
  if (probability === null) {
    return 'N/A'
  }

  return `${Math.round(probability * 100)}%`
}

/**
 * Compares two probability values for sorting, handling null values correctly.
 * Null values are treated as lowest priority (sorted to the end).
 *
 * @param a - First probability value
 * @param b - Second probability value
 * @returns Comparison result for Array.sort() (negative if a < b, positive if a > b, 0 if equal)
 */
export function compareProbabilities(
  a: number | null,
  b: number | null
): number {
  // Both null - equal
  if (a === null && b === null) return 0

  // a is null, b is not - a goes after b (positive)
  if (a === null) return 1

  // b is null, a is not - a goes before b (negative)
  if (b === null) return -1

  // Both are numbers - standard numeric comparison (descending)
  return b - a
}
