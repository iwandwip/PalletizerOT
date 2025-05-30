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

export function useDebugMonitor() {
  const [messages, setMessages] = useState<DebugMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const eventSourceRef = useRef<EventSource | null>(null)
  const messagesRef = useRef<DebugMessage[]>([])
  const maxMessages = 1000

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
          messagesRef.current = [...messagesRef.current, data].slice(-maxMessages)
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
  }, [paused])

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