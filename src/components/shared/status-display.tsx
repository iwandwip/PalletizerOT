'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Wifi, 
  WifiOff, 
  Circle, 
  Activity, 
  Clock, 
  Zap,
  Database,
  Cpu,
  HardDrive,
  Thermometer
} from "lucide-react"

interface SystemStatus {
  connection: {
    connected: boolean
    strength: number
    latency: number
    lastSeen: number
  }
  system: {
    status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR'
    uptime: number
    cpuUsage: number
    memoryUsage: number
    temperature: number
  }
  performance: {
    totalCommands: number
    successfulCommands: number
    averageExecutionTime: number
    errorRate: number
  }
}

interface StatusDisplayProps {
  status: SystemStatus
  onRefresh?: () => void
  compact?: boolean
  showPerformance?: boolean
  disabled?: boolean
}

export default function StatusDisplay({
  status,
  onRefresh,
  compact = false,
  showPerformance = true,
  disabled = false
}: StatusDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      if (autoRefresh && onRefresh) {
        onRefresh()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [autoRefresh, onRefresh])

  const getStatusColor = () => {
    switch (status.system.status) {
      case 'RUNNING': return 'text-green-600'
      case 'PAUSED': return 'text-yellow-600'
      case 'ERROR': return 'text-red-600'
      case 'STOPPING': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusVariant = () => {
    switch (status.system.status) {
      case 'RUNNING': return 'default'
      case 'PAUSED': return 'secondary'
      case 'ERROR': return 'destructive'
      default: return 'outline'
    }
  }

  const getConnectionStrengthIcon = () => {
    if (!status.connection.connected) return <WifiOff className="w-4 h-4 text-red-500" />
    if (status.connection.strength >= 80) return <Wifi className="w-4 h-4 text-green-500" />
    if (status.connection.strength >= 50) return <Wifi className="w-4 h-4 text-yellow-500" />
    return <Wifi className="w-4 h-4 text-red-500" />
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m ${seconds % 60}s`
  }

  const formatLatency = (ms: number) => {
    if (ms < 50) return { value: `${ms}ms`, color: 'text-green-600' }
    if (ms < 100) return { value: `${ms}ms`, color: 'text-yellow-600' }
    return { value: `${ms}ms`, color: 'text-red-600' }
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600'
    if (percentage >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUsageColor = (percentage: number) => {
    if (percentage <= 60) return 'text-green-600'
    if (percentage <= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const latencyInfo = formatLatency(status.connection.latency)
  const successRate = status.performance.totalCommands > 0 
    ? (status.performance.successfulCommands / status.performance.totalCommands) * 100 
    : 100

  if (compact) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Circle className={`w-3 h-3 fill-current ${getStatusColor()}`} />
                <Badge variant={getStatusVariant()} className="text-xs">
                  {status.system.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                {getConnectionStrengthIcon()}
                <span className="text-xs text-muted-foreground">
                  {status.connection.connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Circle className={`w-4 h-4 fill-current ${getStatusColor()}`} />
                <Badge variant={getStatusVariant()} className="font-medium">
                  {status.system.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {getConnectionStrengthIcon()}
                <span className="text-sm text-muted-foreground">
                  {status.connection.connected ? 'Connected' : 'Disconnected'}
                </span>
                {status.connection.connected && (
                  <Badge variant="outline" className="text-xs">
                    {status.connection.strength}%
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {currentTime.toLocaleTimeString()}
              </div>
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={disabled}
                  className="w-8 h-8 p-0"
                >
                  <Activity className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Uptime</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {formatUptime(status.system.uptime)}
              </div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Latency</span>
              </div>
              <div className={`text-lg font-bold ${latencyInfo.color}`}>
                {latencyInfo.value}
              </div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Cpu className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <div className={`text-lg font-bold ${getUsageColor(status.system.cpuUsage)}`}>
                {status.system.cpuUsage}%
              </div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Thermometer className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Temp</span>
              </div>
              <div className={`text-lg font-bold ${getUsageColor(status.system.temperature)}`}>
                {status.system.temperature}°C
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Resources</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="text-xs"
              >
                Auto: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </div>
            
            <div className="grid gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    Memory Usage
                  </span>
                  <span className={getUsageColor(status.system.memoryUsage)}>
                    {status.system.memoryUsage}%
                  </span>
                </div>
                <Progress value={status.system.memoryUsage} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Connection Quality
                  </span>
                  <span className={getUsageColor(100 - status.connection.strength)}>
                    {status.connection.strength}%
                  </span>
                </div>
                <Progress value={status.connection.strength} className="h-2" />
              </div>
            </div>
          </div>

          {showPerformance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {status.performance.totalCommands}
                </div>
                <div className="text-xs text-muted-foreground">Total Commands</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {status.performance.successfulCommands}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              
              <div className="text-center">
                <div className={`text-lg font-bold ${getPerformanceColor(successRate)}`}>
                  {successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {status.performance.averageExecutionTime}ms
                </div>
                <div className="text-xs text-muted-foreground">Avg Time</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}