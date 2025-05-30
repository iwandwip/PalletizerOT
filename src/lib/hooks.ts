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

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = api.createEventSource()
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
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
      eventSource.close()
      
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    }
  }, [])

  const disconnect = useCallback(() => {
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
  const maxMessages = 1000

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
          progress: (current / total) * 100
        }))
      }
    }
    
    else if (msg.message.includes('└─ Entering function')) {
      parsed.type = 'function'
      const match = msg.message.match(/Entering function (\w+)(?:\s*\((\d+) commands\))?/)
      if (match) {
        parsed.data = {
          functionName: match[1],
          entering: true,
          commandCount: match[2] ? parseInt(match[2]) : 0
        }
        setExecutionState(prev => ({
          ...prev,
          currentFunction: match[1],
          functionStack: [...prev.functionStack, match[1]]
        }))
      }
    }
    
    else if (msg.message.includes('✅ Function') && msg.message.includes('completed')) {
      parsed.type = 'function'
      const match = msg.message.match(/Function (\w+) completed/)
      if (match) {
        parsed.data = { functionName: match[1], entering: false }
        setExecutionState(prev => ({
          ...prev,
          functionStack: prev.functionStack.filter(f => f !== match[1]),
          currentFunction: prev.functionStack[prev.functionStack.length - 2] || ''
        }))
      }
    }
    
    else if (msg.message.includes('🎯')) {
      parsed.type = 'motion'
      const singleAxisMatch = msg.message.match(/🎯\s*([XYZGT])\(([^)]+)\)/)
      const multiAxisMatch = msg.message.match(/Multi-axis movement \((\d+) axes\)/)
      
      if (singleAxisMatch) {
        const params = singleAxisMatch[2].split(',')
        parsed.data = {
          axis: singleAxisMatch[1],
          position: parseInt(params[0]),
          delay: params.find(p => p.startsWith('d')) ? parseInt(params.find(p => p.startsWith('d'))!.substring(1)) : undefined,
          speed: params.length > 2 || (params.length === 2 && !params[1].startsWith('d')) ? parseFloat(params[params.length - 1]) : undefined
        }
      } else if (multiAxisMatch) {
        parsed.data = { axis: 'MULTI', position: parseInt(multiAxisMatch[1]) }
      }
    }
    
    else if (msg.message.includes('SET(') || msg.message.includes('WAIT')) {
      parsed.type = 'sync'
      if (msg.message.includes('SET(')) {
        const match = msg.message.match(/SET\((\d)\)/)
        parsed.data = { syncType: match ? `SET(${match[1]})` : 'SET' }
      } else {
        parsed.data = { syncType: 'WAIT' }
      }
    }
    
    else if (msg.message.includes('📋 PARSING RESULTS:')) {
      parsed.type = 'parser'
    }
    
    else if (msg.message.includes('├─ Functions Found:')) {
      const match = msg.message.match(/Functions Found: (\d+)/)
      if (match && messagesRef.current.length > 0) {
        const lastParserMsg = messagesRef.current.filter(m => m.type === 'parser').pop()
        if (lastParserMsg) {
          if (!lastParserMsg.data) lastParserMsg.data = {}
          if (!lastParserMsg.data.parsingResults) lastParserMsg.data.parsingResults = {}
          lastParserMsg.data.parsingResults.functions = []
        }
      }
    }
    
    else if (msg.message.match(/│\s+[├└]─\s+(\w+)\s+\((\d+) commands\)/)) {
      const match = msg.message.match(/│\s+[├└]─\s+(\w+)\s+\((\d+) commands\)/)
      if (match && messagesRef.current.length > 0) {
        const lastParserMsg = messagesRef.current.filter(m => m.type === 'parser').pop()
        if (lastParserMsg?.data?.parsingResults?.functions) {
          lastParserMsg.data.parsingResults.functions.push({
            name: match[1],
            commands: parseInt(match[2])
          })
        }
      }
    }
    
    else if (msg.message.includes('└─ Total Commands:')) {
      const match = msg.message.match(/Total Commands: (\d+)/)
      if (match && messagesRef.current.length > 0) {
        const lastParserMsg = messagesRef.current.filter(m => m.type === 'parser').pop()
        if (lastParserMsg?.data?.parsingResults) {
          lastParserMsg.data.parsingResults.totalCommands = parseInt(match[1])
        }
      }
    }
    
    else if (msg.message.includes('[') && msg.message.includes(']') && msg.message.includes('░')) {
      parsed.type = 'progress'
      const match = msg.message.match(/\[([█░]+)\]\s*(\d+)\/(\d+)\s*\((\d+)%\)/)
      if (match) {
        parsed.data = {
          current: parseInt(match[2]),
          total: parseInt(match[3]),
          percentage: parseInt(match[4])
        }
      }
    }
    
    else if (msg.message.includes('📊 Execution Summary:')) {
      parsed.type = 'performance'
      setExecutionState(prev => ({ ...prev, isExecuting: false }))
    }
    
    else if (msg.message.includes('├─ Total Time:')) {
      const match = msg.message.match(/Total Time: (.+)/)
      if (match && messagesRef.current.length > 0) {
        const lastPerfMsg = messagesRef.current.filter(m => m.type === 'performance').pop()
        if (lastPerfMsg) {
          if (!lastPerfMsg.data) lastPerfMsg.data = {}
          if (!lastPerfMsg.data.performanceData) lastPerfMsg.data.performanceData = {}
          lastPerfMsg.data.performanceData.totalTime = match[1]
        }
      }
    }
    
    else if (msg.message.includes('├─ Commands:')) {
      const match = msg.message.match(/Commands: (\d+)\/\d+/)
      if (match && messagesRef.current.length > 0) {
        const lastPerfMsg = messagesRef.current.filter(m => m.type === 'performance').pop()
        if (lastPerfMsg?.data?.performanceData) {
          lastPerfMsg.data.performanceData.commandsExecuted = parseInt(match[1])
        }
      }
    }
    
    else if (msg.message.includes('├─ Success Rate:')) {
      const match = msg.message.match(/Success Rate: ([\d.]+)%/)
      if (match && messagesRef.current.length > 0) {
        const lastPerfMsg = messagesRef.current.filter(m => m.type === 'performance').pop()
        if (lastPerfMsg?.data?.performanceData) {
          lastPerfMsg.data.performanceData.successRate = parseFloat(match[1])
        }
      }
    }
    
    else if (msg.message.includes('└─ Avg Command Time:')) {
      const match = msg.message.match(/Avg Command Time: (.+)/)
      if (match && messagesRef.current.length > 0) {
        const lastPerfMsg = messagesRef.current.filter(m => m.type === 'performance').pop()
        if (lastPerfMsg?.data?.performanceData) {
          lastPerfMsg.data.performanceData.avgCommandTime = match[1]
        }
      }
    }
    
    return parsed
  }, [])

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/debug')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.addEventListener('debug', (event) => {
      if (!paused) {
        try {
          const data: DebugMessage = JSON.parse(event.data)
          const parsed = parseMessage(data)
          messagesRef.current = [...messagesRef.current, parsed].slice(-maxMessages)
          setMessages(messagesRef.current)
        } catch (err) {
          console.error('Error parsing debug data:', err)
        }
      }
    })

    eventSource.onerror = () => {
      setConnected(false)
      setTimeout(() => connect(), 5000)
    }
  }, [paused, parseMessage])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setConnected(false)
  }, [])

  const clearMessages = useCallback(() => {
    messagesRef.current = []
    setMessages([])
    setExecutionState({
      isExecuting: false,
      totalCommands: 0,
      currentCommand: 0,
      currentFunction: '',
      functionStack: [],
      progress: 0,
      startTime: 0
    })
    api.clearDebugBuffer()
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
    await execute(
      () => api.getTimeoutConfig(),
      (response) => setConfig(response)
    )
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
    await execute(
      () => api.getTimeoutStats(),
      (response) => setStats(response)
    )
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