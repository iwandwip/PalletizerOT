'use client'

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Circle } from "lucide-react"

interface Position {
  X: number;
  Y: number;
  Z: number;
  T: number;
  G: number;
}

interface StatusDisplayProps {
  position: Position
  systemStatus: string
  esp32Connected: boolean
  queueLength: number
}

export default function StatusDisplay({
  position,
  systemStatus,
  esp32Connected,
  queueLength
}: StatusDisplayProps) {

  const getStatusVariant = () => {
    switch (systemStatus) {
      case 'RUNNING': return 'default'
      case 'PAUSED': return 'secondary'
      case 'IDLE':
      case 'READY': return 'outline'
      case 'ERROR': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'RUNNING': return 'text-green-600'
      case 'PAUSED': return 'text-yellow-600'
      case 'IDLE':
      case 'READY': return 'text-blue-600'
      case 'ERROR': return 'text-red-600'
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

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <ConnectionIcon className={`w-4 h-4 ${connectionStatus.color}`} />
          <span className="text-sm font-medium">{connectionStatus.text}</span>
        </div>
        <Badge variant={getStatusVariant()}>
          <Circle className={`w-2 h-2 mr-1 fill-current ${getStatusColor()}`} />
          {systemStatus}
        </Badge>
      </div>

      {/* Position Display */}
      <div className="grid grid-cols-5 gap-2">
        <div className="text-center p-2 bg-muted/30 rounded">
          <div className="text-xs text-muted-foreground">X</div>
          <div className="font-mono text-sm">{position.X}</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded">
          <div className="text-xs text-muted-foreground">Y</div>
          <div className="font-mono text-sm">{position.Y}</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded">
          <div className="text-xs text-muted-foreground">Z</div>
          <div className="font-mono text-sm">{position.Z}</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded">
          <div className="text-xs text-muted-foreground">T</div>
          <div className="font-mono text-sm">{position.T}</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded">
          <div className="text-xs text-muted-foreground">G</div>
          <div className="font-mono text-sm">{position.G}</div>
        </div>
      </div>

      {/* Queue Status */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">Commands in Queue</span>
        <Badge variant="outline" className="font-mono">
          {queueLength}
        </Badge>
      </div>

      {/* System Information */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>System Status:</span>
          <span className={getStatusColor()}>{systemStatus}</span>
        </div>
        <div className="flex justify-between">
          <span>ESP32 Connection:</span>
          <span className={esp32Connected ? 'text-green-600' : 'text-red-600'}>
            {esp32Connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Position:</span>
          <span className="font-mono">
            X{position.X} Y{position.Y} Z{position.Z} T{position.T} G{position.G}
          </span>
        </div>
      </div>
    </div>
  )
}