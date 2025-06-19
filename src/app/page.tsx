'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Wifi, WifiOff, Terminal, Eye, EyeOff } from "lucide-react"
import SystemControls from '@/components/system-controls'
import CommandEditor from '@/components/command-editor'
import StatusDisplay from '@/components/status-display'
import { api } from '@/lib/api'

interface ErrorNotification {
  id: string
  message: string
  type: 'error' | 'warning' | 'info'
}

export default function PalletizerControl() {
  const [commandText, setCommandText] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [errors, setErrors] = useState<ErrorNotification[]>([])
  const [showDebugTerminal, setShowDebugTerminal] = useState(true)
  
  const [connected, setConnected] = useState(false)
  const [esp32Connected, setEsp32Connected] = useState(false)
  const [hasScript, setHasScript] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0)
  const [totalCommands, setTotalCommands] = useState(0)
  
  const [debugMessages, setDebugMessages] = useState<string[]>([])

  useEffect(() => {
    checkServerStatus()
    const statusInterval = setInterval(checkServerStatus, 3000)
    return () => clearInterval(statusInterval)
  }, [])

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-100))
  }

  const checkServerStatus = async () => {
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
          await api.start()
          break
        case 'PAUSE':
          await api.pause()
          break
        case 'STOP':
          await api.stop()
          break
        case 'RESUME':
          await api.resume()
          break
        default:
          addError(`Unknown command: ${command}`)
          return
      }
      
      addDebugMessage(`Command executed: ${command}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Command failed'
      addError(errorMsg)
      addDebugMessage(`Command failed: ${errorMsg}`)
    }
  }

  const handleSaveCommands = async () => {
    try {
      const result = await api.saveCommands(commandText)
      addDebugMessage(result)
      addError('Script compiled and saved successfully', 'info')
    } catch (error) {
      addError('Failed to save commands')
      addDebugMessage(`Save failed: ${error}`)
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
      addError('File uploaded and compiled successfully', 'info')
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
        addDebugMessage(`Script compiled: ${result.commandCount} commands`)
        addError(`Script compiled: ${result.commandCount} commands ready`, 'info')
      } else {
        addError(result.error || 'Script compilation failed')
      }
    } catch (error) {
      addError('Failed to compile script')
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Palletizer Control System
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              HTTP-Based Architecture
            </p>
          </div>
          
          <div className="flex items-center gap-4">
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? '☀️' : '🌙'}
            </Button>

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
          <div className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDisplay
                  esp32Connected={esp32Connected}
                  hasScript={hasScript}
                  isRunning={isRunning}
                  currentCommandIndex={currentCommandIndex}
                  totalCommands={totalCommands}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
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