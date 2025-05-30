'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Wifi, WifiOff } from "lucide-react"
import SystemControls from '@/components/system-controls'
import SpeedPanel from '@/components/speed-panel'
import CommandEditor from '@/components/command-editor'
import StatusDisplay from '@/components/status-display'
import DebugTerminal from '@/components/debug-terminal'
import { useSystemStatus, useTimeoutConfig, useTimeoutStats, useRealtime } from '@/lib/hooks'
import { api } from '@/lib/api'
import { Axis } from '@/lib/types'

interface ErrorNotification {
  id: string
  message: string
  type: 'error' | 'warning' | 'info'
}

export default function PalletizerControl() {
  const [axes, setAxes] = useState<Axis[]>([
    { id: 'x', name: 'X', speed: 200 },
    { id: 'y', name: 'Y', speed: 200 },
    { id: 'z', name: 'Z', speed: 200 },
    { id: 't', name: 'T', speed: 200 },
    { id: 'g', name: 'G', speed: 364 },
  ])
  
  const [globalSpeed, setGlobalSpeed] = useState(200)
  const [commandText, setCommandText] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [errors, setErrors] = useState<ErrorNotification[]>([])
  const [showDebugTerminal, setShowDebugTerminal] = useState(true)

  const { status, setStatus, sendCommand } = useSystemStatus()
  const { config: timeoutConfig, setConfig: setTimeoutConfig, saveConfig } = useTimeoutConfig()
  const { stats: timeoutStats, loadStats, clearStats } = useTimeoutStats()
  const { connected, lastEvent } = useRealtime()

  const addError = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const id = Date.now().toString()
    setErrors(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setErrors(prev => prev.filter(err => err.id !== id))
    }, 5000)
  }

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(err => err.id !== id))
  }

  useEffect(() => {
    if (!connected) {
      addError('ESP32 disconnected - Check device connection', 'warning')
    }
  }, [connected])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme === 'dark'
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.type === 'status' && lastEvent.value) {
        setStatus(lastEvent.value as any)
      } else if (lastEvent.type === 'timeout') {
        loadStats()
      }
    }
  }, [lastEvent, setStatus, loadStats])

  const handleToggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newMode)
  }

  const handleGlobalSpeedChange = (speed: number) => {
    setGlobalSpeed(speed)
    setAxes(prev => prev.map(axis => 
      axis.id !== 'g' ? { ...axis, speed } : axis
    ))
  }

  const handleAxisSpeedChange = (axisId: string, speed: number) => {
    setAxes(prev => prev.map(axis => 
      axis.id === axisId ? { ...axis, speed } : axis
    ))
  }

  const handleSetAllSpeeds = async () => {
    try {
      await sendCommand(`SPEED;${globalSpeed}`)
      addError('All speeds set successfully', 'info')
    } catch (error) {
      addError('Failed to set speeds - ESP32 connection error', 'error')
    }
  }

  const handleSetAxisSpeed = async (axisId: string) => {
    try {
      const axis = axes.find(a => a.id === axisId)
      if (axis) {
        await sendCommand(`SPEED;${axisId};${axis.speed}`)
        addError(`${axisId.toUpperCase()} axis speed set to ${axis.speed}`, 'info')
      }
    } catch (error) {
      addError(`Failed to set ${axisId.toUpperCase()} speed - ESP32 connection error`, 'error')
    }
  }

  const handleSaveCommands = async () => {
    try {
      await api.saveCommands(commandText)
      addError('Commands saved successfully', 'info')
    } catch (error) {
      addError('Failed to save commands - ESP32 connection error', 'error')
    }
  }

  const handleLoadCommands = async () => {
    try {
      const commands = await api.loadCommands()
      setCommandText(commands)
      addError('Commands loaded successfully', 'info')
    } catch (error) {
      addError('Failed to load commands - ESP32 connection error', 'error')
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      await api.uploadFile(file)
      addError('File uploaded successfully', 'info')
    } catch (error) {
      addError('Failed to upload file - ESP32 connection error', 'error')
    }
  }

  const handleSaveTimeoutConfig = async () => {
    try {
      await saveConfig()
      addError('Timeout configuration saved', 'info')
    } catch (error) {
      addError('Failed to save timeout config - ESP32 connection error', 'error')
    }
  }

  const handleCommandSend = async (command: string) => {
    try {
      await sendCommand(command)
      addError(`Command sent: ${command}`, 'info')
    } catch (error) {
      addError(`Failed to send ${command} - ESP32 connection error`, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-80">
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {errors.map((error) => (
          <Alert
            key={error.id}
            variant={error.type === 'error' ? 'destructive' : 'default'}
            className="shadow-lg"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeError(error.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </div>

      <div className="container mx-auto p-4 space-y-6 max-w-6xl">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl font-bold">ESP32 Palletizer Control</h1>
            <div className="flex items-center gap-1">
              {connected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">Modern robotics control interface</p>
        </header>

        {!connected && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <strong>ESP32 Device Disconnected</strong> - Please check your device connection and network settings.
              Some features may not work properly.
            </AlertDescription>
          </Alert>
        )}

        <StatusDisplay
          status={status}
          connected={connected}
          timeoutStats={timeoutStats}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              System Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SystemControls
              onCommand={handleCommandSend}
              disabled={!connected}
            />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Speed Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedPanel
                axes={axes}
                globalSpeed={globalSpeed}
                onGlobalSpeedChange={handleGlobalSpeedChange}
                onAxisSpeedChange={handleAxisSpeedChange}
                onSetAllSpeeds={handleSetAllSpeeds}
                onSetAxisSpeed={handleSetAxisSpeed}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Command Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommandEditor
                commandText={commandText}
                onCommandTextChange={setCommandText}
                onSaveCommands={handleSaveCommands}
                onLoadCommands={handleLoadCommands}
                onUploadFile={handleUploadFile}
                timeoutConfig={timeoutConfig}
                onTimeoutConfigChange={setTimeoutConfig}
                onSaveTimeoutConfig={handleSaveTimeoutConfig}
              />
            </CardContent>
          </Card>
        </div>

        <footer className="text-center text-sm text-muted-foreground py-4">
          ESP32 Palletizer System - Built with Next.js & shadcn/ui
        </footer>
      </div>

      {showDebugTerminal && <DebugTerminal />}
    </div>
  )
}