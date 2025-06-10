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

export interface CompilationResult {
  success: boolean
  commands: string[]
  errors: string[]
  functions: string[]
  totalCommands: number
}

export interface CompilationError {
  line: number
  message: string
  type: 'syntax' | 'semantic' | 'runtime'
}

export interface FunctionInfo {
  name: string
  commands: number
  startLine: number
  endLine: number
}

export interface UploadResult {
  success: boolean
  data: {
    status: string
    lines: number
    size: string
    timestamp: number
  }
  uploadTime: number
  size: number
}

export interface UploadProgress {
  stage: 'uploading' | 'completed' | 'error'
  progress: number
  message?: string
}

export interface ExecutionStatus {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR'
  current_line: number
  total_lines: number
  progress: number
  current_command: string
  timestamp: number
  estimated_remaining?: number
}

export interface CompilerSettings {
  validateSyntax: boolean
  showWarnings: boolean
  optimizeCommands: boolean
  generateComments: boolean
}

export interface UploadSettings {
  timeout: number
  retryCount: number
  chunkSize: number
  validateAfterUpload: boolean
}

export interface ExecutionMetrics {
  totalCommands: number
  completedCommands: number
  averageCommandTime: number
  totalExecutionTime: number
  errorCount: number
  successRate: number
}

export interface ScriptValidationResult {
  isValid: boolean
  errors: CompilationError[]
  warnings: CompilationError[]
  functions: FunctionInfo[]
  complexity: number
}

export interface BatchProcessingState {
  isCompiling: boolean
  isUploading: boolean
  isExecuting: boolean
  compilationResult: CompilationResult | null
  uploadResult: UploadResult | null
  executionStatus: ExecutionStatus | null
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
  batchProcessing: BatchProcessingState
}