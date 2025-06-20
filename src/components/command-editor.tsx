'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, FileText, Play, Cpu, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { TextEditor } from "./editors"
import { cn } from "@/lib/utils"

interface CompilationResult {
  success: boolean;
  commands?: unknown[];
  error?: string;
  commandCount?: number;
}

interface CommandEditorProps {
  onNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
  onCompileOutput?: (output: string) => void
}

export function CommandEditor({ onNotification, onCompileOutput }: CommandEditorProps) {
  const [commandText, setCommandText] = useState('')
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [autoCompile, setAutoCompile] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const checkConnectionStatus = async () => {
    try {
      const status = await api.getStatus()
      setConnectionStatus(status.esp32Connected ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus('disconnected')
      // Show notification only once when server goes offline
      if (connectionStatus !== 'disconnected') {
        onNotification?.('🔌 Control system disconnected', 'warning')
      }
    }
  }

  const handleCompile = useCallback(async (scriptText?: string) => {
    // Ensure we're working with a string
    let textToCompile = ''
    if (scriptText !== undefined) {
      textToCompile = typeof scriptText === 'string' ? scriptText : String(scriptText)
    } else {
      textToCompile = typeof commandText === 'string' ? commandText : String(commandText)
    }
    
    console.log('Compile debug:', { scriptText, commandText, textToCompile, type: typeof commandText })
    
    if (!textToCompile.trim()) {
      setCompilationResult(null)
      return
    }

    setIsCompiling(true)
    try {
      const result = await api.saveScript(textToCompile)
      console.log('API response:', result)
      
      setCompilationResult({
        success: result.success,
        commands: [],
        error: result.error,
        commandCount: result.commandCount || 0
      })
      
      // Send compile output to debug overlay
      const scriptForOutput = typeof textToCompile === 'string' ? textToCompile : JSON.stringify(textToCompile)
      let output = ''
      
      if (result.success) {
        // Format the compiled data as text commands
        let textOutput = ''
        if (result.compiledData) {
          const data = result.compiledData as any
          if (data.format === 'text' && data.textCommands) {
            textOutput = `📋 Generated Text Commands:\n${data.textCommands}`
          } else {
            textOutput = `📋 Generated Commands:\n${JSON.stringify(result.compiledData, null, 2)}`
          }
        }
        
        output = `✅ Compilation successful!\n\nGenerated ${result.commandCount} commands\nScript ID: ${result.scriptId}\n\nInput script:\n${scriptForOutput}\n\n${textOutput}`
      } else {
        output = `❌ Compilation failed!\n\nError: ${result.error}\n\nInput script:\n${scriptForOutput}`
      }
      
      onCompileOutput?.(output)
      
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : 'Compilation failed'
      
      // Check if it's a network error (server not running)
      if (errorMsg.includes('fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
        errorMsg = 'Control system is not running - Please check the system connection'
        onNotification?.('⚠️ Control system is not running. Please check your connection.', 'warning')
      }
      
      setCompilationResult({
        success: false,
        error: errorMsg,
        commandCount: 0
      })
      
      // Send error to debug overlay
      const scriptForError = typeof textToCompile === 'string' ? textToCompile : JSON.stringify(textToCompile)
      onCompileOutput?.(
        `❌ Compilation error!\n\nError: ${errorMsg}\n\nInput script:\n${scriptForError}\n\n💡 Solution: Check system connection and try again`
      )
    } finally {
      setIsCompiling(false)
    }
  }, [commandText, onCompileOutput])

  // Check connection status periodically
  useEffect(() => {
    checkConnectionStatus()
    const interval = setInterval(checkConnectionStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  // Auto-compile when text changes
  useEffect(() => {
    const textToCheck = (commandText || '').toString()
    if (autoCompile && textToCheck.trim()) {
      const timeoutId = setTimeout(() => {
        handleCompile()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [commandText, autoCompile, handleCompile])

  const handleExecuteScript = async () => {
    const scriptToExecute = (commandText || '').toString()
    if (!scriptToExecute.trim()) {
      onNotification?.('No script to execute', 'warning')
      return
    }

    setIsExecuting(true)
    try {
      const result = await api.executeScript(scriptToExecute)
      
      if (result.success) {
        onNotification?.('Script executed successfully', 'success')
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Script execution error'
      onNotification?.(errorMsg, 'error')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCompileAndExecute = async () => {
    await handleCompile()
    
    // Wait a bit for compilation to complete, then execute if successful
    setTimeout(() => {
      if (compilationResult?.success) {
        handleExecuteScript()
      }
    }, 500)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCommandText(content)
        onNotification?.(`File ${file.name} loaded successfully`, 'success')
      }
      reader.readAsText(file)
    }
  }

  const handleSaveToFile = () => {
    const scriptToSave = (commandText || '').toString()
    const blob = new Blob([scriptToSave], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `palletizer_script_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onNotification?.('Script saved to file', 'success')
  }

  const handleSaveToMemory = async () => {
    try {
      const scriptToSave = (commandText || '').toString()
      await api.saveCommands(scriptToSave)
      onNotification?.('Script saved to memory', 'success')
    } catch {
      onNotification?.('Failed to save script', 'error')
    }
  }

  const handleLoadFromMemory = async () => {
    try {
      const commands = await api.loadCommands()
      setCommandText(commands)
      onNotification?.('Script loaded from memory', 'success')
    } catch {
      onNotification?.('Failed to load script', 'error')
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-red-500'
      case 'connecting': return 'bg-yellow-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Device Connected'
      case 'disconnected': return 'Control System Offline'
      case 'connecting': return 'Connecting...'
    }
  }

  return (
    <div className="space-y-6">
          {/* Text Editor */}
          <Card className="border-0 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Modern Script Language</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto-compile</span>
                  <Button
                    size="sm"
                    variant={autoCompile ? "default" : "outline"}
                    onClick={() => setAutoCompile(!autoCompile)}
                    className="h-7 px-3 text-xs"
                  >
                    {autoCompile ? "ON" : "OFF"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TextEditor
                value={commandText}
                onChange={setCommandText}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => handleCompile()}
              disabled={isCompiling || !(commandText && commandText.toString().trim())}
              variant="outline"
              className="h-12 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
            >
              {isCompiling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cpu className="w-4 h-4" />
              )}
              <span className="text-xs">Compile</span>
            </Button>

            <Button
              onClick={handleExecuteScript}
              disabled={isExecuting || !compilationResult?.success || connectionStatus !== 'connected'}
              className="h-12 flex-col gap-1 bg-primary hover:bg-primary/90"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="text-xs">Execute</span>
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-12 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
            >
              <Upload className="w-4 h-4" />
              <span className="text-xs">Load</span>
            </Button>

            <Button
              onClick={handleSaveToFile}
              variant="outline"
              className="h-12 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">Save</span>
            </Button>
          </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.script"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}