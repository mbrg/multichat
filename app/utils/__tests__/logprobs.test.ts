import { describe, it, expect } from 'vitest'
import {
  calculateProbabilityFromLogprobs,
  hasLogprobSupport,
  formatProbabilityForDisplay,
  compareProbabilities,
} from '../logprobs'

describe('Logprob Utility Functions', () => {
  describe('calculateProbabilityFromLogprobs', () => {
    describe('Valid logprob data processing', () => {
      it('should calculate probability from single token logprob', () => {
        const logprobs = [{ token: 'hello', logprob: -0.1 }]
        const result = calculateProbabilityFromLogprobs(logprobs)

        expect(result).not.toBeNull()
        expect(result).toBeCloseTo(Math.exp(-0.1), 5)
        expect(result).toBeGreaterThan(0)
        expect(result).toBeLessThanOrEqual(1)
      })

      it('should calculate average probability from multiple tokens', () => {
        const logprobs = [
          { token: 'hello', logprob: -0.1 },
          { token: ' world', logprob: -0.3 },
          { token: '!', logprob: -0.2 },
        ]
        const result = calculateProbabilityFromLogprobs(logprobs)

        const expectedAvg = (-0.1 + -0.3 + -0.2) / 3 // -0.2
        const expectedProb = Math.exp(expectedAvg)

        expect(result).not.toBeNull()
        expect(result).toBeCloseTo(expectedProb, 5)
      })

      it('should handle high confidence responses (low negative logprobs)', () => {
        const logprobs = [
          { token: 'the', logprob: -0.01 },
          { token: ' answer', logprob: -0.02 },
        ]
        const result = calculateProbabilityFromLogprobs(logprobs)

        expect(result).not.toBeNull()
        expect(result).toBeGreaterThan(0.9) // High confidence
      })

      it('should handle low confidence responses (high negative logprobs)', () => {
        const logprobs = [
          { token: 'maybe', logprob: -2.5 },
          { token: ' perhaps', logprob: -3.0 },
        ]
        const result = calculateProbabilityFromLogprobs(logprobs)

        expect(result).not.toBeNull()
        expect(result).toBeLessThan(0.1) // Low confidence
      })

      it('should clamp extremely high probabilities to 0.99', () => {
        const logprobs = [{ token: 'certain', logprob: 5.0 }] // Unrealistically high
        const result = calculateProbabilityFromLogprobs(logprobs)

        expect(result).toBe(0.99)
      })

      it('should clamp extremely low probabilities to 0.01', () => {
        const logprobs = [{ token: 'unlikely', logprob: -10.0 }] // Very low
        const result = calculateProbabilityFromLogprobs(logprobs)

        expect(result).toBe(0.01)
      })
    })

    describe('Invalid or missing logprob data handling', () => {
      it('should return null for undefined logprobs', () => {
        const result = calculateProbabilityFromLogprobs(undefined)
        expect(result).toBeNull()
      })

      it('should return null for null logprobs', () => {
        const result = calculateProbabilityFromLogprobs(null)
        expect(result).toBeNull()
      })

      it('should return null for empty logprobs array', () => {
        const result = calculateProbabilityFromLogprobs([])
        expect(result).toBeNull()
      })

      it('should return null for logprobs with missing logprob values', () => {
        const logprobs = [
          { token: 'hello' }, // No logprob field
          { token: 'world', logprob: undefined },
          { token: '!', logprob: null },
        ] as unknown as import('../logprobs').LogProbData

        const result = calculateProbabilityFromLogprobs(logprobs)
        expect(result).toBeNull()
      })

      it('should return null for logprobs with invalid logprob types', () => {
        const logprobs = [
          { token: 'hello', logprob: 'invalid' },
          { token: 'world', logprob: NaN },
        ] as unknown as import('../logprobs').LogProbData

        const result = calculateProbabilityFromLogprobs(logprobs)
        expect(result).toBeNull()
      })

      it('should handle mixed valid/invalid logprobs', () => {
        const logprobs = [
          { token: 'valid', logprob: -0.2 },
          { token: 'invalid' }, // No logprob
          { token: 'also_valid', logprob: -0.3 },
        ] as unknown as import('../logprobs').LogProbData

        const result = calculateProbabilityFromLogprobs(logprobs)
        const expectedAvg = (-0.2 + -0.3) / 2 // Only valid ones

        expect(result).not.toBeNull()
        expect(result).toBeCloseTo(Math.exp(expectedAvg), 5)
      })
    })

    describe('Error handling and edge cases', () => {
      it('should handle malformed logprob objects gracefully', () => {
        const logprobs = [
          'not an object',
          null,
          { token: 'valid', logprob: -0.1 },
        ] as unknown as import('../logprobs').LogProbData

        const result = calculateProbabilityFromLogprobs(logprobs)
        expect(result).not.toBeNull()
        expect(result).toBeCloseTo(Math.exp(-0.1), 5)
      })

      it('should handle infinite logprob values', () => {
        const logprobs = [{ token: 'infinite', logprob: -Infinity }]

        const result = calculateProbabilityFromLogprobs(logprobs)
        expect(result).toBeNull() // Infinite values are treated as invalid
      })

      it('should not throw errors for unexpected data structures', () => {
        const malformedData = [
          { randomField: 'value' },
          { token: 'test', probability: 0.5 }, // Wrong field name
          { token: 'test', logprob: { nested: -0.1 } }, // Wrong type
        ] as unknown as import('../logprobs').LogProbData

        expect(() => {
          calculateProbabilityFromLogprobs(malformedData)
        }).not.toThrow()

        const result = calculateProbabilityFromLogprobs(malformedData)
        expect(result).toBeNull() // Should gracefully return null
      })
    })

    describe('Real-world provider data structures', () => {
      it('should handle OpenAI-style logprob structure', () => {
        const openaiLogprobs = [
          {
            token: 'Hello',
            logprob: -0.1,
            topLogprobs: [
              { token: 'Hello', logprob: -0.1 },
              { token: 'Hi', logprob: -0.5 },
            ],
          },
          {
            token: ' world',
            logprob: -0.2,
            topLogprobs: [
              { token: ' world', logprob: -0.2 },
              { token: ' there', logprob: -0.8 },
            ],
          },
        ]

        const result = calculateProbabilityFromLogprobs(openaiLogprobs)
        const expectedAvg = (-0.1 + -0.2) / 2

        expect(result).not.toBeNull()
        expect(result).toBeCloseTo(Math.exp(expectedAvg), 5)
      })

      it('should handle minimal logprob structure', () => {
        const minimalLogprobs = [{ token: 'test', logprob: -0.5 }]

        const result = calculateProbabilityFromLogprobs(minimalLogprobs)
        expect(result).not.toBeNull()
        expect(result).toBeCloseTo(Math.exp(-0.5), 5)
      })
    })
  })

  describe('hasLogprobSupport', () => {
    it('should return true for valid logprobs', () => {
      const logprobs = [{ token: 'test', logprob: -0.1 }]
      expect(hasLogprobSupport(logprobs)).toBe(true)
    })

    it('should return false for missing logprobs', () => {
      expect(hasLogprobSupport(undefined)).toBe(false)
      expect(hasLogprobSupport(null)).toBe(false)
      expect(hasLogprobSupport([])).toBe(false)
    })

    it('should return false for invalid logprobs', () => {
      const invalidLogprobs = [
        { token: 'test' },
      ] as unknown as import('../logprobs').LogProbData
      expect(hasLogprobSupport(invalidLogprobs)).toBe(false)
    })
  })

  describe('formatProbabilityForDisplay', () => {
    it('should format probability as percentage', () => {
      expect(formatProbabilityForDisplay(0.75)).toBe('75%')
      expect(formatProbabilityForDisplay(0.1)).toBe('10%')
      expect(formatProbabilityForDisplay(0.99)).toBe('99%')
      expect(formatProbabilityForDisplay(0.01)).toBe('1%')
    })

    it('should round to nearest percentage', () => {
      expect(formatProbabilityForDisplay(0.756)).toBe('76%')
      expect(formatProbabilityForDisplay(0.754)).toBe('75%')
    })

    it('should return N/A for null probability', () => {
      expect(formatProbabilityForDisplay(null)).toBe('N/A')
    })

    it('should handle edge cases', () => {
      expect(formatProbabilityForDisplay(0)).toBe('0%')
      expect(formatProbabilityForDisplay(1)).toBe('100%')
    })
  })

  describe('compareProbabilities', () => {
    it('should sort probabilities in descending order', () => {
      expect(compareProbabilities(0.8, 0.6)).toBeLessThan(0) // 0.8 comes before 0.6
      expect(compareProbabilities(0.3, 0.7)).toBeGreaterThan(0) // 0.3 comes after 0.7
      expect(compareProbabilities(0.5, 0.5)).toBe(0) // Equal values
    })

    it('should handle null values correctly', () => {
      expect(compareProbabilities(null, null)).toBe(0) // Both null are equal
      expect(compareProbabilities(null, 0.5)).toBeGreaterThan(0) // null comes after numbers
      expect(compareProbabilities(0.5, null)).toBeLessThan(0) // numbers come before null
    })

    it('should sort arrays correctly using compareProbabilities', () => {
      const probabilities = [null, 0.3, 0.8, null, 0.1, 0.9]
      const sorted = probabilities.sort(compareProbabilities)

      expect(sorted).toEqual([0.9, 0.8, 0.3, 0.1, null, null])
    })

    it('should handle edge probability values', () => {
      expect(compareProbabilities(0, 0.1)).toBeGreaterThan(0)
      expect(compareProbabilities(1, 0.9)).toBeLessThan(0)
      expect(compareProbabilities(0.001, 0.999)).toBeGreaterThan(0)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete workflow from logprobs to display', () => {
      const logprobs = [
        { token: 'The', logprob: -0.1 },
        { token: ' answer', logprob: -0.2 },
        { token: ' is', logprob: -0.15 },
      ]

      // Calculate probability
      const probability = calculateProbabilityFromLogprobs(logprobs)
      expect(probability).not.toBeNull()

      // Check support
      const hasSupport = hasLogprobSupport(logprobs)
      expect(hasSupport).toBe(true)

      // Format for display
      const formatted = formatProbabilityForDisplay(probability)
      expect(formatted).toMatch(/^\d+%$/)
    })

    it('should handle workflow with missing logprobs', () => {
      const logprobs = undefined

      // Calculate probability
      const probability = calculateProbabilityFromLogprobs(logprobs)
      expect(probability).toBeNull()

      // Check support
      const hasSupport = hasLogprobSupport(logprobs)
      expect(hasSupport).toBe(false)

      // Format for display
      const formatted = formatProbabilityForDisplay(probability)
      expect(formatted).toBe('N/A')
    })

    it('should maintain consistency across multiple calculations', () => {
      const sameLogprobs = [{ token: 'consistent', logprob: -0.3 }]

      const prob1 = calculateProbabilityFromLogprobs(sameLogprobs)
      const prob2 = calculateProbabilityFromLogprobs(sameLogprobs)

      expect(prob1).toBe(prob2)
      expect(prob1).toBeCloseTo(Math.exp(-0.3), 10)
    })
  })
})
