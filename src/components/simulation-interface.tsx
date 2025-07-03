'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  RotateCcw,
  Download,
  Wifi,
  WifiOff,
  Zap,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Settings,
  MonitorSpeaker
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimulationState {
  isRunning: boolean
  speed: number
  productsProcessed: number
  cyclesCompleted: number
  errors: number
  currentTurn: 'ARM1' | 'ARM2'
  esp32Connected: boolean
  productSensor: boolean
  collisionSensor: boolean
  timeoutCountdown: number | null
}

interface ArmState {
  status: 'IDLE' | 'MOVING_TO_CENTER' | 'AT_CENTER' | 'PICKING' | 'RETURNING' | 'ERROR'
  hasScript: boolean
  commandCount: number
  currentCommandIndex: number
  currentCommand: string | null
}

interface SlaveState {
  position: number
  moving: boolean
  status: 'IDLE' | 'MOVING' | 'COMPLETED' | 'ERROR'
}

const ESP32Block = ({ state }: { state: SimulationState }) => {
  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MonitorSpeaker className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ESP32 Bridge
          <div className={`w-2 h-2 rounded-full ${state.esp32Connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">WiFi:</span>
          <div className="flex items-center gap-2">
            {state.esp32Connected ? (
              <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm text-muted-foreground">85%</span>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">📦 Product:</span>
            <Badge variant={state.productSensor ? 'default' : 'secondary'}>
              {state.productSensor ? 'DETECTED' : 'CLEAR'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">⚠️ Center:</span>
            <Badge variant={state.collisionSensor ? 'destructive' : 'secondary'}>
              {state.collisionSensor ? 'OCCUPIED' : 'CLEAR'}
            </Badge>
          </div>
        </div>
        
        <Separator />
        
        <div className="text-center">
          <div className="text-sm font-medium">🎯 Next Turn:</div>
          <Badge variant="outline" className="mt-1">
            {state.currentTurn}
          </Badge>
        </div>
        
        {state.timeoutCountdown && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Timeout: {state.timeoutCountdown}s</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const MasterBlock = ({ 
  armId, 
  state 
}: { 
  armId: 'ARM1' | 'ARM2'
  state: ArmState 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
      case 'MOVING_TO_CENTER': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'AT_CENTER': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'PICKING': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'RETURNING': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      case 'ERROR': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <Card className={`border-2 ${
      armId === 'ARM1' 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30' 
        : 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className={`h-5 w-5 ${
            armId === 'ARM1' 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`} />
          {armId} Master
          <div className={`w-2 h-2 rounded-full ${state.status !== 'ERROR' ? 'bg-green-500' : 'bg-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusColor(state.status)}>
            {state.status === 'MOVING_TO_CENTER' && <Zap className="h-3 w-3 mr-1" />}
            {state.status}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Script:</span>
          <Badge variant={state.hasScript ? 'default' : 'secondary'}>
            {state.hasScript ? `${state.commandCount} commands` : 'None'}
          </Badge>
        </div>
        
        {state.hasScript && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress:</span>
              <span className="text-sm">{state.currentCommandIndex}/{state.commandCount}</span>
            </div>
            
            <Progress 
              value={(state.currentCommandIndex / state.commandCount) * 100} 
              className="h-2"
            />
            
            {state.currentCommand && (
              <div className="text-xs text-center p-2 bg-muted rounded">
                Current: <code className="font-mono text-foreground">{state.currentCommand}</code>
              </div>
            )}
          </>
        )}
        
        <Separator />
        
        {/* Slaves Row */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-center">SLAVES</div>
          <div className="grid grid-cols-5 gap-1">
            {['X', 'Y', 'Z', 'T', 'G'].map((axis) => (
              <SlaveBlock key={axis} axis={axis} armId={armId} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const SlaveBlock = ({ 
  axis, 
  armId 
}: { 
  axis: string
  armId: string 
}) => {
  // Mock slave state - in real implementation, this would come from simulation state
  const mockState: SlaveState = {
    position: axis === 'X' ? 100 : 0,
    moving: axis === 'X' && armId === 'ARM1',
    status: axis === 'X' && armId === 'ARM1' ? 'MOVING' : 'IDLE'
  }

  const getStatusIcon = (status: string, moving: boolean) => {
    if (moving) return '⚡'
    switch (status) {
      case 'COMPLETED': return '✓'
      case 'ERROR': return '❌'
      default: return '⭕'
    }
  }

  return (
    <div className={cn(
      "text-center p-1 rounded border",
      mockState.moving 
        ? 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700' 
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    )}>
      <div className="text-xs font-bold text-foreground">{axis}</div>
      <div className="text-xs text-muted-foreground">{mockState.position}</div>
      <div className="text-sm">{getStatusIcon(mockState.status, mockState.moving)}</div>
    </div>
  )
}

const ScriptExecutionPanel = () => {
  // Mock script data - in real implementation, this would come from actual MSL scripts
  const arm1Commands = [
    { command: 'X(100);', status: 'completed' },
    { command: 'Y(50);', status: 'executing' },
    { command: 'Z(10);', status: 'pending' },
    { command: 'G(1);', status: 'pending' },
    { command: 'Z(50);', status: 'pending' }
  ]

  const arm2Commands = [
    { command: 'X(150);', status: 'pending' },
    { command: 'Y(75);', status: 'pending' },
    { command: 'Z(5);', status: 'pending' },
    { command: 'G(0);', status: 'pending' }
  ]

  const getCommandIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓'
      case 'executing': return '⚡'
      case 'pending': return '○'
      default: return '○'
    }
  }

  const getCommandStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
      case 'executing': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 font-semibold'
      case 'pending': return 'text-muted-foreground'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">ARM1 Script ({arm1Commands.length} commands)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {arm1Commands.map((cmd, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded text-xs",
                  getCommandStyle(cmd.status)
                )}
              >
                <span>{getCommandIcon(cmd.status)}</span>
                <code className="font-mono">{cmd.command}</code>
                {cmd.status === 'executing' && <span className="text-xs">←EXECUTING</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">ARM2 Script ({arm2Commands.length} commands)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {arm2Commands.map((cmd, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded text-xs",
                  getCommandStyle(cmd.status)
                )}
              >
                <span>{getCommandIcon(cmd.status)}</span>
                <code className="font-mono">{cmd.command}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const SimulationMetrics = ({ state }: { state: SimulationState }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="text-center">
        <CardContent className="p-3">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{state.productsProcessed}</div>
          <div className="text-xs text-muted-foreground">Products</div>
        </CardContent>
      </Card>
      <Card className="text-center">
        <CardContent className="p-3">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{state.cyclesCompleted}</div>
          <div className="text-xs text-muted-foreground">Cycles</div>
        </CardContent>
      </Card>
      <Card className="text-center">
        <CardContent className="p-3">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{state.errors}</div>
          <div className="text-xs text-muted-foreground">Errors</div>
        </CardContent>
      </Card>
      <Card className="text-center">
        <CardContent className="p-3">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{state.speed}x</div>
          <div className="text-xs text-muted-foreground">Speed</div>
        </CardContent>
      </Card>
    </div>
  )
}

export const SimulationInterface = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    speed: 1,
    productsProcessed: 15,
    cyclesCompleted: 7,
    errors: 1,
    currentTurn: 'ARM2',
    esp32Connected: true,
    productSensor: true,
    collisionSensor: false,
    timeoutCountdown: null
  })

  const [arm1State] = useState<ArmState>({
    status: 'IDLE',
    hasScript: true,
    commandCount: 12,
    currentCommandIndex: 12,
    currentCommand: null
  })

  const [arm2State] = useState<ArmState>({
    status: 'MOVING_TO_CENTER',
    hasScript: true,
    commandCount: 8,
    currentCommandIndex: 3,
    currentCommand: 'Y(50);'
  })

  const handleSpeedChange = (speed: string) => {
    setSimulationState(prev => ({ ...prev, speed: parseInt(speed) }))
  }

  const handleStart = () => {
    setSimulationState(prev => ({ ...prev, isRunning: true }))
  }

  const handleStop = () => {
    setSimulationState(prev => ({ ...prev, isRunning: false }))
  }

  const handleReset = () => {
    setSimulationState(prev => ({
      ...prev,
      isRunning: false,
      productsProcessed: 0,
      cyclesCompleted: 0,
      errors: 0,
      currentTurn: 'ARM1',
      productSensor: false,
      collisionSensor: false,
      timeoutCountdown: null
    }))
  }

  return (
    <div className="space-y-6">
      {/* Simulation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simulation Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Speed:</span>
              <Select value={simulationState.speed.toString()} onValueChange={handleSpeedChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Real-time</SelectItem>
                  <SelectItem value="2">2x Speed</SelectItem>
                  <SelectItem value="5">5x Speed</SelectItem>
                  <SelectItem value="10">10x Speed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleStart}
                disabled={simulationState.isRunning}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Start
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                disabled={!simulationState.isRunning}
              >
                <StopCircle className="h-4 w-4 mr-1" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-1" />
                Export Logs
              </Button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm">Status:</span>
              <Badge variant={simulationState.isRunning ? 'default' : 'secondary'}>
                {simulationState.isRunning ? '●RUNNING' : '○STOPPED'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hardware Diagram */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Hardware Diagram</h3>
        
        {/* ESP32 Block */}
        <div className="flex justify-center">
          <div className="w-64">
            <ESP32Block state={simulationState} />
          </div>
        </div>

        {/* Master Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MasterBlock armId="ARM1" state={arm1State} />
          <MasterBlock armId="ARM2" state={arm2State} />
        </div>
      </div>

      {/* Script Execution Panel */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Script Execution</h3>
        <ScriptExecutionPanel />
      </div>

      {/* Simulation Metrics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Simulation Analytics</h3>
        <SimulationMetrics state={simulationState} />
      </div>
    </div>
  )
}