'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, FileText, Play, Cpu, CheckCircle, AlertCircle, Loader2, Zap, Code2, FileSpreadsheet } from "lucide-react"
import { api } from "@/lib/api"
import { TextEditor, SpreadsheetEditor } from "./editors"
import { ScriptEngine } from "@/lib/script-engine"
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
  const [activeTab, setActiveTab] = useState("editor")
  const [editorMode, setEditorMode] = useState<'text' | 'spreadsheet'>('text')
  const [commandText, setCommandText] = useState('')
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [autoCompile, setAutoCompile] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  
  // Initialize Script Engine
  const scriptEngine = ScriptEngine.getInstance()

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
    const textToCompile = scriptText || commandText
    if (!textToCompile.trim()) {
      setCompilationResult(null)
      return
    }

    setIsCompiling(true)
    try {
      const result = await api.saveScript(textToCompile)
      setCompilationResult({
        success: result.success,
        commands: [],
        error: result.error,
        commandCount: result.commandCount || 0
      })
      
      // Send compile output to debug overlay
      const output = result.success 
        ? `✅ Compilation successful!\n\nGenerated ${result.commandCount} commands\nScript ID: ${result.scriptId}\n\nCompiled script:\n${textToCompile}`
        : `❌ Compilation failed!\n\nError: ${result.error}\n\nInput script:\n${textToCompile}`
      
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
      onCompileOutput?.(
        `❌ Compilation error!\n\nError: ${errorMsg}\n\nInput script:\n${textToCompile}\n\n💡 Solution: Check system connection and try again`
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
    if (autoCompile && commandText.trim()) {
      const timeoutId = setTimeout(() => {
        handleCompile()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [commandText, autoCompile, handleCompile])

  const handleExecuteScript = async () => {
    if (!commandText.trim()) {
      onNotification?.('No script to execute', 'warning')
      return
    }

    setIsExecuting(true)
    try {
      const result = await api.executeScript(commandText)
      
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
    const blob = new Blob([commandText], { type: 'text/plain' })
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
      await api.saveCommands(commandText)
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="editor" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Code2 className="w-4 h-4 mr-2" />
            Script Editor
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6 mt-6">
          {/* Editor Controls */}
          <Card className="border-0 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Modern Script Language</CardTitle>
                <div className="flex items-center gap-4">
                  {/* Editor Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Editor Mode</span>
                    <div className="flex bg-muted rounded-lg p-1">
                      <Button
                        size="sm"
                        variant={editorMode === 'text' ? "default" : "ghost"}
                        onClick={() => setEditorMode('text')}
                        className="h-7 px-2 text-xs"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Text
                      </Button>
                      <Button
                        size="sm"
                        variant={editorMode === 'spreadsheet' ? "default" : "ghost"}
                        onClick={() => setEditorMode('spreadsheet')}
                        className="h-7 px-2 text-xs"
                      >
                        <FileSpreadsheet className="w-3 h-3 mr-1" />
                        Table
                      </Button>
                    </div>
                  </div>
                  
                  {/* Auto-compile toggle (only for text mode) */}
                  {editorMode === 'text' && (
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
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editorMode === 'text' && (
                <TextEditor
                  value={commandText}
                  onChange={setCommandText}
                />
              )}
              
              {editorMode === 'spreadsheet' && (
                <SpreadsheetEditor
                  onScriptGenerated={(script) => {
                    setCommandText(script)
                    handleCompile(script)
                    // Send compile output to debug overlay
                    onCompileOutput?.(script)
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleCompile}
              disabled={isCompiling || !commandText.trim()}
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
        </TabsContent>

        <TabsContent value="actions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Operations */}
            <Card className="border-0 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  File Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Load from File
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSaveToFile}
                  className="w-full justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save to File
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveToMemory}
                  className="w-full justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Save to Memory
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLoadFromMemory}
                  className="w-full justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Load from Memory
                </Button>
              </CardContent>
            </Card>

            {/* Script Operations */}
            <Card className="border-0 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Script Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleCompile}
                  disabled={isCompiling || !commandText.trim()}
                  className="w-full justify-start bg-primary hover:bg-primary/90"
                >
                  {isCompiling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Cpu className="w-4 h-4 mr-2" />
                  )}
                  Compile Script
                </Button>

                <Button
                  onClick={handleExecuteScript}
                  disabled={isExecuting || !compilationResult?.success || connectionStatus !== 'connected'}
                  variant="outline"
                  className="w-full justify-start hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Execute Script
                </Button>

                <Button
                  onClick={handleCompileAndExecute}
                  disabled={isCompiling || isExecuting || !commandText.trim() || connectionStatus !== 'connected'}
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  {isCompiling || isExecuting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Compile & Execute
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Script Examples */}
          <Card className="border-0 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Quick Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCommandText('X1000\nY2000\nZ500')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Basic Commands
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCommandText('X1000 Y2000 F1500\nSYNC\nX0 Y0 F3000')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  With Speed & Sync
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCommandText('GROUP X1000 Y2000 Z500\nSYNC\nGROUP X0 Y0 Z0')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Group Movements
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCommandText('FUNC pickup\n  Z-100\n  G1\n  Z100\nENDFUNC\n\nCALL pickup')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Function Example
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCommandText('LOOP 5\n  X100\n  Y100\n  X0\n  Y0\nENDLOOP')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Loop Example
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCommandText('// Palletizing Pattern\nFUNC place_item\n  X1000 Y1500 F2000\n  Z-50\n  G0  // Release gripper\n  Z50\nENDFUNC\n\nLOOP 3\n  LOOP 4\n    CALL place_item\n    X1200  // Move 200mm\n  ENDLOOP\n  X0\n  Y1650  // Next row\nENDLOOP')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Palletizing Pattern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCommandText('// Advanced Sequence\nFUNC home_all\n  GROUP X0 Y0 Z0 T0 G0\n  SYNC\nENDFUNC\n\nFUNC safety_check\n  // Check all axes\n  X1 Y1 Z1  // Test movement\n  X0 Y0 Z0  // Return home\nENDFUNC\n\nCALL safety_check\nCALL home_all')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Safety & Homing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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