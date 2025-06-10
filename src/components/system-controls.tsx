'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Pause, Square, Home, Upload, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { ExecutionStatus } from "@/lib/types"
import { api } from "@/lib/api"

interface SystemControlsProps {
  onCommand: (command: string) => void
  disabled?: boolean
  showUploadStatus?: boolean
  onExecute?: () => void
}

export default function SystemControls({ 
  onCommand, 
  disabled = false, 
  showUploadStatus = true,
  onExecute 
}: SystemControlsProps) {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [uploadReady, setUploadReady] = useState(false)

  useEffect(() => {
    checkUploadStatus()
  }, [])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (isPolling) {
      intervalId = setInterval(async () => {
        try {
          const status = await api.getExecutionStatus()
          setExecutionStatus(status)
          
          if (status.status === 'IDLE' || status.status === 'ERROR') {
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

  const checkUploadStatus = async () => {
    try {
      const status = await api.getUploadStatus()
      setUploadReady(status.hasCommands || false)
    } catch (error) {
      setUploadReady(false)
    }
  }

  const handleCommand = async (command: string) => {
    try {
      await onCommand(command)
      
      if (command === 'PLAY') {
        setIsPolling(true)
      } else if (['PAUSE', 'STOP', 'IDLE'].includes(command)) {
        setIsPolling(false)
        setExecutionStatus(null)
      }
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error)
    }
  }

  const handleExecute = () => {
    if (onExecute) {
      onExecute()
    } else {
      handleCommand('PLAY')
    }
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500'
      case 'PAUSED': return 'bg-yellow-500'
      case 'ERROR': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return <Play className="w-3 h-3" />
      case 'PAUSED': return <Pause className="w-3 h-3" />
      case 'ERROR': return <AlertCircle className="w-3 h-3" />
      default: return <Square className="w-3 h-3" />
    }
  }

  return (
    <div className="space-y-4">
      {showUploadStatus && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${uploadReady ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-sm font-medium">
              {uploadReady ? 'Commands Ready' : 'No Commands Uploaded'}
            </span>
          </div>
          {uploadReady && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready to Execute
            </Badge>
          )}
        </div>
      )}

      {executionStatus && executionStatus.status !== 'IDLE' && (
        <Alert>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(executionStatus.status)}`} />
            <span className="font-medium capitalize">{executionStatus.status.toLowerCase()}</span>
          </div>
          <AlertDescription className="mt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {executionStatus.current_line}/{executionStatus.total_lines}</span>
              <span>{executionStatus.progress}%</span>
            </div>
            <Progress value={executionStatus.progress} className="h-2" />
            {executionStatus.current_command && (
              <div className="text-xs font-mono bg-muted p-2 rounded">
                Current: {executionStatus.current_command}
              </div>
            )}
            {executionStatus.estimated_remaining && (
              <div className="text-xs text-muted-foreground">
                Estimated remaining: {formatTime(executionStatus.estimated_remaining)}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          size="lg"
          onClick={handleExecute}
          disabled={disabled || !uploadReady}
          className="h-12 md:h-10 text-white bg-green-600 hover:bg-green-700"
        >
          <Play className="w-4 h-4 mr-2" />
          {executionStatus?.status === 'PAUSED' ? 'RESUME' : 'PLAY'}
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleCommand('PAUSE')}
          disabled={disabled || !executionStatus || executionStatus.status !== 'RUNNING'}
          className="h-12 md:h-10 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
        >
          <Pause className="w-4 h-4 mr-2" />
          PAUSE
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleCommand('STOP')}
          disabled={disabled}
          className="h-12 md:h-10 border-red-500 text-red-600 hover:bg-red-50"
        >
          <Square className="w-4 h-4 mr-2" />
          STOP
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleCommand('ZERO')}
          disabled={disabled}
          className="h-12 md:h-10 border-blue-500 text-blue-600 hover:bg-blue-50"
        >
          <Home className="w-4 h-4 mr-2" />
          ZERO
        </Button>
      </div>

      {!uploadReady && (
        <Alert variant="destructive">
          <Upload className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">No commands uploaded</div>
            <div className="text-sm mt-1">
              Please compile and upload your script before executing commands.
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}