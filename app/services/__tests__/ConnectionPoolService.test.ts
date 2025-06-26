import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConnectionPoolService } from '../ConnectionPoolService'

describe('ConnectionPoolService', () => {
  let poolService: ConnectionPoolService

  beforeEach(() => {
    ConnectionPoolService.reset()
    poolService = new ConnectionPoolService(2) // Small pool for testing
  })

  describe('task execution', () => {
    it('should execute tasks immediately when under connection limit', async () => {
      const executed: string[] = []

      await poolService.enqueue({
        id: 'task1',
        priority: 'medium',
        execute: async () => {
          executed.push('task1')
        },
      })

      expect(executed).toEqual(['task1'])
      expect(poolService.getMetrics().completedTasks).toBe(1)
    })

    it('should queue tasks when at connection limit', async () => {
      const executed: string[] = []
      const task1Promise = poolService.enqueue({
        id: 'task1',
        priority: 'medium',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          executed.push('task1')
        },
      })

      const task2Promise = poolService.enqueue({
        id: 'task2',
        priority: 'medium',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          executed.push('task2')
        },
      })

      // Third task should be queued
      const task3Promise = poolService.enqueue({
        id: 'task3',
        priority: 'medium',
        execute: async () => {
          executed.push('task3')
        },
      })

      // Wait for all tasks to complete
      await Promise.all([task1Promise, task2Promise, task3Promise])

      expect(executed).toHaveLength(3)
      expect(poolService.getMetrics().completedTasks).toBe(3)
    })

    it('should execute high priority tasks first', async () => {
      const executed: string[] = []

      // Fill the connection pool with slow tasks
      const longTask1Promise = poolService.enqueue({
        id: 'long1',
        priority: 'low',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          executed.push('long1')
        },
      })

      const longTask2Promise = poolService.enqueue({
        id: 'long2',
        priority: 'low',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          executed.push('long2')
        },
      })

      // Wait a bit to ensure the pool is full
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Queue tasks with different priorities - these should be queued
      const lowPriorityTask = poolService.enqueue({
        id: 'low',
        priority: 'low',
        execute: async () => {
          executed.push('low')
        },
      })

      const highPriorityTask = poolService.enqueue({
        id: 'high',
        priority: 'high',
        execute: async () => {
          executed.push('high')
        },
      })

      const mediumPriorityTask = poolService.enqueue({
        id: 'medium',
        priority: 'medium',
        execute: async () => {
          executed.push('medium')
        },
      })

      // Wait for all tasks to complete
      await Promise.all([
        longTask1Promise,
        longTask2Promise,
        lowPriorityTask,
        highPriorityTask,
        mediumPriorityTask,
      ])

      // Check that high priority executed before medium and low among the queued tasks
      const highIndex = executed.indexOf('high')
      const mediumIndex = executed.indexOf('medium')
      const lowIndex = executed.indexOf('low')

      expect(highIndex).toBeLessThan(mediumIndex)
      expect(mediumIndex).toBeLessThan(lowIndex)
    })
  })

  describe('error handling', () => {
    it('should handle task execution errors gracefully', async () => {
      const errorCallback = vi.fn()

      await expect(
        poolService.enqueue({
          id: 'failing-task',
          priority: 'medium',
          execute: async () => {
            throw new Error('Task failed')
          },
          onError: errorCallback,
        })
      ).rejects.toThrow('Task failed')

      expect(errorCallback).toHaveBeenCalledWith(expect.any(Error))
      expect(poolService.getMetrics().failedTasks).toBe(1)
      expect(poolService.getMetrics().completedTasks).toBe(0)
    })

    it('should continue processing other tasks after an error', async () => {
      const executed: string[] = []

      const failingTask = poolService
        .enqueue({
          id: 'failing',
          priority: 'high',
          execute: async () => {
            throw new Error('Task failed')
          },
        })
        .catch(() => {
          // Expected to fail, ignore the error
        })

      const successfulTask = poolService.enqueue({
        id: 'success',
        priority: 'medium',
        execute: async () => {
          executed.push('success')
        },
      })

      await Promise.all([failingTask, successfulTask])

      expect(executed).toEqual(['success'])
      expect(poolService.getMetrics().failedTasks).toBe(1)
      expect(poolService.getMetrics().completedTasks).toBe(1)
    })
  })

  describe('task management', () => {
    it('should abort specific tasks', async () => {
      const executed: string[] = []

      // Fill the connection pool to queue the task
      const longTask1 = poolService.enqueue({
        id: 'long1',
        priority: 'low',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          executed.push('long1')
        },
      })

      const longTask2 = poolService.enqueue({
        id: 'long2',
        priority: 'low',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          executed.push('long2')
        },
      })

      // This task will be queued
      const queuedTask = poolService
        .enqueue({
          id: 'queued',
          priority: 'medium',
          execute: async () => {
            executed.push('queued')
          },
        })
        .catch(() => {
          // Expected to be aborted, ignore the error
        })

      // Abort the queued task
      const aborted = poolService.abortTask('queued')
      expect(aborted).toBe(true)

      await Promise.all([longTask1, longTask2, queuedTask])

      expect(executed).toEqual(['long1', 'long2'])
      expect(executed).not.toContain('queued')
    })

    it('should abort all tasks', async () => {
      const executed: string[] = []

      // Fill the connection pool
      const longTask1 = poolService.enqueue({
        id: 'long1',
        priority: 'low',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          executed.push('long1')
        },
      })

      const longTask2 = poolService.enqueue({
        id: 'long2',
        priority: 'low',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          executed.push('long2')
        },
      })

      // Queue additional tasks
      const queuedTask1 = poolService
        .enqueue({
          id: 'queued1',
          priority: 'medium',
          execute: async () => {
            executed.push('queued1')
          },
        })
        .catch(() => {
          // Expected to be aborted, ignore the error
        })

      const queuedTask2 = poolService
        .enqueue({
          id: 'queued2',
          priority: 'high',
          execute: async () => {
            executed.push('queued2')
          },
        })
        .catch(() => {
          // Expected to be aborted, ignore the error
        })

      // Abort all queued tasks
      poolService.abortAll()

      await Promise.all([longTask1, longTask2, queuedTask1, queuedTask2])

      expect(executed).toEqual(['long1', 'long2'])
      expect(executed).not.toContain('queued1')
      expect(executed).not.toContain('queued2')
    })
  })

  describe('metrics', () => {
    it('should track execution metrics', async () => {
      const startTime = performance.now()

      await poolService.enqueue({
        id: 'task1',
        priority: 'medium',
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
        },
      })

      const metrics = poolService.getMetrics()
      expect(metrics.completedTasks).toBe(1)
      expect(metrics.failedTasks).toBe(0)
      expect(metrics.activeConnections).toBe(0)
      expect(metrics.queuedTasks).toBe(0)
      expect(metrics.averageExecutionTime).toBeGreaterThan(0)
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConnectionPoolService.getInstance()
      const instance2 = ConnectionPoolService.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should reset singleton', () => {
      const instance1 = ConnectionPoolService.getInstance()
      ConnectionPoolService.reset()
      const instance2 = ConnectionPoolService.getInstance()

      expect(instance1).not.toBe(instance2)
    })
  })
})
