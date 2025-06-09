import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from './api'
import { SystemStatus, TimeoutConfig, TimeoutStats, RealtimeEvent } from './types'

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

    try {
      const eventSource = new EventSource('/api/system/events')
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
    } catch (error) {
      setConnected(false)
      isConnectingRef.current = false
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
    const dedup = deduplicationRef.current
    
    if (messageKey === dedup.lastMessageKey && 
        (currentTime - dedup.lastMessageTime) < dedup.windowMs) {
      dedup.duplicateCount++
      return true
    }
    
    dedup.lastMessageKey = messageKey
    dedup.lastMessageTime = currentTime
    dedup.duplicateCount = 0
    
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

    try {
      const eventSource = new EventSource('/api/debug/stream')
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
    } catch (error) {
      setConnected(false)
      isConnectingRef.current = false
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

  const clearMessages = useCallback(async () => {
    messagesRef.current = []
    setMessages([])
    
    try {
      await api.clearDebugLogs()
    } catch (error) {
      console.error('Failed to clear debug logs:', error)
    }
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
      (response) => setStatus(response.status)
    )
  }, [execute])

  const sendCommand = useCallback(async (command: string) => {
    await execute(() => api.sendCommand(command))
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
  const { execute } = useApi()

  const loadConfig = useCallback(async () => {
    try {
      await execute(
        () => api.getTimeoutConfig(),
        (response) => setConfig(response)
      )
    } catch (error) {
      console.error('Failed to load timeout config:', error)
    }
  }, [execute])

  const saveConfig = useCallback(async () => {
    await execute(() => api.saveTimeoutConfig(config))
  }, [execute, config])

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
  const { execute } = useApi()

  const loadStats = useCallback(async () => {
    try {
      await execute(
        () => api.getTimeoutStats(),
        (response) => setStats(response)
      )
    } catch (error) {
      console.error('Failed to load timeout stats:', error)
    }
  }, [execute])

  const clearStats = useCallback(async () => {
    await execute(
      () => api.clearTimeoutStats(),
      () => loadStats()
    )
  }, [execute, loadStats])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, loadStats, clearStats }
}