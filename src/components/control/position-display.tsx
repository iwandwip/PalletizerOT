'use client'

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, MapPin } from "lucide-react"

interface PositionDisplayProps {
  current: number
  target: number
  max?: number
  showProgress?: boolean
  compact?: boolean
}

export default function PositionDisplay({
  current,
  target,
  max = 2000,
  showProgress = false,
  compact = false
}: PositionDisplayProps) {
  const isAtTarget = current === target
  const difference = Math.abs(target - current)
  const direction = target > current ? 'forward' : target < current ? 'backward' : 'stationary'

  const getProgressValue = () => {
    if (max <= 0) return 0
    return Math.min(100, (Math.abs(current) / max) * 100)
  }

  const getPositionColor = () => {
    if (isAtTarget) return 'text-green-600'
    if (difference > 100) return 'text-red-600'
    return 'text-yellow-600'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-blue-600" />
          <span className="text-sm font-mono">{current}</span>
        </div>
        {!isAtTarget && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-orange-600" />
            <span className="text-sm font-mono">{target}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Current: {current}
          </Badge>
          
          {!isAtTarget && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Target: {target}
            </Badge>
          )}
        </div>

        <div className={`text-sm font-medium ${getPositionColor()}`}>
          {isAtTarget ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              At Target
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              {difference} steps {direction}
            </div>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Position</span>
            <span>{current} / {max}</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>
      )}
    </div>
  )
}