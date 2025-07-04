'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  Settings, 
  Terminal, 
  Code, 
  MonitorSpeaker,
  Layers3,
  Zap,
  Activity,
  Wifi,
  WifiOff,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { CommandEditor } from '@/components/command-editor'
import DebugTerminal from '@/components/debug-terminal'
import StatusDisplay from '@/components/status-display'
import SystemControls from '@/components/system-controls'
import SpeedPanel from '@/components/speed-panel'
import { SettingsModal } from '@/components/settings-modal'
import { ThemeToggle } from '@/components/theme-toggle'
import { DebugOverlay } from '@/components/debug-overlay'
import { SimulationInterface } from '@/components/simulation-interface'
import { EnhancedSimulationInterface } from '@/components/simulation-interface-enhanced'
import { api } from '@/lib/api'

interface ErrorNotification {
  id: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
}

export default function PalletizerInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState('editor')
  const [simulationMode, setSimulationMode] = useState(false)
  const [enhancedSimulation, setEnhancedSimulation] = useState(false)
  
  // Debug log untuk enhanced simulation state
  useEffect(() => {
    console.log('Enhanced simulation state changed:', enhancedSimulation)
  }, [enhancedSimulation])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugHeight, setDebugHeight] = useState(300)
  const [debugMinimized, setDebugMinimized] = useState(false)
  const [compileOutput, setCompileOutput] = useState<string>('')
  const [errors, setErrors] = useState<ErrorNotification[]>([])
  
  // System state
  const [connected, setConnected] = useState(false)
  const [esp32Connected, setEsp32Connected] = useState(false)
  const [hasScript, setHasScript] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0)
  const [totalCommands, setTotalCommands] = useState(0)
  const [systemStatus, setSystemStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR'>('IDLE')

  // Stats
  const [executedCommands, setExecutedCommands] = useState(0)
  const [executionTime, setExecutionTime] = useState('00:00')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [connectedAxes, setConnectedAxes] = useState(5)
  const [efficiency, setEfficiency] = useState(100)

  // Speed control
  const [globalSpeed, setGlobalSpeed] = useState(1000)
  const [axisConfig, setAxisConfig] = useState([
    { id: 'X', name: 'X Axis', speed: 1000 },
    { id: 'Y', name: 'Y Axis', speed: 1000 },
    { id: 'Z', name: 'Z Axis', speed: 500 },
    { id: 'T', name: 'T Axis', speed: 800 },
    { id: 'G', name: 'G Axis', speed: 300 }
  ])

  const checkServerStatus = useCallback(async () => {
    try {
      const ping = await api.ping()
      setConnected(ping)
      
      if (ping) {
        const status = await api.getStatus()
        setEsp32Connected(status.esp32Connected)
        setHasScript(status.hasScript)
        setIsRunning(status.isRunning)
        setCurrentCommandIndex(status.currentCommandIndex)
        setTotalCommands(status.totalCommands)
        setExecutedCommands(status.currentCommandIndex)
        
        // Update stats
        if (status.connectedAxes !== undefined) {
          setConnectedAxes(status.connectedAxes)
        }
        if (status.efficiency !== undefined) {
          setEfficiency(status.efficiency)
        }
        
        // Update system status
        if (!status.esp32Connected) {
          setSystemStatus('ERROR')
        } else if (status.isRunning) {
          setSystemStatus('RUNNING')
          // Start timer if not already started
          if (!startTime) {
            setStartTime(Date.now())
          }
        } else if (status.isPaused) {
          setSystemStatus('PAUSED')
          // Keep timer running when paused
        } else {
          setSystemStatus('IDLE')
          // Reset timer when stopped
          if (startTime && status.currentCommandIndex === 0) {
            setStartTime(null)
            setExecutionTime('00:00')
          }
        }
      }
    } catch {
      setConnected(false)
      setEsp32Connected(false)
      setSystemStatus('ERROR')
    }
  }, [startTime])

  useEffect(() => {
    checkServerStatus()
    const statusInterval = setInterval(checkServerStatus, 2000)
    return () => clearInterval(statusInterval)
  }, [checkServerStatus])

  // Update execution timer
  useEffect(() => {
    if (startTime && (systemStatus === 'RUNNING' || systemStatus === 'PAUSED')) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const minutes = Math.floor(elapsed / 60000)
        const seconds = Math.floor((elapsed % 60000) / 1000)
        setExecutionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [startTime, systemStatus])


  const addNotification = (message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    const notification: ErrorNotification = {
      id: Date.now().toString(),
      message,
      type
    }
    setErrors(prev => [...prev, notification])
    
    setTimeout(() => {
      removeNotification(notification.id)
    }, type === 'error' ? 7000 : 4000)
  }

  const removeNotification = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id))
  }

  const handleCommand = async (command: string) => {
    try {
      switch (command) {
        case 'PLAY':
          await api.start()
          addNotification('Execution started', 'success')
          break
        case 'PAUSE':
          await api.pause()
          addNotification('Execution paused', 'warning')
          break
        case 'STOP':
          await api.stop()
          addNotification('Execution stopped', 'info')
          break
        case 'RESUME':
          await api.resume()
          addNotification('Execution resumed', 'success')
          break
        case 'ZERO':
          await api.zero()
          addNotification('Homing all axes to zero position', 'info')
          break
        default:
          addNotification(`Unknown command: ${command}`, 'error')
          return
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Command error'
      addNotification(errorMsg, 'error')
    }
  }

  const handleGlobalSpeedChange = async (speed: number) => {
    setGlobalSpeed(speed)
    // Update all axis speeds
    setAxisConfig(prev => prev.map(axis => ({ ...axis, speed })))
    
    try {
      // Send speed update to ESP32
      const speedData: Record<string, number> = {}
      axisConfig.forEach(axis => {
        speedData[axis.id] = speed
      })
      
      const response = await fetch('http://localhost:3006/api/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speeds: speedData })
      })
      
      if (response.ok) {
        addNotification('Speed updated successfully', 'success')
      }
    } catch {
      addNotification('Failed to update speed', 'error')
    }
  }

  const handleAxisSpeedChange = async (axisId: string, speed: number) => {
    setAxisConfig(prev => prev.map(axis => 
      axis.id === axisId ? { ...axis, speed } : axis
    ))
    
    try {
      const response = await fetch('http://localhost:3006/api/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speeds: { [axisId]: speed } })
      })
      
      if (response.ok) {
        addNotification(`${axisId} axis speed updated`, 'success')
      }
    } catch {
      addNotification('Failed to update axis speed', 'error')
    }
  }

  const statusColors = {
    IDLE: 'bg-gray-500',
    RUNNING: 'bg-primary',
    PAUSED: 'bg-yellow-500',
    ERROR: 'bg-destructive'
  }

  const statusTexts = {
    IDLE: 'System Idle',
    RUNNING: 'Running',
    PAUSED: 'Paused',
    ERROR: 'Error'
  }

  const notificationIcons = {
    error: AlertTriangle,
    warning: AlertTriangle,
    info: CheckCircle2,
    success: CheckCircle2
  }

  const progress = totalCommands > 0 ? (currentCommandIndex / totalCommands) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Notifications */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {errors.map((error) => {
            const Icon = notificationIcons[error.type]
            return (
              <Alert 
                key={error.id} 
                variant={error.type === 'error' ? 'destructive' : 'default'}
                className={cn(
                  "relative shadow-lg backdrop-blur border-l-4 animate-in slide-in-from-right-full",
                  {
                    'border-l-destructive bg-destructive/5': error.type === 'error',
                    'border-l-yellow-500 bg-yellow-50': error.type === 'warning',
                    'border-l-primary bg-primary/5': error.type === 'success',
                    'border-l-blue-500 bg-blue-50': error.type === 'info'
                  }
                )}
              >
                <Icon className="h-4 w-4" />
                <AlertDescription className="pr-8 text-sm font-medium">
                  {error.message}
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 hover:bg-background/20"
                  onClick={() => removeNotification(error.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Alert>
            )
          })}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-primary/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Layers3 className="h-8 w-8 text-primary" />
                <div className={cn(
                  "absolute -top-1 -right-1 h-3 w-3 rounded-full transition-colors",
                  connected ? "bg-primary animate-pulse" : "bg-destructive"
                )} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PalletizerOT</h1>
                <p className="text-xs text-muted-foreground">Industrial Control System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="h-4 w-4 text-primary" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <Badge 
                variant={connected ? "default" : "destructive"}
                className="text-xs font-medium"
              >
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {/* System Status */}
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full animate-pulse", statusColors[systemStatus])} />
              <span className="text-sm font-medium">{statusTexts[systemStatus]}</span>
            </div>

            {/* Progress indicator */}
            {isRunning && totalCommands > 0 && (
              <div className="hidden md:flex items-center gap-2 min-w-24">
                <Progress value={progress} className="w-16 h-2" />
                <span className="text-xs font-mono">
                  {currentCommandIndex}/{totalCommands}
                </span>
              </div>
            )}

            {/* Debug Terminal Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "hover:bg-primary/10",
                debugOpen && "bg-primary/20 text-primary"
              )}
              onClick={() => setDebugOpen(!debugOpen)}
            >
              <Terminal className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-primary/10"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div 
        className="container mx-auto p-4 space-y-6"
        style={{ 
          paddingBottom: debugOpen ? (debugMinimized ? 60 : debugHeight + 60) : 24 
        }}
      >
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className={cn(
            "lg:col-span-1 space-y-4",
            "lg:block",
            sidebarOpen ? "block" : "hidden"
          )}>
            {/* Quick Controls */}
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MonitorSpeaker className="h-5 w-5 text-primary" />
                  System Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    className="w-full bg-primary hover:bg-primary/90 shadow-sm"
                    disabled={systemStatus === 'RUNNING' || !connected || !esp32Connected}
                    onClick={() => handleCommand(systemStatus === 'PAUSED' ? 'RESUME' : 'PLAY')}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    {systemStatus === 'PAUSED' ? 'Resume' : 'Start'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full hover:bg-yellow-50 hover:border-yellow-300"
                    disabled={systemStatus !== 'RUNNING'}
                    onClick={() => handleCommand('PAUSE')}
                  >
                    <PauseCircle className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="w-full shadow-sm"
                  disabled={systemStatus === 'IDLE'}
                  onClick={() => handleCommand('STOP')}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </CardContent>
            </Card>

            {/* Status Display */}
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDisplay
                  esp32Connected={esp32Connected}
                  hasScript={hasScript}
                  isRunning={isRunning}
                  isPaused={systemStatus === 'PAUSED'}
                  currentCommandIndex={currentCommandIndex}
                  totalCommands={totalCommands}
                />
              </CardContent>
            </Card>

            {/* Speed Controls */}
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Speed Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SpeedPanel
                  axes={axisConfig}
                  globalSpeed={globalSpeed}
                  onGlobalSpeedChange={handleGlobalSpeedChange}
                  onAxisSpeedChange={handleAxisSpeedChange}
                  onSetAllSpeeds={async () => {
                    // Apply global speed to all axes
                    await handleGlobalSpeedChange(globalSpeed)
                  }}
                  onSetAxisSpeed={async (axisId: string) => {
                    // Apply individual axis speed
                    const axis = axisConfig.find(a => a.id === axisId)
                    if (axis) {
                      await handleAxisSpeedChange(axisId, axis.speed)
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm">
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <CardHeader className="border-b bg-muted/30">
                  <TabsList className="grid w-full grid-cols-3 bg-background/50">
                    <TabsTrigger 
                      value="editor" 
                      className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Code className="h-4 w-4" />
                      Script Editor
                    </TabsTrigger>
                    <TabsTrigger 
                      value="simulation"
                      className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Layers3 className="h-4 w-4" />
                      Simulation
                    </TabsTrigger>
                    <TabsTrigger 
                      value="system"
                      className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      Configuration
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="p-0">
                  <TabsContent value="editor" className="m-0 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground">Script Editor</h2>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          Advanced Mode
                        </Badge>
                      </div>
                      <Separator />
                      <CommandEditor 
                        onNotification={addNotification}
                        onCompileOutput={setCompileOutput}
                        simulationMode={simulationMode}
                        onSimulationModeChange={setSimulationMode}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="simulation" className="m-0 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground">Hardware Simulation</h2>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={enhancedSimulation ? 'default' : 'outline'}
                            onClick={() => {
                              console.log('Toggle enhanced simulation:', !enhancedSimulation)
                              setEnhancedSimulation(!enhancedSimulation)
                            }}
                          >
                            {enhancedSimulation ? '🚀 Enhanced Mode' : '⚡ Basic Mode'}
                          </Button>
                          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
                            Virtual Mode
                          </Badge>
                        </div>
                      </div>
                      <Separator />
                      {enhancedSimulation ? (
                        <div>
                          <div className="mb-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            🚀 Enhanced Simulation Mode Active
                          </div>
                          <EnhancedSimulationInterface />
                        </div>
                      ) : (
                        <div>
                          <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            ⚡ Basic Simulation Mode Active
                          </div>
                          <SimulationInterface />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="system" className="m-0 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground">System Configuration</h2>
                        <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground">
                          Settings
                        </Badge>
                      </div>
                      <Separator />
                      <SystemControls
                        onCommand={handleCommand}
                        disabled={!connected || !esp32Connected}
                      />
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-card/30 to-primary/5 backdrop-blur hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{executedCommands}</div>
              </div>
              <p className="text-xs text-muted-foreground">Executed Commands</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-card/30 to-primary/5 backdrop-blur hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{executionTime}</div>
              </div>
              <p className="text-xs text-muted-foreground">Execution Time</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-card/30 to-primary/5 backdrop-blur hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{connectedAxes}</div>
              </div>
              <p className="text-xs text-muted-foreground">Connected Axes</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-card/30 to-primary/5 backdrop-blur hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{efficiency}%</div>
              </div>
              <p className="text-xs text-muted-foreground">Efficiency</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onNotification={addNotification}
      />

      {/* Debug Overlay */}
      <DebugOverlay
        isOpen={debugOpen}
        onClose={() => setDebugOpen(false)}
        compileOutput={compileOutput}
        onHeightChange={setDebugHeight}
        onMinimizedChange={setDebugMinimized}
      />
    </div>
  )
}