/**
 * System Monitoring Types
 *
 * Centralized type definitions for system monitoring components
 */

export interface SystemHealthMetrics {
  timestamp: number
  overall: SystemHealthStatus
  components: {
    connectionPool: ComponentHealth
    circuitBreakers: ComponentHealth
    eventBus: ComponentHealth
    memory: ComponentHealth
    performance: ComponentHealth
  }
  alerts: SystemAlert[]
  recommendations: SystemRecommendation[]
}

export interface SystemHealthStatus {
  status: 'healthy' | 'warning' | 'critical'
  score: number // 0-100
  uptime: number
  lastIncident: number | null
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical'
  metrics: Record<string, number>
  lastCheck: number
  issues: string[]
}

export interface SystemAlert {
  id: string
  type: 'performance' | 'error' | 'capacity' | 'availability'
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string
  message: string
  timestamp: number
  resolved: boolean
  metadata: Record<string, unknown>
}

export interface SystemRecommendation {
  id: string
  category: 'performance' | 'reliability' | 'scalability' | 'security'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  action: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  timestamp: number
}

export interface MonitoringConfig {
  checkInterval: number // How often to check health (ms)
  alertThresholds: {
    errorRate: number // Error rate threshold (0-1)
    responseTime: number // Response time threshold (ms)
    memoryUsage: number // Memory usage threshold (0-1)
    cpuUsage: number // CPU usage threshold (0-1)
  }
  retentionPeriod: number // How long to keep metrics (ms)
  enabledChecks: string[] // Which health checks to run
}
