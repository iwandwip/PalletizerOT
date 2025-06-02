'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, Square, Home, Zap } from "lucide-react"
import ManualJog from './manual-jog'
import PositionDisplay from './position-display'

interface AxisControlProps {
  axis: {
    id: string
    name: string
    current: number
    target: number
    step: number
    moving: boolean
  }
  disabled?: boolean
  onStepChange: (step: number) => void
  onMove: (direction: 'left' | 'right') => void
  onHome: () => void
  onControl: (action: 'play' | 'pause' | 'stop') => void
}

export default function AxisControl({
  axis,
  disabled = false,
  onStepChange,
  onMove,
  onHome,
  onControl
}: AxisControlProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {axis.name}
            </Badge>
            <PositionDisplay current={axis.current} target={axis.target} />
          </div>
          {axis.moving && (
            <div className="flex items-center gap-1 text-blue-600">
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Moving</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <ManualJog
            step={axis.step}
            onStepChange={onStepChange}
            onMove={onMove}
            onHome={onHome}
            disabled={disabled || axis.moving}
          />

          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-muted flex items-center justify-center">
              <div className={`w-8 h-8 rounded-full ${
                axis.moving 
                  ? 'bg-blue-500 animate-pulse' 
                  : axis.current === axis.target 
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
              }`} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onControl('play')}
              disabled={disabled}
              className="w-8 h-8 p-0"
            >
              <Play className="w-3 h-3" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onControl('pause')}
              disabled={disabled}
              className="w-8 h-8 p-0"
            >
              <Pause className="w-3 h-3" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onControl('stop')}
              className="w-8 h-8 p-0"
            >
              <Square className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}