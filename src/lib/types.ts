export type SystemStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING'

export interface Axis {
  id: string
  name: string
  speed: number
}

export interface TimeoutConfig {
  maxWaitTime: number
  strategy: number
  maxTimeoutWarning: number
  autoRetryCount: number
  saveToFile: boolean
}

export interface TimeoutStats {
  totalTimeouts: number
  successfulWaits: number
  lastTimeoutTime: number
  totalWaitTime: number
  currentRetryCount: number
  successRate: number
}

export interface ApiResponse {
  success: boolean
  message: string
  data?: any
}

export interface StatusResponse {
  status: SystemStatus
}

export interface RealtimeEvent {
  type: 'status' | 'timeout' | 'message'
  value?: string
  count?: number
  eventType?: string
  time?: number
}

export interface AppState {
  status: SystemStatus
  axes: Axis[]
  globalSpeed: number
  commandText: string
  timeoutConfig: TimeoutConfig
  timeoutStats: TimeoutStats
  connected: boolean
  darkMode: boolean
}