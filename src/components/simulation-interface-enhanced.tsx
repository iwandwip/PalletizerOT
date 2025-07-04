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
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScriptData } from '@/hooks/useScriptData'

interface SimulationLog {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  arm?: 'ARM1' | 'ARM2'
  command?: string
  duration?: number
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

interface EnhancedSimulationState {
  isRunning: boolean
  speed: number
  operationMode: 'auto' | 'arm1_only' | 'arm2_only'
  autoScenarioRunning: boolean
  productInterval: number
  nextTurnIsArm1: boolean
  currentExecutingArm: 'ARM1' | 'ARM2' | null
  armTimeoutTimer: number | null
  esp32Connected: boolean
  productSensor: boolean
  collisionSensor: boolean
  timeoutCountdown: number | null
}

// Enhanced ESP32 Bridge Component
const EnhancedESP32Bridge = ({ 
  state, 
  onProductTrigger, 
  onCollisionTrigger 
}: { 
  state: EnhancedSimulationState
  onProductTrigger: () => void
  onCollisionTrigger: () => void
}) => {
  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 relative">
      {/* Wiring Connections */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-blue-400 rounded"></div>
      <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-8 h-1 bg-green-400 rounded"></div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CircuitBoard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ESP32 Bridge Controller
          <div className={`w-2 h-2 rounded-full ${state.esp32Connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">WiFi Connection:</span>
          <div className="flex items-center gap-2">
            {state.esp32Connected ? (
              <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm text-muted-foreground">Signal: 85%</span>
          </div>
        </div>
        
        <Separator />
        
        {/* Smart Sensors Section */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-center">🤖 SMART SENSORS</div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">📦 Product Sensor:</span>
            <div className="flex items-center gap-2">
              <Badge variant={state.productSensor ? 'default' : 'secondary'}>
                {state.productSensor ? '●DETECTED' : '○CLEAR'}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onProductTrigger}
                className="h-6 px-2"
                disabled={state.productSensor}
              >
                <Radio className="h-3 w-3 mr-1" />
                Trigger
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">⚠️ Collision Sensor:</span>
            <div className="flex items-center gap-2">
              <Badge variant={state.collisionSensor ? 'destructive' : 'secondary'}>
                {state.collisionSensor ? '●OCCUPIED' : '○CLEAR'}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onCollisionTrigger}
                className="h-6 px-2"
              >
                <Target className="h-3 w-3 mr-1" />
                Toggle
              </Button>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Round-Robin Logic Display */}
        <div className="text-center space-y-2">
          <div className="text-sm font-medium">🎯 Round-Robin Controller</div>
          <Badge variant="outline" className="text-xs">
            Next Turn: {state.nextTurnIsArm1 ? 'ARM1' : 'ARM2'}
          </Badge>
          {state.currentExecutingArm && (
            <Badge variant="default" className="text-xs ml-2">
              Executing: {state.currentExecutingArm}
            </Badge>
          )}
        </div>
        
        {state.timeoutCountdown && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Timer className="h-4 w-4" />
            <span className="text-sm">Timeout: {state.timeoutCountdown}s</span>
            <Progress value={(10 - state.timeoutCountdown) * 10} className="flex-1 h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Enhanced Master Controller Component
const EnhancedMasterController = ({ 
  masterState 
}: { 
  masterState: MasterState 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
      case 'MOVING_TO_CENTER': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'AT_CENTER': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'PICKING': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'RETURNING': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      case 'ERROR': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'TIMEOUT': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <Card className={`border-2 relative ${
      masterState.armId === 'ARM1' 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30' 
        : 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30'
    }`}>
      {/* Wiring to ESP32 */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-blue-400 rounded"></div>
      
      {/* Wiring to Slaves */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-400 rounded"></div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cpu className={`h-5 w-5 ${
            masterState.armId === 'ARM1' 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`} />
          {masterState.armId} Master (Arduino Nano)
          <div className={`w-2 h-2 rounded-full ${masterState.status !== 'ERROR' ? 'bg-green-500' : 'bg-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusColor(masterState.status)}>
            {masterState.status === 'MOVING_TO_CENTER' && <Zap className="h-3 w-3 mr-1" />}
            {masterState.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Script Loaded:</span>
          <Badge variant={masterState.hasScript ? 'default' : 'secondary'}>
            {masterState.hasScript ? `${masterState.commandCount} commands` : 'None'}
          </Badge>
        </div>
        
        {masterState.hasScript && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress:</span>
              <span className="text-sm">{masterState.currentCommandIndex}/{masterState.commandCount}</span>
            </div>
            
            <Progress 
              value={(masterState.currentCommandIndex / masterState.commandCount) * 100} 
              className="h-2"
            />
            
            {masterState.currentCommand && (
              <div className="text-xs text-center p-2 bg-muted rounded border">
                <div className="font-medium">Current Command:</div>
                <code className="font-mono text-foreground">{masterState.currentCommand}</code>
              </div>
            )}
          </>
        )}
        
        <Separator />
        
        {/* Enhanced Slave Network */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-center">🤖 SLAVE NETWORK (Arduino Nano)</div>
          <div className="grid grid-cols-5 gap-1">
            {masterState.slaves.map((slave) => (
              <EnhancedSlaveController key={slave.id} slave={slave} />
            ))}
          </div>
        </div>
        
        {/* Cycle Performance */}
        {masterState.cycleStartTime && (
          <div className="text-xs text-center text-muted-foreground">
            Cycle Time: {((Date.now() - masterState.cycleStartTime) / 1000).toFixed(1)}s
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Enhanced Slave Controller Component
const EnhancedSlaveController = ({ slave }: { slave: SlaveState }) => {
  const getStatusIcon = (status: string, moving: boolean) => {
    if (moving) return '⚡'
    switch (status) {
      case 'COMPLETED': return '✓'
      case 'ERROR': return '❌'
      default: return '⭕'
    }
  }

  const getStatusColor = (status: string, moving: boolean) => {
    if (moving) return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700'
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
      case 'ERROR': return 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <div className={cn(
      "text-center p-1 rounded border relative",
      getStatusColor(slave.status, slave.moving)
    )}>
      {/* Wiring to Master */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-2 bg-gray-400"></div>
      
      <div className="text-xs font-bold text-foreground">{slave.axis}</div>
      <div className="text-xs text-muted-foreground">
        {slave.position}
        {slave.moving && slave.targetPosition !== slave.position && (
          <span className="text-xs">→{slave.targetPosition}</span>
        )}
      </div>
      <div className="text-sm">{getStatusIcon(slave.status, slave.moving)}</div>
      
      {slave.lastCommand && (
        <div className="text-xs text-muted-foreground truncate" title={slave.lastCommand}>
          {slave.lastCommand.slice(0, 5)}
        </div>
      )}
    </div>
  )
}

// Live Event Logs Component
const LiveEventLogs = ({ 
  logs, 
  onClear, 
  onExport 
}: { 
  logs: SimulationLog[]
  onClear: () => void
  onExport: () => void
}) => {
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-orange-600 dark:text-orange-400'
      case 'error': return 'text-red-600 dark:text-red-400'
      default: return 'text-blue-600 dark:text-blue-400'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Event Logs ({logs.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No events logged yet. Start simulation to see logs.
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id}
                className="flex items-start gap-2 p-2 rounded text-xs border-l-2 border-l-blue-200 bg-muted/30"
              >
                <span className="text-sm">{getLogIcon(log.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      [{log.timestamp}]
                    </span>
                    {log.arm && (
                      <Badge variant="outline" className="h-4 px-1 text-xs">
                        {log.arm}
                      </Badge>
                    )}
                    {log.duration && (
                      <span className="text-xs text-muted-foreground">
                        ({log.duration.toFixed(1)}s)
                      </span>
                    )}
                  </div>
                  <div className={cn("font-medium", getLogColor(log.type))}>
                    {log.message}
                  </div>
                  {log.command && (
                    <code className="text-xs text-muted-foreground">
                      Command: {log.command}
                    </code>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Performance Analytics Dashboard
const PerformanceAnalytics = ({ 
  metrics 
}: { 
  metrics: PerformanceMetrics 
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.totalProducts}
              </div>
              <div className="text-xs text-muted-foreground">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.totalCycles}
              </div>
              <div className="text-xs text-muted-foreground">Total Cycles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(metrics.uptime / 60).toFixed(1)}m
              </div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {metrics.totalProducts > 0 ? ((metrics.totalProducts / (metrics.uptime / 60)) * 60).toFixed(1) : 0}
              </div>
              <div className="text-xs text-muted-foreground">Products/Hour</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ARM1 Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600 dark:text-green-400">ARM1 Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs">Success Rate:</span>
              <span className="text-xs font-medium">{metrics.arm1Stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Avg Cycle Time:</span>
              <span className="text-xs font-medium">{metrics.arm1Stats.averageCycleTime.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Commands Executed:</span>
              <span className="text-xs font-medium">{metrics.arm1Stats.commandsExecuted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Timeouts:</span>
              <span className="text-xs font-medium text-red-600">{metrics.arm1Stats.timeouts}</span>
            </div>
          </CardContent>
        </Card>

        {/* ARM2 Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-600 dark:text-orange-400">ARM2 Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs">Success Rate:</span>
              <span className="text-xs font-medium">{metrics.arm2Stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Avg Cycle Time:</span>
              <span className="text-xs font-medium">{metrics.arm2Stats.averageCycleTime.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Commands Executed:</span>
              <span className="text-xs font-medium">{metrics.arm2Stats.commandsExecuted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Timeouts:</span>
              <span className="text-xs font-medium text-red-600">{metrics.arm2Stats.timeouts}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const EnhancedSimulationInterface = () => {
  const scriptData = useScriptData()
  
  const [simulationState, setSimulationState] = useState<EnhancedSimulationState>({
    isRunning: false,
    speed: 1,
    operationMode: 'auto',
    autoScenarioRunning: false,
    productInterval: 10,
    nextTurnIsArm1: true,
    currentExecutingArm: null,
    armTimeoutTimer: null,
    esp32Connected: true,
    productSensor: false,
    collisionSensor: false,
    timeoutCountdown: null
  })

  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    arm1Stats: { successRate: 95.2, averageCycleTime: 12.5, commandsExecuted: 247, timeouts: 2 },
    arm2Stats: { successRate: 92.8, averageCycleTime: 13.2, commandsExecuted: 231, timeouts: 5 },
    totalProducts: 156,
    totalCycles: 312,
    uptime: 1847
  })

  // Mock master states with real script data
  const [arm1Master, setArm1Master] = useState<MasterState>({
    id: 'master_arm1',
    armId: 'ARM1',
    status: 'IDLE',
    hasScript: scriptData.arm1CommandCount > 0,
    commandCount: scriptData.arm1CommandCount,
    currentCommandIndex: 0,
    currentCommand: null,
    slaves: [
      { id: 'arm1_x', axis: 'X', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm1_y', axis: 'Y', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm1_z', axis: 'Z', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm1_t', axis: 'T', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm1_g', axis: 'G', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 }
    ],
    cycleStartTime: null,
    timeoutStartTime: null
  })

  const [arm2Master, setArm2Master] = useState<MasterState>({
    id: 'master_arm2',
    armId: 'ARM2',
    status: 'IDLE',
    hasScript: scriptData.arm2CommandCount > 0,
    commandCount: scriptData.arm2CommandCount,
    currentCommandIndex: 0,
    currentCommand: null,
    slaves: [
      { id: 'arm2_x', axis: 'X', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm2_y', axis: 'Y', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm2_z', axis: 'Z', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm2_t', axis: 'T', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 },
      { id: 'arm2_g', axis: 'G', position: 0, targetPosition: 0, moving: false, status: 'IDLE', lastCommand: null, executionTime: 0 }
    ],
    cycleStartTime: null,
    timeoutStartTime: null
  })

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
    setSimulationLogs(prev => [log, ...prev.slice(0, 99)])
  }, [])

  const triggerProductSensor = () => {
    if (!simulationState.productSensor) {
      setSimulationState(prev => ({ ...prev, productSensor: true }))
      addLog('info', 'Product detected - starting cycle sequence')
      
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

  // Update master states when script data changes
  useEffect(() => {
    setArm1Master(prev => ({
      ...prev,
      hasScript: scriptData.arm1CommandCount > 0,
      commandCount: scriptData.arm1CommandCount
    }))
    setArm2Master(prev => ({
      ...prev,
      hasScript: scriptData.arm2CommandCount > 0,
      commandCount: scriptData.arm2CommandCount
    }))
  }, [scriptData.arm1CommandCount, scriptData.arm2CommandCount])

  return (
    <div className="space-y-6">
      {/* Enhanced Simulation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Simulation Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Operation Mode Selection */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Operation Mode:</span>
              <div className="flex gap-2">
                {(['auto', 'arm1_only', 'arm2_only'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={simulationState.operationMode === mode ? 'default' : 'outline'}
                    onClick={() => setSimulationState(prev => ({ ...prev, operationMode: mode }))}
                  >
                    {mode === 'auto' ? '🤖 Auto Round-Robin' : 
                     mode === 'arm1_only' ? '🟢 ARM1 Only' : '🟠 ARM2 Only'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Speed and Auto Scenario Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Speed:</span>
                <Select value={simulationState.speed.toString()} onValueChange={(v) => setSimulationState(prev => ({ ...prev, speed: parseInt(v) }))}>
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

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Auto Scenario:</span>
                <Select value={simulationState.productInterval.toString()} onValueChange={(v) => setSimulationState(prev => ({ ...prev, productInterval: parseInt(v) }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Every 5s</SelectItem>
                    <SelectItem value="10">Every 10s</SelectItem>
                    <SelectItem value="15">Every 15s</SelectItem>
                    <SelectItem value="30">Every 30s</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant={simulationState.autoScenarioRunning ? 'destructive' : 'default'}
                  onClick={() => setSimulationState(prev => ({ ...prev, autoScenarioRunning: !prev.autoScenarioRunning }))}
                >
                  {simulationState.autoScenarioRunning ? (
                    <>
                      <StopCircle className="h-4 w-4 mr-1" />
                      Stop Auto
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Start Auto
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Status Display */}
            <div className="flex items-center gap-4">
              <Badge variant={simulationState.isRunning ? 'default' : 'secondary'}>
                {simulationState.isRunning ? '●RUNNING' : '○STOPPED'}
              </Badge>
              <Badge variant="outline">
                Mode: {simulationState.operationMode.toUpperCase().replace('_', ' ')}
              </Badge>
              {simulationState.autoScenarioRunning && (
                <Badge variant="outline" className="text-green-600">
                  🔄 Auto Scenario Active
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Hardware Diagram */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Distributed Hardware Architecture
        </h3>
        
        {/* ESP32 Bridge */}
        <div className="flex justify-center">
          <div className="w-80">
            <EnhancedESP32Bridge 
              state={simulationState} 
              onProductTrigger={triggerProductSensor}
              onCollisionTrigger={triggerCollisionSensor}
            />
          </div>
        </div>

        {/* Master Controllers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedMasterController masterState={arm1Master} />
          <EnhancedMasterController masterState={arm2Master} />
        </div>
      </div>

      {/* Live Event Logs */}
      <LiveEventLogs 
        logs={simulationLogs}
        onClear={clearLogs}
        onExport={exportLogs}
      />

      {/* Performance Analytics */}
      <PerformanceAnalytics metrics={performanceMetrics} />
    </div>
  )
}