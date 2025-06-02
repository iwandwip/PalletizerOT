'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Gauge } from "lucide-react"

interface GlobalSpeedControlProps {
  speed: number
  maxSpeed: number
  onSpeedChange: (speed: number) => void
  onApplyToAll: () => void
  disabled?: boolean
}

export default function GlobalSpeedControl({
  speed,
  maxSpeed,
  onSpeedChange,
  onApplyToAll,
  disabled = false
}: GlobalSpeedControlProps) {
  const percentage = Math.round((speed / maxSpeed) * 100)

  const getSpeedColor = () => {
    if (percentage <= 25) return 'text-green-600'
    if (percentage <= 50) return 'text-blue-600'
    if (percentage <= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 10
    onSpeedChange(Math.max(10, Math.min(maxSpeed, value)))
  }

  const quickPercentages = [25, 50, 75, 100]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Global Speed Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Speed</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {speed} / {maxSpeed}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Slider
              value={[speed]}
              onValueChange={(value) => onSpeedChange(value[0])}
              max={maxSpeed}
              min={10}
              step={10}
              className="w-full"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>{maxSpeed}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={speed}
              onChange={handleInputChange}
              min={10}
              max={maxSpeed}
              className="w-24"
              disabled={disabled}
            />
            <div className="flex-1">
              <Progress 
                value={percentage} 
                className="h-3"
              />
            </div>
            <span className={`text-sm font-bold ${getSpeedColor()}`}>
              {percentage}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickPercentages.map((percent) => {
            const value = Math.round((maxSpeed * percent) / 100)
            return (
              <Button
                key={percent}
                size="sm"
                variant={percentage === percent ? "default" : "outline"}
                onClick={() => onSpeedChange(value)}
                disabled={disabled}
                className="text-xs"
              >
                {percent}%
              </Button>
            )
          })}
        </div>

        <Button 
          onClick={onApplyToAll} 
          className="w-full" 
          size="lg"
          disabled={disabled}
        >
          <Zap className="w-4 h-4 mr-2" />
          Apply to All Axes
        </Button>

        <div className="grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground">
          <div>
            <div className="font-medium text-foreground">{Math.round(speed * 0.25)}</div>
            <div>Precision</div>
          </div>
          <div>
            <div className="font-medium text-foreground">{Math.round(speed * 0.6)}</div>
            <div>Normal</div>
          </div>
          <div>
            <div className="font-medium text-foreground">{speed}</div>
            <div>Maximum</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}