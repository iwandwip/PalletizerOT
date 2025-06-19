import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from './api'
import { SystemStatus, TimeoutConfig, TimeoutStats, RealtimeEvent, CompilationResult, UploadResult, ExecutionStatus } from './types'
import ScriptCompiler from './compiler/ScriptCompiler'
import CommandUploader from './uploader/CommandUploader'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiCall()
      onSuccess?.(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, execute }
}

export function useScriptCompiler() {
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const compilerRef = useRef(new ScriptCompiler())

  const compile = useCallback(async (script: string) => {
    if (!script.trim()) {
      setCompilationResult(null)
      return null
    }

    setIsCompiling(true)
    try {
      const result = compilerRef.current.compile(script)
      setCompilationResult(result)
      return result
    } catch (error) {
      const errorResult: CompilationResult = {
        success: false,
        commands: [],
        errors: [`Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        functions: [],
        totalCommands: 0
      }
      setCompilationResult(errorResult)
      return errorResult
    } finally {
      setIsCompiling(false)
    }
  }, [])

  const reset = useCallback(() => {
    setCompilationResult(null)
  }, [])

  return {
    compilationResult,
    isCompiling,
    compile,
    reset
  }
}

export function useCommandUploader() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ stage: string; progress: number } | null>(null)
  const uploaderRef = useRef(new CommandUploader())

  const upload = useCallback(async (commands: string[] | string) => {
    setIsUploading(true)
    setUploadProgress({ stage: 'uploading', progress: 0 })

    try {
      const result = await uploaderRef.current.uploadCommands(
        commands,
        {
          onProgress: (progress) => setUploadProgress({
            stage: 'uploading',
            progress: progress.percentage
          })
        }
      )
      setUploadResult({
        success: true,
        data: {
          status: 'completed',
          lines: Array.isArray(commands) ? commands.length : commands.split('\n').length,
          size: typeof commands === 'string' ? commands.length.toString() : commands.join('\n').length.toString(),
          timestamp: Date.now()
        },
        uploadTime: 1000,
        size: typeof commands === 'string' ? commands.length : commands.join('\n').length
      })
      setUploadProgress({ stage: 'completed', progress: 100 })
      return result
    } catch (error) {
      setUploadProgress({ 
        stage: 'error', 
        progress: 0 
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [])

  const uploadCompiled = useCallback(async (compilationResult: CompilationResult) => {
    if (!compilationResult.success) {
      throw new Error('Cannot upload failed compilation')
    }
    return upload(compilationResult.commands)
  }, [upload])

  const reset = useCallback(() => {
    setUploadResult(null)
    setUploadProgress(null)
  }, [])

  return {
    uploadResult,
    isUploading,
    uploadProgress,
    upload,
    uploadCompiled,
    reset
  }
}

export function useBatchProcessing() {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const { execute } = useApi()

  const startPolling = useCallback(() => {
    setIsPolling(true)
  }, [])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
    setExecutionStatus(null)
  }, [])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (isPolling) {
      intervalId = setInterval(async () => {
        try {
          const status = await api.getStatus()
          setExecutionStatus({
            status: status.isRunning ? 'RUNNING' : 'IDLE',
            current_line: status.currentCommandIndex,
            total_lines: status.totalCommands,
            progress: status.totalCommands > 0 ? (status.currentCommandIndex / status.totalCommands) * 100 : 0,
            current_command: `Command ${status.currentCommandIndex}`,
            timestamp: Date.now()
          })
          
          if (!status.isRunning) {
            setIsPolling(false)
          }
        } catch (error) {
          console.error('Failed to get execution status:', error)
          setIsPolling(false)
        }
      }, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isPolling])

  const executeCommands = useCallback(async () => {
    await execute(() => api.start())
    startPolling()
  }, [execute, startPolling])

  const pauseExecution = useCallback(async () => {
    await execute(() => api.pause())
  }, [execute])

  const stopExecution = useCallback(async () => {
    await execute(() => api.stop())
    stopPolling()
  }, [execute, stopPolling])

  const clearCommands = useCallback(async () => {
    await execute(() => api.stop())
  }, [execute])

  return {
    executionStatus,
    isPolling,
    executeCommands,
    pauseExecution,
    stopExecution,
    clearCommands,
    startPolling,
    stopPolling
  }
}

export function useRealtime() {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectingRef = useRef(false)

  const connect = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }
    
    isConnectingRef.current = true

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('http://localhost:3006/api/events')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      isConnectingRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    eventSource.onmessage = (event) => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data)
        setLastEvent(data)
      } catch (err) {
        console.error('Error parsing SSE data:', err)
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      isConnectingRef.current = false
      eventSource.close()
      
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null
          connect()
        }, 5000)
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    isConnectingRef.current = false
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { connected, lastEvent, connect, disconnect }
}

export interface DebugMessage {
  timestamp: number
  level: string
  source: string
  message: string
}

export interface ParsedMessage extends DebugMessage {
  type?: 'progress' | 'sequence' | 'function' | 'motion' | 'sync' | 'parser' | 'performance'
  data?: {
    current?: number
    total?: number
    percentage?: number
    functionName?: string
    entering?: boolean
    commandCount?: number
    axis?: string
    position?: number
    speed?: number
    delay?: number
    syncType?: string
    parsingResults?: {
      functions?: Array<{ name: string; commands: number }>
      totalCommands?: number
    }
    performanceData?: {
      totalTime?: string
      commandsExecuted?: number
      successRate?: number
      avgCommandTime?: string
    }
  }
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

interface MessageDeduplication {
  lastMessageKey: string
  lastMessageTime: number
  duplicateCount: number
  windowMs: number
}

export function useDebugMonitor() {
  const [messages, setMessages] = useState<ParsedMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [executionState, setExecutionState] = useState<ExecutionState>({
    isExecuting: false,
    totalCommands: 0,
    currentCommand: 0,
    currentFunction: '',
    functionStack: [],
    progress: 0,
    startTime: 0
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const messagesRef = useRef<ParsedMessage[]>([])
  const isConnectingRef = useRef(false)
  const maxMessages = 1000
  
  const deduplicationRef = useRef<MessageDeduplication>({
    lastMessageKey: '',
    lastMessageTime: 0,
    duplicateCount: 0,
    windowMs: 150
  })
  
  const executionTrackingRef = useRef({
    lastExecutionStarted: 0,
    lastProgressUpdate: 0,
    lastSequenceId: '',
    lastPerformanceReport: 0
  })

  const isDuplicateMessage = useCallback((msg: DebugMessage): boolean => {
    const currentTime = Date.now()
    const messageKey = `${msg.level}:${msg.source}:${msg.message}`
    const deduplicate = deduplicationRef.current
    
    if (messageKey === deduplicate.lastMessageKey && 
        (currentTime - deduplicate.lastMessageTime) < deduplicate.windowMs) {
      deduplicate.duplicateCount++
      return true
    }
    
    if (msg.message.includes('▶️ EXECUTION STARTED')) {
      if ((currentTime - executionTrackingRef.current.lastExecutionStarted) < 500) {
        return true
      }
      executionTrackingRef.current.lastExecutionStarted = currentTime
    }
    
    if (msg.message.includes('[████████████████████]')) {
      if ((currentTime - executionTrackingRef.current.lastProgressUpdate) < 300) {
        return true
      }
      executionTrackingRef.current.lastProgressUpdate = currentTime
    }
    
    if (msg.message.includes('🔄 [') && msg.message.includes('] Executing:')) {
      const sequenceMatch = msg.message.match(/🔄 \[(\d+)\/(\d+)\] Executing: (.+)/)
      if (sequenceMatch) {
        const sequenceId = `${sequenceMatch[1]}_${sequenceMatch[2]}_${sequenceMatch[3]}`
        if (sequenceId === executionTrackingRef.current.lastSequenceId) {
          return true
        }
        executionTrackingRef.current.lastSequenceId = sequenceId
      }
    }
    
    if (msg.message.includes('📊 Execution Summary:') || 
        msg.message.includes('════════════════════════════════════════')) {
      if ((currentTime - executionTrackingRef.current.lastPerformanceReport) < 1000) {
        return true
      }
      executionTrackingRef.current.lastPerformanceReport = currentTime
    }
    
    deduplicate.lastMessageKey = messageKey
    deduplicate.lastMessageTime = currentTime
    deduplicate.duplicateCount = 0
    
    return false
  }, [])

  const parseMessage = useCallback((msg: DebugMessage): ParsedMessage => {
    const parsed: ParsedMessage = { ...msg }
    
    if (msg.message.includes('▶️ EXECUTION STARTED')) {
      parsed.type = 'sequence'
      setExecutionState(prev => ({
        ...prev,
        isExecuting: true,
        startTime: Date.now(),
        currentCommand: 0,
        progress: 0
      }))
    }
    
    else if (msg.message.includes('Total Commands in Queue:')) {
      const match = msg.message.match(/Total Commands in Queue: (\d+)/)
      if (match) {
        const total = parseInt(match[1])
        setExecutionState(prev => ({ ...prev, totalCommands: total }))
      }
    }
    
    else if (msg.message.includes('🔄') && msg.message.match(/\[(\d+)\/(\d+)\]/)) {
      parsed.type = 'sequence'
      const match = msg.message.match(/\[(\d+)\/(\d+)\]/)
      if (match) {
        const current = parseInt(match[1])
        const total = parseInt(match[2])
        parsed.data = { current, total, percentage: Math.round((current / total) * 100) }
        setExecutionState(prev => ({
          ...prev,
          currentCommand: current,
          totalCommands: total,
          progress: (current / total) * 100
        }))
      }
    }
    
    else if (msg.message.includes('📊 Execution Summary:')) {
      parsed.type = 'performance'
      setExecutionState(prev => ({ ...prev, isExecuting: false }))
    }
    
    return parsed
  }, [])

  const connect = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }
    
    isConnectingRef.current = true

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/debug')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      isConnectingRef.current = false
    }

    eventSource.addEventListener('debug', (event) => {
      if (!paused) {
        try {
          const data: DebugMessage = JSON.parse(event.data)
          
          if (isDuplicateMessage(data)) {
            return
          }
          
          const parsed = parseMessage(data)
          messagesRef.current = [...messagesRef.current, parsed].slice(-maxMessages)
          setMessages([...messagesRef.current])
        } catch (err) {
          console.error('Error parsing debug data:', err)
        }
      }
    })

    eventSource.onerror = () => {
      setConnected(false)
      isConnectingRef.current = false
      setTimeout(() => connect(), 5000)
    }
  }, [paused, parseMessage, isDuplicateMessage])

  const disconnect = useCallback(() => {
    isConnectingRef.current = false
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setConnected(false)
  }, [])

  const clearMessages = useCallback(() => {
    messagesRef.current = []
    setMessages([])
    
    deduplicationRef.current = {
      lastMessageKey: '',
      lastMessageTime: 0,
      duplicateCount: 0,
      windowMs: 150
    }
    
    executionTrackingRef.current = {
      lastExecutionStarted: 0,
      lastProgressUpdate: 0,
      lastSequenceId: '',
      lastPerformanceReport: 0
    }
    
    setExecutionState({
      isExecuting: false,
      totalCommands: 0,
      currentCommand: 0,
      currentFunction: '',
      functionStack: [],
      progress: 0,
      startTime: 0
    })
    // Debug buffer cleared locally
  }, [])

  const togglePause = useCallback(() => {
    setPaused(prev => !prev)
  }, [])

  const exportMessages = useCallback(() => {
    const data = messages.map(msg => 
      `[${new Date(msg.timestamp).toLocaleTimeString()}] [${msg.level}] [${msg.source}] ${msg.message}`
    ).join('\n')
    
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug_log_${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages])

  const filteredMessages = messages.filter(msg => {
    if (levelFilter !== 'ALL' && msg.level !== levelFilter) return false
    if (filter && !msg.message.toLowerCase().includes(filter.toLowerCase()) && 
        !msg.source.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    messages: filteredMessages,
    connected,
    paused,
    filter,
    levelFilter,
    executionState,
    setFilter,
    setLevelFilter,
    clearMessages,
    togglePause,
    exportMessages
  }
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus>('IDLE')
  const { execute } = useApi()

  const fetchStatus = useCallback(async () => {
    await execute(
      () => api.getStatus(),
      (response) => setStatus(response.isRunning ? 'RUNNING' : 'IDLE')
    )
  }, [execute])

  const sendCommand = useCallback(async (command: string) => {
    switch (command) {
      case 'PLAY':
        await execute(() => api.start())
        break
      case 'PAUSE':
        await execute(() => api.pause())
        break
      case 'STOP':
        await execute(() => api.stop())
        break
      case 'RESUME':
        await execute(() => api.resume())
        break
      default:
        console.warn(`Unknown command: ${command}`)
    }
  }, [execute])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return { status, setStatus, fetchStatus, sendCommand }
}

export function useTimeoutConfig() {
  const [config, setConfig] = useState<TimeoutConfig>({
    maxWaitTime: 30000,
    strategy: 0,
    maxTimeoutWarning: 5,
    autoRetryCount: 0,
    saveToFile: true
  })
  // const { execute } = useApi() // Not needed since we mock the calls

  const loadConfig = useCallback(async () => {
    // Mock loading config - no API call needed
    console.log('Config loaded')
  }, [])

  const saveConfig = useCallback(async () => {
    // Mock saving config - no API call needed  
    console.log('Config saved')
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return { config, setConfig, loadConfig, saveConfig }
}

export function useTimeoutStats() {
  const [stats, setStats] = useState<TimeoutStats>({
    totalTimeouts: 0,
    successfulWaits: 0,
    lastTimeoutTime: 0,
    totalWaitTime: 0,
    currentRetryCount: 0,
    successRate: 100.0
  })
  // const { execute } = useApi() // Not needed since we mock the calls

  const loadStats = useCallback(async () => {
    // Mock loading stats - no API call needed
    console.log('Stats loaded')
  }, [])

  const clearStats = useCallback(async () => {
    setStats({
      totalTimeouts: 0,
      successfulWaits: 0,
      lastTimeoutTime: 0,
      totalWaitTime: 0,
      currentRetryCount: 0,
      successRate: 100.0
    })
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, loadStats, clearStats }
}