'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Gauge, AlertTriangle, Info } from "lucide-react"

interface SpeedLimits {
  x: number
  y: number
  z: number
  t: number
  g: number
  emergency: number
}

interface SpeedLimitsProps {
  speedLimits: SpeedLimits
  onSpeedLimitChange: (axis: keyof SpeedLimits, value: number) => void
  onResetToDefaults: () => void
  disabled?: boolean
}

const axisInfo = {
  x: { name: 'X-Axis', color: 'bg-red-500', description: 'Horizontal movement' },
  y: { name: 'Y-Axis', color: 'bg-green-500', description: 'Vertical movement' },
  z: { name: 'Z-Axis', color: 'bg-blue-500', description: 'Depth movement' },
  t: { name: 'T-Axis', color: 'bg-yellow-500', description: 'Rotation/Tool axis' },
  g: { name: 'G-Axis', color: 'bg-purple-500', description: 'Gripper/Auxiliary' }
}

const recommendedSpeeds = {
  precision: { min: 50, max: 200, description: 'High precision work' },
  normal: { min: 200, max: 800, description: 'Standard operations' },
  fast: { min: 800, max: 1500, description: 'High-speed movements' },
  maximum: { min: 1500, max: 3000, description: 'Maximum capability' }
}

export default function SpeedLimits({
  speedLimits,
  onSpeedLimitChange,
  onResetToDefaults,
  disabled = false
}: SpeedLimitsProps) {
  const handleSliderChange = (axis: keyof SpeedLimits, value: number[]) => {
    onSpeedLimitChange(axis, value[0])
  }

  const handleInputChange = (axis: keyof SpeedLimits, value: string) => {
    const numValue = parseInt(value) || 100
    const maxValue = axis === 'emergency' ? 1000 : 3000
    onSpeedLimitChange(axis, Math.max(100, Math.min(maxValue, numValue)))
  }

  const getSpeedCategory = (speed: number) => {
    if (speed <= 200) return { category: 'Precision', color: 'text-green-600' }
    if (speed <= 800) return { category: 'Normal', color: 'text-blue-600' }
    if (speed <= 1500) return { category: 'Fast', color: 'text-yellow-600' }
    return { category: 'Maximum', color: 'text-red-600' }
  }

  const getUtilizationPercentage = (current: number, max: number = 3000) => {
    return Math.round((current / max) * 100)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Individual Axis Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(speedLimits).filter(([key]) => key !== 'emergency').map(([axis, value]) => {
            const info = axisInfo[axis as keyof typeof axisInfo]
            const speedInfo = getSpeedCategory(value)
            const utilization = getUtilizationPercentage(value)
            
            return (
              <div key={axis} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${info.color}`} />
                    <div>
                      <Label className="text-sm font-medium">{info.name}</Label>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={speedInfo.color}>
                    {value} ({speedInfo.category})
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <Slider
                    value={[value]}
                    onValueChange={(val) => handleSliderChange(axis as keyof SpeedLimits, val)}
                    max={3000}
                    min={100}
                    step={50}
                    className="flex-1"
                    disabled={disabled}
                  />
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={value}
                      onChange={(e) => handleInputChange(axis as keyof SpeedLimits, e.target.value)}
                      min={100}
                      max={3000}
                      className="w-20"
                      disabled={disabled}
                    />
                    <div className="flex-1">
                      <Progress value={utilization} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-12">
                      {utilization}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Safety Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Emergency Speed Limit</Label>
                <Badge variant="destructive">{speedLimits.emergency}</Badge>
              </div>
              <div className="space-y-2">
                <Slider
                  value={[speedLimits.emergency]}
                  onValueChange={(val) => handleSliderChange('emergency', val)}
                  max={1000}
                  min={50}
                  step={25}
                  className="flex-1"
                  disabled={disabled}
                />
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={speedLimits.emergency}
                    onChange={(e) => handleInputChange('emergency', e.target.value)}
                    min={50}
                    max={1000}
                    className="w-20"
                    disabled={disabled}
                  />
                  <Progress value={getUtilizationPercentage(speedLimits.emergency, 1000)} className="h-2 flex-1" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum speed allowed during emergency conditions or safety mode
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Safety Guidelines</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>• Emergency limit should be ≤50% of normal speed</div>
                <div>• Test new limits at low speeds first</div>
                <div>• Consider mechanical constraints</div>
                <div>• Higher speeds = more wear on components</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Speed Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(recommendedSpeeds).map(([category, range]) => (
              <div key={category} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div>
                  <div className="text-sm font-medium capitalize">{category}</div>
                  <div className="text-xs text-muted-foreground">{range.description}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {range.min}-{range.max}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium text-green-700">Lowest Speed</div>
                <div className="text-green-600">
                  {Math.min(...Object.values(speedLimits).filter((_, i) => i < 5))}
                </div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="font-medium text-red-700">Highest Speed</div>
                <div className="text-red-600">
                  {Math.max(...Object.values(speedLimits).filter((_, i) => i < 5))}
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={onResetToDefaults}
              disabled={disabled}
              className="w-full text-xs"
            >
              Reset to Factory Defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}