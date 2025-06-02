'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface Axis {
  id: string
  name: string
  speed: number
  maxSpeed: number
  color: string
}

interface IndividualSpeedControlProps {
  axes: Axis[]
  onSpeedChange: (axisId: string, speed: number) => void
  onSetSpeed: (axisId: string) => void
  disabled?: boolean
}

export default function IndividualSpeedControl({
  axes,
  onSpeedChange,
  onSetSpeed,
  disabled = false
}: IndividualSpeedControlProps) {
  const getSpeedPercentage = (speed: number, maxSpeed: number) => {
    return Math.round((speed / maxSpeed) * 100)
  }

  const getSpeedColor = (percentage: number) => {
    if (percentage <= 25) return 'text-green-600'
    if (percentage <= 50) return 'text-blue-600'
    if (percentage <= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleInputChange = (axisId: string, value: string, maxSpeed: number) => {
    const numValue = parseInt(value) || 10
    onSpeedChange(axisId, Math.max(10, Math.min(maxSpeed, numValue)))
  }

  return (
    <div className="grid gap-4">
      {axes.map((axis) => {
        const percentage = getSpeedPercentage(axis.speed, axis.maxSpeed)
        
        return (
          <Card key={axis.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className={`w-4 h-4 rounded-full ${axis.color}`} />
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {axis.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Max: {axis.maxSpeed}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {axis.speed} / {axis.maxSpeed}
                    </span>
                    <span className={`text-sm font-bold ${getSpeedColor(percentage)}`}>
                      {percentage}%
                    </span>
                  </div>
                  
                  <Slider
                    value={[axis.speed]}
                    onValueChange={(value) => onSpeedChange(axis.id, value[0])}
                    max={axis.maxSpeed}
                    min={10}
                    step={10}
                    className="w-full"
                    disabled={disabled}
                  />
                  
                  <Progress value={percentage} className="h-2" />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={axis.speed}
                    onChange={(e) => handleInputChange(axis.id, e.target.value, axis.maxSpeed)}
                    min={10}
                    max={axis.maxSpeed}
                    className="w-20 text-sm"
                    disabled={disabled}
                  />
                  <Button
                    size="sm"
                    onClick={() => onSetSpeed(axis.id)}
                    className="px-3"
                    disabled={disabled}
                  >
                    Set
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Precision: {Math.round(axis.maxSpeed * 0.15)}</span>
                <span>Normal: {Math.round(axis.maxSpeed * 0.5)}</span>
                <span>Fast: {Math.round(axis.maxSpeed * 0.85)}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center py-4 text-muted-foreground">
            <div className="grid grid-cols-5 gap-4 text-sm">
              {axes.map((axis) => (
                <div key={axis.id} className="space-y-1">
                  <div className={`w-3 h-3 rounded-full ${axis.color} mx-auto`} />
                  <div className="font-medium">{axis.name}</div>
                  <div className="text-xs">{axis.speed}</div>
                  <div className="text-xs">
                    {getSpeedPercentage(axis.speed, axis.maxSpeed)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}