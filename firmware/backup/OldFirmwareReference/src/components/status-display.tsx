'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Wifi, WifiOff, Circle } from "lucide-react"
import { useState, useEffect } from "react"

interface TimeoutStats {
  totalTimeouts: number
  successfulWaits: number
  successRate: number
  lastTimeoutTime: number
  totalWaitTime: number
  currentRetryCount: number
}

interface StatusDisplayProps {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING'
  connected: boolean
  timeoutStats: TimeoutStats
  darkMode: boolean
  onToggleDarkMode: () => void
}

export default function StatusDisplay({
  status,
  connected,
  timeoutStats,
  darkMode,
  onToggleDarkMode
}: StatusDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const getStatusVariant = () => {
    switch (status) {
      case 'RUNNING': return 'default'
      case 'PAUSED': return 'secondary'
      case 'IDLE':
      case 'STOPPING': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'RUNNING': return 'text-green-600'
      case 'PAUSED': return 'text-yellow-600'
      case 'IDLE':
      case 'STOPPING': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return 'Never'
    return new Date(timestamp).toLocaleTimeString()
  }

  const getSuccessRateColor = () => {
    const rate = timeoutStats.successRate
    if (rate >= 95) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Circle className={`w-3 h-3 fill-current ${getStatusColor()}`} />
            <Badge variant={getStatusVariant()} className="font-medium">
              {status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {connected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm text-muted-foreground">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="text-center">
            <div className="font-medium text-green-600">{timeoutStats.successfulWaits}</div>
            <div className="text-muted-foreground">Success</div>
          </div>
          
          <div className="text-center">
            <div className="font-medium text-red-600">{timeoutStats.totalTimeouts}</div>
            <div className="text-muted-foreground">Timeouts</div>
          </div>
          
          <div className="text-center">
            <div className={`font-medium ${getSuccessRateColor()}`}>
              {timeoutStats.successRate.toFixed(1)}%
            </div>
            <div className="text-muted-foreground">Rate</div>
          </div>
          
          <div className="text-center">
            <div className="font-medium">
              {formatDuration(timeoutStats.totalWaitTime)}
            </div>
            <div className="text-muted-foreground">Total</div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDarkMode}
          className="p-2"
        >
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}