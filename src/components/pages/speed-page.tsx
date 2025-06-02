'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Zap, Gauge, Bookmark, Settings2 } from "lucide-react"
import { api } from '@/lib/api'

interface Axis {
  id: string
  name: string
  speed: number
  maxSpeed: number
  color: string
}

interface SpeedPreset {
  name: string
  percentage: number
  value: number
}

interface SpeedPageProps {
  onError: (message: string, type?: 'error' | 'warning' | 'info') => void
}

export default function SpeedPage({ onError }: SpeedPageProps) {
  const [globalSpeed, setGlobalSpeed] = useState(200)
  const [globalMaxSpeed, setGlobalMaxSpeed] = useState(1000)
  const [axes, setAxes] = useState<Axis[]>([
    { id: 'x', name: 'X', speed: 200, maxSpeed: 1500, color: 'bg-red-500' },
    { id: 'y', name: 'Y', speed: 200, maxSpeed: 1200, color: 'bg-green-500' },
    { id: 'z', name: 'Z', speed: 200, maxSpeed: 1000, color: 'bg-blue-500' },
    { id: 't', name: 'T', speed: 200, maxSpeed: 800, color: 'bg-yellow-500' },
    { id: 'g', name: 'G', speed: 364, maxSpeed: 1000, color: 'bg-purple-500' },
  ])

  const [customPresets, setCustomPresets] = useState<SpeedPreset[]>([
    { name: 'Precision', percentage: 15, value: 150 },
    { name: 'Normal', percentage: 50, value: 500 },
    { name: 'Fast', percentage: 85, value: 850 },
  ])

  const defaultPresets = [
    { name: '25%', percentage: 25, value: globalMaxSpeed * 0.25 },
    { name: '50%', percentage: 50, value: globalMaxSpeed * 0.5 },
    { name: '75%', percentage: 75, value: globalMaxSpeed * 0.75 },
    { name: '100%', percentage: 100, value: globalMaxSpeed },
  ]

  const handleGlobalSpeedChange = (value: number[]) => {
    const newSpeed = value[0]
    setGlobalSpeed(newSpeed)
    
    setAxes(prev => prev.map(axis => 
      axis.id !== 'g' ? { ...axis, speed: newSpeed } : axis
    ))
  }

  const handleAxisSpeedChange = (axisId: string, value: number[]) => {
    const newSpeed = value[0]
    setAxes(prev => prev.map(axis => 
      axis.id === axisId ? { ...axis, speed: newSpeed } : axis
    ))
  }

  const handleSetAllSpeeds = async () => {
    try {
      await api.sendCommand(`SPEED;${globalSpeed}`)
      onError('Global speed applied to all axes', 'info')
    } catch (error) {
      onError('Failed to set global speed', 'error')
    }
  }

  const handleSetAxisSpeed = async (axisId: string) => {
    try {
      const axis = axes.find(a => a.id === axisId)
      if (axis) {
        await api.sendCommand(`SPEED;${axisId};${axis.speed}`)
        onError(`${axisId.toUpperCase()} axis speed set to ${axis.speed}`, 'info')
      }
    } catch (error) {
      onError(`Failed to set ${axisId.toUpperCase()} speed`, 'error')
    }
  }

  const applyPreset = (preset: SpeedPreset) => {
    setGlobalSpeed(preset.value)
    setAxes(prev => prev.map(axis => 
      axis.id !== 'g' ? { ...axis, speed: preset.value } : axis
    ))
    onError(`Applied ${preset.name} preset (${preset.percentage}%)`, 'info')
  }

  const createCustomPreset = () => {
    const name = prompt('Enter preset name:')
    if (name) {
      const percentage = Math.round((globalSpeed / globalMaxSpeed) * 100)
      const newPreset = { name, percentage, value: globalSpeed }
      setCustomPresets(prev => [...prev, newPreset])
      onError(`Custom preset "${name}" created`, 'info')
    }
  }

  const getSpeedPercentage = (speed: number, maxSpeed: number) => {
    return Math.round((speed / maxSpeed) * 100)
  }

  const getSpeedColor = (percentage: number) => {
    if (percentage <= 25) return 'text-green-600'
    if (percentage <= 50) return 'text-blue-600'
    if (percentage <= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <span className="text-2xl">⚡</span>
          Speed Control Center
        </h1>
        <p className="text-muted-foreground">Manage global and individual axis speeds</p>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Global Speed Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Speed</span>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {globalSpeed} / {globalMaxSpeed}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <Slider
                    value={[globalSpeed]}
                    onValueChange={handleGlobalSpeedChange}
                    max={globalMaxSpeed}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>{globalMaxSpeed}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={globalSpeed}
                    onChange={(e) => setGlobalSpeed(parseInt(e.target.value) || 10)}
                    min={10}
                    max={globalMaxSpeed}
                    className="w-24"
                  />
                  <div className="flex-1">
                    <Progress 
                      value={getSpeedPercentage(globalSpeed, globalMaxSpeed)} 
                      className="h-3"
                    />
                  </div>
                  <span className={`text-sm font-bold ${getSpeedColor(getSpeedPercentage(globalSpeed, globalMaxSpeed))}`}>
                    {getSpeedPercentage(globalSpeed, globalMaxSpeed)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {defaultPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset(preset)}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>

              <Button onClick={handleSetAllSpeeds} className="w-full" size="lg">
                <Zap className="w-4 h-4 mr-2" />
                Apply to All Axes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="mt-6">
          <div className="grid gap-4">
            {axes.map((axis) => (
              <Card key={axis.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 min-w-[100px]">
                      <div className={`w-4 h-4 rounded-full ${axis.color}`} />
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {axis.name}
                      </Badge>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {axis.speed} / {axis.maxSpeed}
                        </span>
                        <span className={`text-sm font-bold ${getSpeedColor(getSpeedPercentage(axis.speed, axis.maxSpeed))}`}>
                          {getSpeedPercentage(axis.speed, axis.maxSpeed)}%
                        </span>
                      </div>
                      <Slider
                        value={[axis.speed]}
                        onValueChange={(value) => handleAxisSpeedChange(axis.id, value)}
                        max={axis.maxSpeed}
                        min={10}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={axis.speed}
                        onChange={(e) => handleAxisSpeedChange(axis.id, [parseInt(e.target.value) || 10])}
                        min={10}
                        max={axis.maxSpeed}
                        className="w-20 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSetAxisSpeed(axis.id)}
                        className="px-3"
                      >
                        Set
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="presets" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Presets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {defaultPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => applyPreset(preset)}
                    className="w-full justify-between"
                  >
                    <span>{preset.name}</span>
                    <span className="text-muted-foreground">{Math.round(preset.value)}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Custom Presets
                  <Button size="sm" onClick={createCustomPreset}>
                    <Bookmark className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customPresets.map((preset, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => applyPreset(preset)}
                      className="flex-1 justify-start"
                    >
                      {preset.name}
                    </Button>
                    <div className="text-sm text-muted-foreground ml-2">
                      {preset.percentage}% ({preset.value})
                    </div>
                  </div>
                ))}
                {customPresets.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No custom presets yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}