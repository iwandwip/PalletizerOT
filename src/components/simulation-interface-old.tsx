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
  MonitorSpeaker,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  SkipBack,
  Radio,
  Target,
  Timer,
  TrendingUp,
  BarChart3,
  FileBarChart,
  Cpu,
  HardDrive,
  Workflow,
  CircuitBoard,
  Gauge,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScriptData } from '@/hooks/useScriptData'

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
  mode: 'auto' | 'manual'
  currentStep: number
  totalSteps: number
  operationMode: 'auto' | 'arm1_only' | 'arm2_only'
  autoScenarioRunning: boolean
  productInterval: number
  nextTurnIsArm1: boolean
  currentExecutingArm: 'ARM1' | 'ARM2' | null
  armTimeoutTimer: number | null
}

interface SimulationLog {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  arm?: 'ARM1' | 'ARM2'
  command?: string
  duration?: number
}

interface PerformanceMetrics {
  arm1Stats: {
    successRate: number
    averageCycleTime: number
    commandsExecuted: number
    timeouts: number
  }
  arm2Stats: {
    successRate: number
    averageCycleTime: number
    commandsExecuted: number
    timeouts: number
  }
  totalProducts: number
  totalCycles: number
  uptime: number
}

interface ArmState {
  status: 'IDLE' | 'MOVING_TO_CENTER' | 'AT_CENTER' | 'PICKING' | 'RETURNING' | 'ERROR'
  hasScript: boolean
  commandCount: number
  currentCommandIndex: number
  currentCommand: string | null
}

interface SlaveState {
  id: string
  axis: string
  position: number
  targetPosition: number
  moving: boolean
  status: 'IDLE' | 'MOVING' | 'COMPLETED' | 'ERROR'
  lastCommand: string | null
  executionTime: number
}

interface MasterState {
  id: string
  armId: 'ARM1' | 'ARM2'
  status: 'IDLE' | 'MOVING_TO_CENTER' | 'AT_CENTER' | 'PICKING' | 'RETURNING' | 'ERROR' | 'TIMEOUT'
  hasScript: boolean
  commandCount: number
  currentCommandIndex: number
  currentCommand: string | null
  slaves: SlaveState[]
  cycleStartTime: number | null
  timeoutStartTime: number | null
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
              <SlaveBlock 
                key={axis} 
                axis={axis} 
                armId={armId}
                currentCommand={state.currentCommand}
                isActive={state.status !== 'IDLE'}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const SlaveBlock = ({ 
  axis, 
  armId,
  currentCommand,
  isActive
}: { 
  axis: string
  armId: string
  currentCommand: string | null
  isActive: boolean
}) => {
  // Parse current command to check if this axis is being used
  const isAxisInCommand = currentCommand && currentCommand.includes(axis)
  
  const slaveState: SlaveState = {
    position: isAxisInCommand ? 50 : 0, // Show movement position if axis is active
    moving: isActive && isAxisInCommand,
    status: isActive && isAxisInCommand ? 'MOVING' : 'IDLE'
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
      slaveState.moving 
        ? 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700' 
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    )}>
      <div className="text-xs font-bold text-foreground">{axis}</div>
      <div className="text-xs text-muted-foreground">{slaveState.position}</div>
      <div className="text-sm">{getStatusIcon(slaveState.status, slaveState.moving)}</div>
    </div>
  )
}

