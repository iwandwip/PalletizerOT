'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Wifi, WifiOff, Terminal, Eye, EyeOff } from "lucide-react"
import SystemControls from '@/components/system-controls'
import SpeedPanel from '@/components/speed-panel'
import CommandEditor from '@/components/command-editor'
import StatusDisplay from '@/components/status-display'
import DebugTerminal from '@/components/debug-terminal'
import { api } from '@/lib/api'
import { Axis } from '@/lib/types'

interface ErrorNotification {
  id: string
  message: string
  type: 'error' | 'warning' | 'info'
}

interface Position {
  X: number;
  Y: number;
  Z: number;
  T: number;
  G: number;
}

export default function PalletizerControl() {
  const [axes, setAxes] = useState<Axis[]>([
    { id: 'x', name: 'X', speed: 1000 },
    { id: 'y', name: 'Y', speed: 1000 },
    { id: 'z', name: 'Z', speed: 1000 },
    { id: 't', name: 'T', speed: 1000 },
    { id: 'g', name: 'G', speed: 1000 },
  ])
  
  const [globalSpeed, setGlobalSpeed] = useState(1000)
  const [commandText, setCommandText] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [errors, setErrors] = useState<ErrorNotification[]>([])
  const [showDebugTerminal, setShowDebugTerminal] = useState(true)
  
  // Server connection state
  const [connected, setConnected] = useState(false)
  const [esp32Connected, setEsp32Connected] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<Position>({ X: 0, Y: 0, Z: 0, T: 0, G: 0 })
  const [systemStatus, setSystemStatus] = useState<string>('IDLE')
  const [queueLength, setQueueLength] = useState(0)
  
  // Debug terminal state
  const [debugMessages, setDebugMessages] = useState<string[]>([])

  useEffect(() => {
    // Setup WebSocket event listeners
    api.on('status', handleStatusUpdate)
    api.on('position', handlePositionUpdate)
    api.on('error', handleErrorUpdate)
    api.on('esp32_connected', () => {
      setEsp32Connected(true)
      addDebugMessage('ESP32 connected')
    })
    api.on('esp32_disconnected', () => {
      setEsp32Connected(false)
      addDebugMessage('ESP32 disconnected')
    })

    // Check initial connection status
    checkServerStatus()
    
    // Setup periodic status check
    const statusInterval = setInterval(checkServerStatus, 5000)

    return () => {
      clearInterval(statusInterval)
      // Note: We don't disconnect WebSocket here as it's managed by api
    }
  }, [])

  const handleStatusUpdate = (data: any) => {
    setSystemStatus(data.status || 'IDLE')
    setQueueLength(data.queue || 0)
    addDebugMessage(`Status: ${data.status}, Queue: ${data.queue}`)
  }

  const handlePositionUpdate = (data: any) => {
    setCurrentPosition(data.position)
    addDebugMessage(`Position: X${data.position.X} Y${data.position.Y} Z${data.position.Z} T${data.position.T} G${data.position.G}`)
  }

  const handleErrorUpdate = (data: any) => {
    addError(data.error, 'error')
    addDebugMessage(`Error: ${data.error}`)
  }

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-100)) // Keep last 100 messages
  }

  const checkServerStatus = async () => {
    try {
      const ping = await api.ping()
      setConnected(ping)
      
      if (ping) {
        const status = await api.getStatus()
        setEsp32Connected(status.esp32Connected)
        setCurrentPosition(status.currentPosition)
        setSystemStatus(status.systemStatus)
        setQueueLength(status.queueLength)
      }
    } catch (error) {
      setConnected(false)
      setEsp32Connected(false)
    }
  }

  const addError = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const error: ErrorNotification = {
      id: Date.now().toString(),
      message,
      type
    }
    setErrors(prev => [...prev, error])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeError(error.id)
    }, 5000)
  }

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id))
  }

  const handleCommand = async (command: string) => {
    try {
      addDebugMessage(`Sending command: ${command}`)
      
      switch (command) {
        case 'PLAY':
          await api.play()
          break
        case 'PAUSE':
          await api.pause()
          break
        case 'STOP':
          await api.stop()
          break
        case 'HOME':
          await api.home()
          break
        case 'ZERO':
          await api.zero()
          break
        default:
          await api.sendCommand(command)
      }
      
      addDebugMessage(`Command executed: ${command}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Command failed'
      addError(errorMsg)
      addDebugMessage(`Command failed: ${errorMsg}`)
      throw error
    }
  }

  const handleSpeedChange = async (axisId: string, speed: number) => {
    const updatedAxes = axes.map(axis =>
      axis.id === axisId ? { ...axis, speed } : axis
    )
    setAxes(updatedAxes)

    try {
      await api.setSpeed({ [axisId.toUpperCase()]: speed })
      addDebugMessage(`Speed updated: ${axisId.toUpperCase()}=${speed}`)
    } catch (error) {
      addError(`Failed to set speed for ${axisId.toUpperCase()}`)
    }
  }

  const handleGlobalSpeedChange = async (speed: number) => {
    setGlobalSpeed(speed)
    const speedObj: any = {}
    axes.forEach(axis => {
      speedObj[axis.name] = speed
    })
    
    const updatedAxes = axes.map(axis => ({ ...axis, speed }))
    setAxes(updatedAxes)

    try {
      await api.setSpeed(speedObj)
      addDebugMessage(`Global speed updated: ${speed}`)
    } catch (error) {
      addError('Failed to set global speed')
    }
  }

  const handleSaveCommands = async () => {
    try {
      await api.saveCommands(commandText)
      addDebugMessage('Commands saved to local storage')
    } catch (error) {
      addError('Failed to save commands')
    }
  }

  const handleLoadCommands = async () => {
    try {
      const commands = await api.loadCommands()
      setCommandText(commands)
      addDebugMessage('Commands loaded from local storage')
    } catch (error) {
      addError('Failed to load commands')
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      const result = await api.uploadFile(file)
      addDebugMessage(`File uploaded: ${file.name}`)
    } catch (error) {
      addError(`Failed to upload file: ${file.name}`)
    }
  }

  const handleExecuteScript = async () => {
    if (!commandText.trim()) {
      addError('No script to execute')
      return
    }

    try {
      const result = await api.executeScript(commandText)
      if (result.success) {
        addDebugMessage(`Script executed: ${result.commandCount} commands queued`)
      } else {
        addError(result.error || 'Script execution failed')
      }
    } catch (error) {
      addError('Failed to execute script')
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Error notifications */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
          {errors.map((error) => (
            <Alert 
              key={error.id} 
              variant={error.type === 'error' ? 'destructive' : 'default'}
              className="relative"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="pr-8">
                {error.message}
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeError(error.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Alert>
          ))}
        </div>
      )}

      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Palletizer Control System
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Server-Based Architecture
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                connected ? 'text-green-600' : 'text-red-600'
              }`}>
                Server {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Dark mode toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? '☀️' : '🌙'}
            </Button>

            {/* Debug terminal toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebugTerminal(!showDebugTerminal)}
            >
              {showDebugTerminal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <Terminal className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* System Controls */}
            <Card>
              <CardHeader>
                <CardTitle>System Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <SystemControls
                  onCommand={handleCommand}
                  disabled={!connected || !esp32Connected}
                />
              </CardContent>
            </Card>

            {/* Speed Control */}
            <Card>
              <CardHeader>
                <CardTitle>Speed Control</CardTitle>
              </CardHeader>
              <CardContent>
                <SpeedPanel
                  axes={axes}
                  globalSpeed={globalSpeed}
                  onSpeedChange={handleSpeedChange}
                  onGlobalSpeedChange={handleGlobalSpeedChange}
                  disabled={!connected || !esp32Connected}
                />
              </CardContent>
            </Card>

            {/* Status Display */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDisplay
                  position={currentPosition}
                  systemStatus={systemStatus}
                  esp32Connected={esp32Connected}
                  queueLength={queueLength}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Command Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Script Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <CommandEditor
                  commandText={commandText}
                  onCommandTextChange={setCommandText}
                  onSaveCommands={handleSaveCommands}
                  onLoadCommands={handleLoadCommands}
                  onUploadFile={handleUploadFile}
                  onExecute={handleExecuteScript}
                />
              </CardContent>
            </Card>

            {/* Debug Terminal */}
            {showDebugTerminal && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Debug Terminal
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDebugMessages([])}
                      className="ml-auto"
                    >
                      Clear
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-sm h-64 overflow-y-auto">
                    {debugMessages.length === 0 ? (
                      <div className="text-gray-500">No messages yet...</div>
                    ) : (
                      debugMessages.map((message, index) => (
                        <div key={index} className="whitespace-pre-wrap">
                          {message}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}