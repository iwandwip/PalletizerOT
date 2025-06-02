'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Play, 
  Pause, 
  Square,
  AlertTriangle,
  Zap
} from "lucide-react"
import { api } from '@/lib/api'

interface AxisState {
  id: string
  name: string
  current: number
  target: number
  step: number
  moving: boolean
}

interface ControlPageProps {
  onError: (message: string, type?: 'error' | 'warning' | 'info') => void
}

export default function ControlPage({ onError }: ControlPageProps) {
  const [axes, setAxes] = useState<AxisState[]>([
    { id: 'x', name: 'X', current: 0, target: 0, step: 100, moving: false },
    { id: 'y', name: 'Y', current: 0, target: 0, step: 50, moving: false },
    { id: 'z', name: 'Z', current: 0, target: 0, step: 25, moving: false },
    { id: 't', name: 'T', current: 0, target: 0, step: 10, moving: false },
    { id: 'g', name: 'G', current: 0, target: 0, step: 5, moving: false },
  ])

  const [emergencyStop, setEmergencyStop] = useState(false)

  const updateAxisStep = (axisId: string, step: number) => {
    setAxes(prev => prev.map(axis => 
      axis.id === axisId ? { ...axis, step } : axis
    ))
  }

  const moveAxis = async (axisId: string, direction: 'left' | 'right') => {
    const axis = axes.find(a => a.id === axisId)
    if (!axis) return

    const step = direction === 'right' ? axis.step : -axis.step
    const newTarget = axis.current + step

    try {
      setAxes(prev => prev.map(a => 
        a.id === axisId ? { ...a, moving: true, target: newTarget } : a
      ))

      await api.sendCommand(`${axisId.toUpperCase()};1;${newTarget}`)
      onError(`${axisId.toUpperCase()} axis moving to ${newTarget}`, 'info')

      setTimeout(() => {
        setAxes(prev => prev.map(a => 
          a.id === axisId ? { ...a, moving: false, current: newTarget } : a
        ))
      }, 2000)

    } catch (error) {
      setAxes(prev => prev.map(a => 
        a.id === axisId ? { ...a, moving: false } : a
      ))
      onError(`Failed to move ${axisId.toUpperCase()} axis`, 'error')
    }
  }

  const homeAxis = async (axisId: string) => {
    try {
      setAxes(prev => prev.map(a => 
        a.id === axisId ? { ...a, moving: true } : a
      ))

      await api.sendCommand(`${axisId.toUpperCase()};2`)
      onError(`${axisId.toUpperCase()} axis homing`, 'info')

      setTimeout(() => {
        setAxes(prev => prev.map(a => 
          a.id === axisId ? { ...a, moving: false, current: 0, target: 0 } : a
        ))
      }, 3000)

    } catch (error) {
      setAxes(prev => prev.map(a => 
        a.id === axisId ? { ...a, moving: false } : a
      ))
      onError(`Failed to home ${axisId.toUpperCase()} axis`, 'error')
    }
  }

  const controlAxis = async (axisId: string, action: 'play' | 'pause' | 'stop') => {
    try {
      const commands = {
        play: 'PLAY',
        pause: 'PAUSE', 
        stop: 'STOP'
      }

      await api.sendCommand(commands[action])
      onError(`${action.toUpperCase()} command sent`, 'info')
    } catch (error) {
      onError(`Failed to ${action} axis`, 'error')
    }
  }

  const homeAllAxes = async () => {
    try {
      await api.sendCommand('ZERO')
      setAxes(prev => prev.map(axis => ({ 
        ...axis, 
        moving: true 
      })))
      onError('Homing all axes', 'info')

      setTimeout(() => {
        setAxes(prev => prev.map(axis => ({ 
          ...axis, 
          moving: false, 
          current: 0, 
          target: 0 
        })))
      }, 5000)

    } catch (error) {
      onError('Failed to home all axes', 'error')
    }
  }

  const stopAllAxes = async () => {
    try {
      await api.sendCommand('STOP')
      setAxes(prev => prev.map(axis => ({ ...axis, moving: false })))
      onError('Emergency stop activated', 'warning')
    } catch (error) {
      onError('Failed to stop all axes', 'error')
    }
  }

  const handleEmergencyStop = async () => {
    setEmergencyStop(true)
    await stopAllAxes()
    setTimeout(() => setEmergencyStop(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <span className="text-2xl">🎮</span>
          Manual Axis Control
        </h1>
        <p className="text-muted-foreground">Individual axis positioning and control</p>
      </div>

      <div className="grid gap-4">
        {axes.map((axis) => (
          <Card key={axis.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {axis.name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Current: {axis.current} | Target: {axis.target}
                  </span>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-12">Step:</span>
                  <Input
                    type="number"
                    value={axis.step}
                    onChange={(e) => updateAxisStep(axis.id, parseInt(e.target.value) || 1)}
                    className="w-20"
                    min={1}
                    max={1000}
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveAxis(axis.id, 'left')}
                    disabled={axis.moving || emergencyStop}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    -{axis.step}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => homeAxis(axis.id)}
                    disabled={axis.moving || emergencyStop}
                    className="flex items-center gap-1 px-3"
                  >
                    <Home className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveAxis(axis.id, 'right')}
                    disabled={axis.moving || emergencyStop}
                    className="flex items-center gap-1"
                  >
                    +{axis.step}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => controlAxis(axis.id, 'play')}
                    disabled={emergencyStop}
                    className="w-8 h-8 p-0"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => controlAxis(axis.id, 'pause')}
                    disabled={emergencyStop}
                    className="w-8 h-8 p-0"
                  >
                    <Pause className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => controlAxis(axis.id, 'stop')}
                    className="w-8 h-8 p-0"
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={homeAllAxes}
              disabled={emergencyStop}
              className="h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              HOME ALL AXES
            </Button>
            
            <Button
              onClick={stopAllAxes}
              disabled={emergencyStop}
              variant="outline"
              className="h-12 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Square className="w-4 h-4 mr-2" />
              STOP ALL
            </Button>
            
            <Button
              onClick={handleEmergencyStop}
              className={`h-12 text-white font-bold ${
                emergencyStop 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={emergencyStop}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {emergencyStop ? 'STOPPING...' : 'EMERGENCY STOP'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}