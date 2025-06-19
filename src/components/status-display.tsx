'use client'

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Circle, CheckCircle, Clock } from "lucide-react"

interface StatusDisplayProps {
  esp32Connected: boolean
  hasScript: boolean
  isRunning: boolean
  currentCommandIndex: number
  totalCommands: number
}

export default function StatusDisplay({
  esp32Connected,
  hasScript,
  isRunning,
  currentCommandIndex,
  totalCommands
}: StatusDisplayProps) {

  const getSystemStatus = () => {
    if (!hasScript) return 'NO_SCRIPT'
    if (isRunning) return 'RUNNING'
    if (currentCommandIndex >= totalCommands && totalCommands > 0) return 'COMPLETED'
    return 'READY'
  }

  const systemStatus = getSystemStatus()

  const getStatusVariant = () => {
    switch (systemStatus) {
      case 'RUNNING': return 'default'
      case 'READY': return 'secondary'
      case 'COMPLETED': return 'outline'
      case 'NO_SCRIPT': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'RUNNING': return 'text-green-600'
      case 'READY': return 'text-blue-600'
      case 'COMPLETED': return 'text-purple-600'
      case 'NO_SCRIPT': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getConnectionStatus = () => {
    if (esp32Connected) {
      return { icon: Wifi, color: 'text-green-500', text: 'ESP32 Connected' }
    } else {
      return { icon: WifiOff, color: 'text-red-500', text: 'ESP32 Disconnected' }
    }
  }

  const connectionStatus = getConnectionStatus()
  const ConnectionIcon = connectionStatus.icon

  const progress = totalCommands > 0 ? (currentCommandIndex / totalCommands) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <ConnectionIcon className={`w-4 h-4 ${connectionStatus.color}`} />
          <span className="text-sm font-medium">{connectionStatus.text}</span>
        </div>
        <Badge variant={getStatusVariant()}>
          <Circle className={`w-2 h-2 mr-1 fill-current ${getStatusColor()}`} />
          {systemStatus.replace('_', ' ')}
        </Badge>
      </div>

      {hasScript && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Script Progress</span>
            <div className="flex items-center gap-1">
              {systemStatus === 'RUNNING' && <Clock className="w-3 h-3 text-blue-500" />}
              {systemStatus === 'COMPLETED' && <CheckCircle className="w-3 h-3 text-green-500" />}
              <span className="text-xs font-mono">
                {currentCommandIndex}/{totalCommands}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>System Status:</span>
          <span className={getStatusColor()}>{systemStatus.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span>ESP32 Connection:</span>
          <span className={esp32Connected ? 'text-green-600' : 'text-red-600'}>
            {esp32Connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Script Loaded:</span>
          <span className={hasScript ? 'text-green-600' : 'text-red-600'}>
            {hasScript ? 'Yes' : 'No'}
          </span>
        </div>
        {hasScript && (
          <div className="flex justify-between">
            <span>Commands:</span>
            <span className="font-mono">{totalCommands} total</span>
          </div>
        )}
      </div>
    </div>
  )
}