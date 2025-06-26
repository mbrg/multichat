/**
 * Connection Pool Service
 *
 * Manages concurrent connections to prevent resource overload and optimize throughput.
 * Follows Dave Farley's principles: focused responsibility, testable, and explicit dependencies.
 */

export interface QueuedTask {
  id: string
  priority: 'high' | 'medium' | 'low'
  execute: () => Promise<void>
  onError?: (error: Error) => void
  abortController: AbortController
  resolve?: () => void
  reject?: (error: Error) => void
}

export interface ConnectionPoolMetrics {
  activeConnections: number
  queuedTasks: number
  completedTasks: number
  failedTasks: number
  averageExecutionTime: number
}

export class ConnectionPoolService {
  private static instance: ConnectionPoolService | null = null

  private readonly maxConcurrentConnections: number
  private activeConnections = 0
  private taskQueue: QueuedTask[] = []
  private completedTasks = 0
  private failedTasks = 0
  private executionTimes: number[] = []

  constructor(maxConnections: number = 6) {
    this.maxConcurrentConnections = maxConnections
  }

  /**
   * Singleton pattern for global connection management
   */
  static getInstance(maxConnections?: number): ConnectionPoolService {
    if (!this.instance) {
      this.instance = new ConnectionPoolService(maxConnections)
    }
    return this.instance
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    this.instance = null
  }

  /**
   * Add a task to the execution queue
   */
  async enqueue(
    task: Omit<QueuedTask, 'abortController' | 'resolve' | 'reject'>
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const abortController = new AbortController()
      const queuedTask: QueuedTask = {
        ...task,
        abortController,
        resolve,
        reject,
      }

      // Insert task based on priority
      this.insertByPriority(queuedTask)

      // Try to execute immediately if under connection limit
      this.processQueue()
    })
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    return {
      activeConnections: this.activeConnections,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      averageExecutionTime: this.calculateAverageExecutionTime(),
    }
  }

  /**
   * Abort all queued and active tasks
   */
  abortAll(): void {
    // Abort all queued tasks
    for (const task of this.taskQueue) {
      task.abortController.abort()
      if (task.reject) {
        task.reject(new Error('Task aborted'))
      }
    }
    this.taskQueue = []
  }

  /**
   * Abort specific task by ID
   */
  abortTask(taskId: string): boolean {
    const taskIndex = this.taskQueue.findIndex((task) => task.id === taskId)
    if (taskIndex !== -1) {
      const task = this.taskQueue[taskIndex]
      task.abortController.abort()
      if (task.reject) {
        task.reject(new Error('Task aborted'))
      }
      this.taskQueue.splice(taskIndex, 1)
      return true
    }
    return false
  }

  /**
   * Insert task into queue based on priority
   */
  private insertByPriority(task: QueuedTask): void {
    const priorityOrder = { high: 0, medium: 1, low: 2 }

    let insertIndex = this.taskQueue.length
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (
        priorityOrder[task.priority] < priorityOrder[this.taskQueue[i].priority]
      ) {
        insertIndex = i
        break
      }
    }

    this.taskQueue.splice(insertIndex, 0, task)
  }

  /**
   * Process the queue if connections are available
   */
  private processQueue(): void {
    while (
      this.activeConnections < this.maxConcurrentConnections &&
      this.taskQueue.length > 0
    ) {
      const task = this.taskQueue.shift()!
      this.executeTask(task)
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: QueuedTask): Promise<void> {
    this.activeConnections++
    const startTime = performance.now()

    try {
      await task.execute()
      this.completedTasks++
      if (task.resolve) {
        task.resolve()
      }
    } catch (error) {
      this.failedTasks++
      if (task.onError && error instanceof Error) {
        task.onError(error)
      }
      if (task.reject && error instanceof Error) {
        task.reject(error)
      }
    } finally {
      this.activeConnections--

      // Record execution time
      const executionTime = performance.now() - startTime
      this.executionTimes.push(executionTime)

      // Keep only last 100 execution times for rolling average
      if (this.executionTimes.length > 100) {
        this.executionTimes = this.executionTimes.slice(-100)
      }

      // Process next task in queue
      this.processQueue()
    }
  }

  /**
   * Calculate average execution time
   */
  private calculateAverageExecutionTime(): number {
    if (this.executionTimes.length === 0) return 0
    const sum = this.executionTimes.reduce((acc, time) => acc + time, 0)
    return sum / this.executionTimes.length
  }
}

/**
 * Default instance for convenience
 */
export const connectionPool = ConnectionPoolService.getInstance()
