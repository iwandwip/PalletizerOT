import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from './api'
import type { SystemStatus, DebugMessage, TimeoutStats } from './api'

export function useRealtime() {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState<SystemStatus['status']>('IDLE')
  const [lastSeen, setLastSeen] = useState<number>(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 5
    const retryDelay = 2000

    const connect = () => {
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }

        const eventSource = api.createEventSource()
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          setConnected(true)
          setLastSeen(Date.now())
          retryCount = 0
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'status') {
              setStatus(data.value)
            }
            setLastSeen(Date.now())
          } catch (error) {
            console.error('Failed to parse SSE message:', error)
          }
        }

        eventSource.onerror = () => {
          setConnected(false)
          eventSource.close()
          
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(connect, retryDelay * retryCount)
          }
        }
      } catch (error) {
        console.error('Failed to create EventSource:', error)
        setConnected(false)
        
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(connect, retryDelay * retryCount)
        }
      }
    }

    connect()

    const checkConnection = setInterval(() => {
      const now = Date.now()
      if (now - lastSeen > 10000) {
        setConnected(false)
      }
    }, 5000)

    return () => {
      clearInterval(checkConnection)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [lastSeen])

  return { connected, status, lastSeen }
}

export function useDebugMonitor() {
  const [messages, setMessages] = useState<DebugMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const maxMessages = 1000

  useEffect(() => {
    if (paused) return

    const connect = () => {
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }

        const eventSource = api.createDebugEventSource()
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          setConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as DebugMessage
            setMessages(prev => {
              const updated = [...prev, message]
              return updated.slice(-maxMessages)
            })
          } catch (error) {
            console.error('Failed to parse debug message:', error)
          }
        }

        eventSource.onerror = () => {
          setConnected(false)
          eventSource.close()
        }
      } catch (error) {
        console.error('Failed to create debug EventSource:', error)
        setConnected(false)
      }
    }

    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [paused])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const togglePause = useCallback(() => {
    setPaused(prev => !prev)
  }, [])

  const exportMessages = useCallback(() => {
    const content = messages
      .map(msg => `[${new Date(msg.timestamp).toISOString()}] [${msg.level}] [${msg.source}] ${msg.message}`)
      .join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug_log_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages])

  return {
    messages,
    connected,
    paused,
    clearMessages,
    togglePause,
    exportMessages
  }
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const systemStatus = await api.getStatus()
      setStatus(systemStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return { status, loading, error, refetch: fetchStatus }
}

export function useTimeoutStats() {
  const [stats, setStats] = useState<TimeoutStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const timeoutStats = await api.getTimeoutStats()
      setStats(timeoutStats)
    } catch (error) {
      console.error('Failed to fetch timeout stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearStats = useCallback(async () => {
    try {
      await api.clearTimeoutStats()
      await fetchStats()
    } catch (error) {
      console.error('Failed to clear timeout stats:', error)
    }
  }, [fetchStats])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refetch: fetchStats, clearStats }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current()
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await asyncFunction()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}