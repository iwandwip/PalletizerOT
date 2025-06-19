'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  AlertTriangle, 
  X, 
  Terminal, 
  Eye, 
  EyeOff, 
  Menu,
  Play,
  Pause,
  Square
} from "lucide-react"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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
    } catch {
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
      addDebugMessage(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleLoadCommands = async () => {
    try {
      const commands = await api.loadCommands()
      setCommandText(commands)
      addDebugMessage('Commands loaded from local storage')
    } catch {
      addError('Failed to load commands')
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      await api.uploadFile(file)
      addDebugMessage(`File uploaded: ${file.name}`)
      addError('File uploaded and compiled successfully', 'info')
    } catch {
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
    } catch {
      addError('Failed to compile script')
    }
  }

  const StatusBar = () => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            {connected ? 'Server Online' : 'Server Offline'}
          </span>
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            esp32Connected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            ESP32 {esp32Connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {hasScript && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
              {isRunning ? 'Running' : 'Ready'} 
              {totalCommands > 0 && ` (${currentCommandIndex}/${totalCommands})`}
            </Badge>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDebugTerminal(!showDebugTerminal)}
          className="hidden md:flex"
        >
          {showDebugTerminal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <Terminal className="w-4 h-4 ml-1" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? '☀️' : '🌙'}
        </Button>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <MobileSidebar 
              onCommand={handleCommand}
              connected={connected}
              esp32Connected={esp32Connected}
              hasScript={hasScript}
              isRunning={isRunning}
              currentCommandIndex={currentCommandIndex}
              totalCommands={totalCommands}
              onClose={() => setMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )

  const MobileSidebar = ({ 
    onCommand, 
    connected, 
    esp32Connected, 
    hasScript, 
    isRunning, 
    currentCommandIndex, 
    totalCommands,
    onClose 
  }: {
    onCommand: (command: string) => void
    connected: boolean
    esp32Connected: boolean
    hasScript: boolean
    isRunning: boolean
    currentCommandIndex: number
    totalCommands: number
    onClose: () => void
  }) => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">System Controls</h2>
        <div className="mt-4 space-y-2">
          <Button
            onClick={() => { onCommand('PLAY'); onClose() }}
            disabled={!connected || !esp32Connected || !hasScript}
            className="w-full justify-start"
            variant={isRunning ? "secondary" : "default"}
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Playing' : 'Play'}
          </Button>
          
          <Button
            onClick={() => { onCommand('PAUSE'); onClose() }}
            disabled={!connected || !esp32Connected || !isRunning}
            className="w-full justify-start"
            variant="outline"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          
          <Button
            onClick={() => { onCommand('STOP'); onClose() }}
            disabled={!connected || !esp32Connected}
            className="w-full justify-start"
            variant="destructive"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold">System Status</h2>
        <div className="mt-4">
          <StatusDisplay
            esp32Connected={esp32Connected}
            hasScript={hasScript}
            isRunning={isRunning}
            currentCommandIndex={currentCommandIndex}
            totalCommands={totalCommands}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold">Debug Terminal</h2>
        <Button
          onClick={() => { setShowDebugTerminal(!showDebugTerminal); onClose() }}
          className="w-full justify-start mt-2"
          variant="outline"
        >
          {showDebugTerminal ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showDebugTerminal ? 'Hide' : 'Show'} Terminal
        </Button>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Toast Notifications */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {errors.map((error) => (
            <Alert 
              key={error.id} 
              variant={error.type === 'error' ? 'destructive' : 'default'}
              className="relative shadow-lg"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="pr-8 text-sm">
                {error.message}
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => removeError(error.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Alert>
          ))}
        </div>
      )}

      {/* Status Bar */}
      <StatusBar />

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 bg-white dark:bg-gray-800 border-r overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Palletizer Control
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                HTTP-Based Architecture
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-4">System Controls</h2>
              <SystemControls
                onCommand={handleCommand}
                disabled={!connected || !esp32Connected}
              />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-4">System Status</h2>
              <StatusDisplay
                esp32Connected={esp32Connected}
                hasScript={hasScript}
                isRunning={isRunning}
                currentCommandIndex={currentCommandIndex}
                totalCommands={totalCommands}
              />
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 lg:p-6">
            <CommandEditor
              commandText={commandText}
              onCommandTextChange={setCommandText}
              onSaveCommands={handleSaveCommands}
              onLoadCommands={handleLoadCommands}
              onUploadFile={handleUploadFile}
              onExecute={handleExecuteScript}
            />
          </div>

          {/* Debug Terminal */}
          {showDebugTerminal && (
            <div className="border-t bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span className="font-medium">Debug Terminal</span>
                  <Badge variant="outline" className="text-xs">
                    {debugMessages.length} messages
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDebugMessages([])}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebugTerminal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-black text-green-400 p-3 rounded font-mono text-xs lg:text-sm h-48 overflow-y-auto">
                {debugMessages.length === 0 ? (
                  <div className="text-gray-500">No messages yet...</div>
                ) : (
                  debugMessages.map((message, index) => (
                    <div key={index} className="whitespace-pre-wrap break-all">
                      {message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}