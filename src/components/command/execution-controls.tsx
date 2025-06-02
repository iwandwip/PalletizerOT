'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Pause, 
  Square, 
  Home,
  RotateCcw,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface ExecutionControlsProps {
  onExecute: (command: 'PLAY' | 'PAUSE' | 'STOP' | 'ZERO') => Promise<void>
  isExecuting?: boolean
  executionProgress?: {
    current: number
    total: number
    currentFunction?: string
    elapsedTime?: number
  }
  disabled?: boolean
}

export default function ExecutionControls({
  onExecute,
  isExecuting = false,
  executionProgress,
  disabled = false
}: ExecutionControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  const [executionStats, setExecutionStats] = useState({
    totalExecutions: 0,
    successfulExecutions: 0,
    lastExecutionTime: null as number | null
  })

  const handleCommand = async (command: 'PLAY' | 'PAUSE' | 'STOP' | 'ZERO') => {
    setLoading(command)
    setLastCommand(command)
    
    try {
      await onExecute(command)
      
      if (command === 'PLAY') {
        setExecutionStats(prev => ({
          ...prev,
          totalExecutions: prev.totalExecutions + 1,
          successfulExecutions: prev.successfulExecutions + 1,
          lastExecutionTime: Date.now()
        }))
      }
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error)
    } finally {
      setLoading(null)
    }
  }

  const getProgressPercentage = () => {
    if (!executionProgress || executionProgress.total === 0) return 0
    return Math.round((executionProgress.current / executionProgress.total) * 100)
  }

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getExecutionStatus = () => {
    if (loading) return { status: 'processing', color: 'text-blue-600', icon: Activity }
    if (isExecuting) return { status: 'running', color: 'text-green-600', icon: Play }
    if (lastCommand === 'PAUSE') return { status: 'paused', color: 'text-yellow-600', icon: Pause }
    if (lastCommand === 'STOP') return { status: 'stopped', color: 'text-red-600', icon: Square }
    return { status: 'idle', color: 'text-gray-600', icon: CheckCircle2 }
  }

  const executionStatus = getExecutionStatus()
  const StatusIcon = executionStatus.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${executionStatus.color}`} />
            Execution Control
          </div>
          <Badge 
            variant={isExecuting ? "default" : "outline"} 
            className={isExecuting ? "animate-pulse" : ""}
          >
            {executionStatus.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleCommand('PLAY')}
            disabled={disabled || loading === 'PLAY' || isExecuting}
            className={`h-12 transition-all ${
              loading === 'PLAY'
                ? 'bg-green-700 text-white animate-pulse'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Play className="w-4 h-4 mr-2" />
            {loading === 'PLAY' ? 'STARTING...' : 'PLAY'}
          </Button>
          
          <Button
            onClick={() => handleCommand('PAUSE')}
            disabled={disabled || loading === 'PAUSE' || !isExecuting}
            variant="outline"
            className="h-12 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
          >
            <Pause className="w-4 h-4 mr-2" />
            {loading === 'PAUSE' ? 'PAUSING...' : 'PAUSE'}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleCommand('STOP')}
            disabled={disabled || loading === 'STOP'}
            variant="outline"
            className="h-12 border-red-500 text-red-600 hover:bg-red-50"
          >
            <Square className="w-4 h-4 mr-2" />
            {loading === 'STOP' ? 'STOPPING...' : 'STOP'}
          </Button>
          
          <Button
            onClick={() => handleCommand('ZERO')}
            disabled={disabled || loading === 'ZERO' || isExecuting}
            variant="outline"
            className="h-12 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Home className="w-4 h-4 mr-2" />
            {loading === 'ZERO' ? 'HOMING...' : 'ZERO'}
          </Button>
        </div>

        {isExecuting && executionProgress && (
          <div className="space-y-3 p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium">Script Executing</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {executionProgress.current}/{executionProgress.total}
              </Badge>
            </div>
            
            <Progress value={getProgressPercentage()} className="h-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{getProgressPercentage()}% Complete</span>
              {executionProgress.elapsedTime && (
                <span>{formatElapsedTime(executionProgress.elapsedTime)}</span>
              )}
            </div>
            
            {executionProgress.currentFunction && (
              <div className="text-xs">
                <span className="text-muted-foreground">Current function: </span>
                <span className="font-mono">{executionProgress.currentFunction}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground border-t pt-3">
          <div>
            <div className="font-medium text-foreground">{executionStats.totalExecutions}</div>
            <div>Total Runs</div>
          </div>
          <div>
            <div className="font-medium text-foreground">{executionStats.successfulExecutions}</div>
            <div>Successful</div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {executionStats.totalExecutions > 0 
                ? Math.round((executionStats.successfulExecutions / executionStats.totalExecutions) * 100)
                : 100
              }%
            </div>
            <div>Success Rate</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isExecuting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-xs text-muted-foreground">
              {isExecuting ? 'Active execution' : 'Ready to execute'}
            </span>
          </div>
          
          {executionStats.lastExecutionTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Last: {new Date(executionStats.lastExecutionTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExecutionStats({
              totalExecutions: 0,
              successfulExecutions: 0,
              lastExecutionTime: null
            })}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset Stats
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}