const ScriptExecutionPanel = ({ 
  allCommands, 
  simulationState 
}: { 
  allCommands: Array<{arm: 'ARM1' | 'ARM2', command: string}>
  simulationState: SimulationState 
}) => {
  const scriptData = useScriptData()
  
  // Convert script text to command arrays with status
  const arm1Commands = scriptData.arm1Script
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//'))
    .map((command, index) => {
      const currentStepCommand = allCommands[simulationState.currentStep]
      const isCurrentStep = simulationState.mode === 'manual' && 
                           currentStepCommand?.arm === 'ARM1' && 
                           currentStepCommand?.command === command.trim()
      
      // Check if this command has been executed (is before current step)
      const arm1CommandsUpToCurrent = allCommands.slice(0, simulationState.currentStep)
        .filter(cmd => cmd.arm === 'ARM1')
      const isCompleted = arm1CommandsUpToCurrent.some(cmd => cmd.command === command.trim())
      
      return {
        command: command.trim(),
        status: isCurrentStep ? 'executing' : 
               isCompleted ? 'completed' : 'pending'
      }
    })

  const arm2Commands = scriptData.arm2Script
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//'))
    .map((command, index) => {
      const currentStepCommand = allCommands[simulationState.currentStep]
      const isCurrentStep = simulationState.mode === 'manual' && 
                           currentStepCommand?.arm === 'ARM2' && 
                           currentStepCommand?.command === command.trim()
      
      // Check if this command has been executed (is before current step)
      const arm2CommandsUpToCurrent = allCommands.slice(0, simulationState.currentStep)
        .filter(cmd => cmd.arm === 'ARM2')
      const isCompleted = arm2CommandsUpToCurrent.some(cmd => cmd.command === command.trim())
      
      return {
        command: command.trim(),
        status: isCurrentStep ? 'executing' : 
               isCompleted ? 'completed' : 'pending'
      }
    })

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
  const scriptData = useScriptData()
  
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    speed: 1,
    productsProcessed: 0,
    cyclesCompleted: 0,
    errors: 0,
    currentTurn: 'ARM1',
    esp32Connected: true,
    productSensor: false,
    collisionSensor: false,
    timeoutCountdown: null,
    mode: 'auto',
    currentStep: 0,
    totalSteps: 0,
    operationMode: 'auto',
    autoScenarioRunning: false,
    productInterval: 10,
    nextTurnIsArm1: true,
    currentExecutingArm: null,
    armTimeoutTimer: null
  })

  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    arm1Stats: {
      successRate: 0,
      averageCycleTime: 0,
      commandsExecuted: 0,
      timeouts: 0
    },
    arm2Stats: {
      successRate: 0,
      averageCycleTime: 0,
      commandsExecuted: 0,
      timeouts: 0
    },
    totalProducts: 0,
    totalCycles: 0,
    uptime: 0
  })

  // Calculate total steps from both arm scripts
  const getAllCommands = useCallback(() => {
    const arm1Commands = scriptData.arm1Script
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('//'))
      .map(cmd => ({ arm: 'ARM1' as const, command: cmd.trim() }))
    
    const arm2Commands = scriptData.arm2Script
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('//'))
      .map(cmd => ({ arm: 'ARM2' as const, command: cmd.trim() }))
    
    return [...arm1Commands, ...arm2Commands]
  }, [scriptData.arm1Script, scriptData.arm2Script])

  const allCommands = getAllCommands()

  useEffect(() => {
    setSimulationState(prev => ({
      ...prev,
      totalSteps: allCommands.length,
      currentStep: 0
    }))
  }, [allCommands.length])

  // Create arm states based on current step
  const getCurrentArmStates = useCallback(() => {
    const currentCommand = allCommands[simulationState.currentStep]
    
    const arm1State: ArmState = {
      status: simulationState.mode === 'manual' && currentCommand?.arm === 'ARM1' ? 'PICKING' : 'IDLE',
      hasScript: scriptData.arm1CommandCount > 0,
      commandCount: scriptData.arm1CommandCount,
      currentCommandIndex: allCommands.slice(0, simulationState.currentStep + 1)
        .filter(cmd => cmd.arm === 'ARM1').length,
      currentCommand: currentCommand?.arm === 'ARM1' ? currentCommand.command : null
    }

    const arm2State: ArmState = {
      status: simulationState.mode === 'manual' && currentCommand?.arm === 'ARM2' ? 'PICKING' : 'IDLE',
      hasScript: scriptData.arm2CommandCount > 0,
      commandCount: scriptData.arm2CommandCount,
      currentCommandIndex: allCommands.slice(0, simulationState.currentStep + 1)
        .filter(cmd => cmd.arm === 'ARM2').length,
      currentCommand: currentCommand?.arm === 'ARM2' ? currentCommand.command : null
    }
    
    return { arm1State, arm2State }
  }, [allCommands, simulationState.currentStep, simulationState.mode, scriptData.arm1CommandCount, scriptData.arm2CommandCount])
  
  const { arm1State, arm2State } = getCurrentArmStates()

  const handleModeToggle = () => {
    setSimulationState(prev => ({
      ...prev,
      mode: prev.mode === 'auto' ? 'manual' : 'auto',
      isRunning: false
    }))
  }

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
      timeoutCountdown: null,
      currentStep: 0
    }))
  }

  const handleNextStep = () => {
    if (simulationState.currentStep < allCommands.length - 1) {
      setSimulationState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }
  }

  const handlePrevStep = () => {
    if (simulationState.currentStep > 0) {
      setSimulationState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }

  const handleFirstStep = () => {
    setSimulationState(prev => ({ ...prev, currentStep: 0 }))
  }

  const handleLastStep = () => {
    setSimulationState(prev => ({ ...prev, currentStep: allCommands.length - 1 }))
  }

  // Enhanced sensor and automation controls
  const addLog = useCallback((type: SimulationLog['type'], message: string, arm?: 'ARM1' | 'ARM2', command?: string, duration?: number) => {
    const log: SimulationLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      arm,
      command,
      duration
    }
    setSimulationLogs(prev => [log, ...prev.slice(0, 99)]) // Keep last 100 logs
  }, [])

  const triggerProductSensor = () => {
    if (!simulationState.productSensor) {
      setSimulationState(prev => ({ ...prev, productSensor: true }))
      addLog('info', 'Product detected - starting cycle sequence')
      
      // Auto-clear after 2 seconds
      setTimeout(() => {
        setSimulationState(prev => ({ ...prev, productSensor: false }))
      }, 2000)
    }
  }

  const triggerCollisionSensor = () => {
    setSimulationState(prev => ({ ...prev, collisionSensor: !prev.collisionSensor }))
    addLog(simulationState.collisionSensor ? 'info' : 'warning', 
          simulationState.collisionSensor ? 'Center area cleared' : 'Center area occupied')
  }

  const handleOperationModeChange = (mode: 'auto' | 'arm1_only' | 'arm2_only') => {
    setSimulationState(prev => ({ ...prev, operationMode: mode, isRunning: false }))
    addLog('info', `Operation mode changed to: ${mode.toUpperCase().replace('_', ' ')}`)
  }

  const startAutoScenario = () => {
    setSimulationState(prev => ({ ...prev, autoScenarioRunning: true }))
    addLog('success', `Auto scenario started - product every ${simulationState.productInterval}s`)
  }

  const stopAutoScenario = () => {
    setSimulationState(prev => ({ ...prev, autoScenarioRunning: false }))
    addLog('info', 'Auto scenario stopped')
  }

  const clearLogs = () => {
    setSimulationLogs([])
    addLog('info', 'Simulation logs cleared')
  }

  const exportLogs = () => {
    const csvContent = simulationLogs.map(log => 
      `${log.timestamp},${log.type},${log.arm || ''},${log.command || ''},${log.duration || ''},"${log.message}"`
    ).join('\n')
    
    const header = 'Timestamp,Type,Arm,Command,Duration,Message\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `simulation-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    
    URL.revokeObjectURL(url)
    addLog('success', 'Simulation logs exported to CSV')
  }

  return (
    <div className="space-y-6">
      {/* Simulation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simulation Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Mode:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={simulationState.mode === 'auto' ? 'default' : 'outline'}
                  onClick={handleModeToggle}
                  disabled={simulationState.isRunning}
                >
                  Auto Mode
                </Button>
                <Button
                  size="sm"
                  variant={simulationState.mode === 'manual' ? 'default' : 'outline'}
                  onClick={handleModeToggle}
                  disabled={simulationState.isRunning}
                >
                  Step Mode
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Auto Mode Controls */}
              {simulationState.mode === 'auto' && (
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
              )}

              {/* Step Mode Controls */}
              {simulationState.mode === 'manual' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Step:</span>
                  <Badge variant="outline">
                    {simulationState.currentStep + 1} / {simulationState.totalSteps}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleFirstStep}
                      disabled={simulationState.currentStep === 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrevStep}
                      disabled={simulationState.currentStep === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNextStep}
                      disabled={simulationState.currentStep >= simulationState.totalSteps - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLastStep}
                      disabled={simulationState.currentStep >= simulationState.totalSteps - 1}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {simulationState.mode === 'auto' && (
                  <>
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
                  </>
                )}
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
                  {simulationState.mode === 'manual' 
                    ? '⚡STEP MODE' 
                    : simulationState.isRunning 
                      ? '●RUNNING' 
                      : '○STOPPED'
                  }
                </Badge>
              </div>
            </div>

            {/* Current Command Display for Step Mode */}
            {simulationState.mode === 'manual' && allCommands.length > 0 && (
              <div className="bg-muted p-3 rounded border">
                <div className="text-sm font-medium mb-1">Current Step:</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {allCommands[simulationState.currentStep]?.arm || 'N/A'}
                  </Badge>
                  <code className="font-mono text-sm">
                    {allCommands[simulationState.currentStep]?.command || 'No command'}
                  </code>
                </div>
              </div>
            )}
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

      {/* Enhanced Features Preview */}
      <div className="space-y-4">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>📍 You're in Basic Mode</strong>
              <br />
              Switch to Enhanced Mode (button di atas) untuk features:
              <br />
              ✨ Distributed hardware architecture visualization
              <br />
              🎯 Smart sensor controls with manual triggers  
              <br />
              🤖 Round-robin logic with timeout fallback
              <br />
              📊 Advanced analytics and live event logging
              <br />
              🔗 Visual wiring connections between components
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Script Execution Panel */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Script Execution</h3>
        <ScriptExecutionPanel 
          allCommands={allCommands}
          simulationState={simulationState}
        />
      </div>

      {/* Simulation Metrics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Simulation Analytics</h3>
        <SimulationMetrics state={simulationState} />
      </div>
    </div>
  )
}