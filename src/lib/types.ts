export interface AxisState {
  id: string
  name: string
  current: number
  target: number
  step: number
  moving: boolean
  speed: number
  maxSpeed: number
  color: string
}

export interface SpeedLimits {
  x: number
  y: number
  z: number
  t: number
  g: number
  emergency: number
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
  successRate: number
  averageWaitTime: number
  lastTimeoutTime: number
  currentRetryCount: number
  totalWaitTime: number
}

export interface SystemPreferences {
  autoSave: boolean
  darkMode: boolean
  debugAutoOpen: boolean
  soundNotifications: boolean
  language: string
  theme: string
  animationsEnabled: boolean
  compactMode: boolean
  autoRefresh: boolean
  refreshInterval: number
}

export interface SystemStatus {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR'
  uptime: number
  timestamp: number
  cpuUsage: number
  memoryUsage: number
  temperature: number
  connection: {
    connected: boolean
    strength: number
    latency: number
    lastSeen: number
  }
  performance: {
    totalCommands: number
    successfulCommands: number
    averageExecutionTime: number
    errorRate: number
  }
}

export interface DebugMessage {
  id: string
  timestamp: number
  level: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'
  source: string
  message: string
  type?: 'progress' | 'sequence' | 'function' | 'motion' | 'sync' | 'parser' | 'performance'
  data?: any
}

export interface ExecutionInfo {
  isExecuting: boolean
  totalCommands: number
  currentCommand: number
  currentFunction: string
  functionDepth: number
  executionStartTime: number
  progress: number
  elapsedTime: number
}

export interface ExecutionState {
  isExecuting: boolean
  totalCommands: number
  currentCommand: number
  currentFunction: string
  functionStack: string[]
  progress: number
  startTime: number
}

export interface ErrorNotification {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  timestamp: number
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  category?: string
}

export interface SpeedPreset {
  id: string
  name: string
  percentage: number
  value: number
  isDefault?: boolean
}

export interface ScriptTemplate {
  id: string
  name: string
  description: string
  content: string
  category: 'basic' | 'advanced' | 'automation' | 'functions'
}

export interface BackupData {
  speedLimits: SpeedLimits
  timeoutConfig: TimeoutConfig
  systemPrefs: SystemPreferences
  exportDate: string
  version: string
  deviceInfo?: {
    userAgent: string
    timestamp: number
  }
}

export interface BackupItem {
  name: string
  date: string
  size: string
  version: string
  type: 'manual' | 'auto'
}

export interface MotionCommand {
  axis: string
  position: number
  speed?: number
  delay?: number
  isDelayOnly?: boolean
}

export interface GroupCommand {
  commands: MotionCommand[]
  simultaneous: boolean
}

export interface ScriptFunction {
  name: string
  body: string
  commandCount: number
}

export interface ConnectionInfo {
  connected: boolean
  strength: number
  latency: number
  mode: 'AP' | 'STA'
  ssid: string
  ip: string
  lastSeen: number
}

export interface PerformanceMetrics {
  totalExecutions: number
  successfulExecutions: number
  averageExecutionTime: number
  successRate: number
  lastExecutionTime: number | null
  errorCount: number
}

export interface AxisConfiguration {
  id: string
  name: string
  maxSpeed: number
  acceleration: number
  homePosition: number
  limitSwitchPin: number
  enablePin: number
  directionPin: number
  stepPin: number
  invertDirection: boolean
  invertEnable: boolean
}

export interface SystemConfiguration {
  axes: AxisConfiguration[]
  speedLimits: SpeedLimits
  timeoutConfig: TimeoutConfig
  networkConfig: {
    mode: 'AP' | 'STA'
    ssid: string
    password: string
    staticIP?: string
  }
  hardwareConfig: {
    indicatorPin: number
    emergencyPin: number
    syncSetPin: number
    syncWaitPin: number
  }
}

export interface CommandQueueItem {
  id: string
  command: string
  timestamp: number
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: string
  error?: string
}

export interface ScriptAnalysis {
  totalLines: number
  totalCommands: number
  functionCount: number
  groupCommandCount: number
  estimatedExecutionTime: number
  syntaxErrors: string[]
  warnings: string[]
  complexity: 'low' | 'medium' | 'high'
}

export interface FileUploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  error?: string
}

export interface NetworkStatus {
  connected: boolean
  signalStrength: number
  ipAddress: string
  macAddress: string
  uptime: number
  dataTransferred: {
    sent: number
    received: number
  }
}

export interface AxisStatus {
  id: string
  position: number
  targetPosition: number
  speed: number
  moving: boolean
  homed: boolean
  limitSwitch: boolean
  enabled: boolean
  error?: string
}

export type SystemStateType = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR'
export type DebugLevelType = 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'
export type TimeoutStrategyType = 0 | 1 | 2 | 3
export type ThemeType = 'light' | 'dark' | 'auto'
export type LanguageType = 'en' | 'id' | 'zh' | 'ja' | 'ko'