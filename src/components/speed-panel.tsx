'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface Axis {
  id: string
  name: string
  speed: number
}

interface SpeedPanelProps {
  axes: Axis[]
  globalSpeed: number
  onGlobalSpeedChange: (speed: number) => void
  onAxisSpeedChange: (axisId: string, speed: number) => void
  onSetAllSpeeds: () => void
  onSetAxisSpeed: (axisId: string) => void
}

export default function SpeedPanel({
  axes,
  globalSpeed,
  onGlobalSpeedChange,
  onAxisSpeedChange,
  onSetAllSpeeds,
  onSetAxisSpeed
}: SpeedPanelProps) {
  const [activeTab, setActiveTab] = useState("global")

  const presetSpeeds = [
    { label: "25%", value: 250 },
    { label: "50%", value: 500 },
    { label: "75%", value: 750 },
    { label: "100%", value: 1000 }
  ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="global">Global Speed</TabsTrigger>
        <TabsTrigger value="individual">Individual</TabsTrigger>
      </TabsList>
      
      <TabsContent value="global" className="space-y-4 mt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Slider
              value={[globalSpeed]}
              onValueChange={(value) => onGlobalSpeedChange(value[0])}
              max={1000}
              min={10}
              step={10}
              className="flex-1"
            />
            <Input
              type="number"
              value={globalSpeed}
              onChange={(e) => onGlobalSpeedChange(parseInt(e.target.value) || 10)}
              min={10}
              max={1000}
              className="w-20"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {presetSpeeds.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant="outline"
                onClick={() => onGlobalSpeedChange(preset.value)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          <Button onClick={onSetAllSpeeds} className="w-full">
            Set All Axes
          </Button>
        </div>
      </TabsContent>
      
      <TabsContent value="individual" className="space-y-3 mt-4">
        {axes.map((axis) => (
          <div key={axis.id} className="flex items-center gap-3">
            <Badge variant="outline" className="w-8 text-center">
              {axis.name}
            </Badge>
            <Slider
              value={[axis.speed]}
              onValueChange={(value) => onAxisSpeedChange(axis.id, value[0])}
              max={1000}
              min={10}
              step={10}
              className="flex-1"
            />
            <Input
              type="number"
              value={axis.speed}
              onChange={(e) => onAxisSpeedChange(axis.id, parseInt(e.target.value) || 10)}
              min={10}
              max={1000}
              className="w-16 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetAxisSpeed(axis.id)}
              className="text-xs"
            >
              Set
            </Button>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  )
}