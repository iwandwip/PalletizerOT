'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, FileText, Play, Cpu, CheckCircle, AlertCircle, Loader2, Blocks, Zap, Code2, Clock, FileSpreadsheet } from "lucide-react"
import { api } from "@/lib/api"
import { BlockEditor } from "./script-builder/BlockEditor"
import { TimelineEditor } from "./script-builder/TimelineEditor"
import { SpreadsheetEditor } from "./script-builder/SpreadsheetEditor"
import { cn } from "@/lib/utils"

interface CompilationResult {
  success: boolean;
  commands?: unknown[];
  error?: string;
  commandCount?: number;
}

interface CommandEditorProps {
  onNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
}

export function CommandEditor({ onNotification }: CommandEditorProps) {
  const [activeTab, setActiveTab] = useState("editor")
  const [editorMode, setEditorMode] = useState<'text' | 'visual' | 'timeline' | 'spreadsheet'>('text')
  const [commandText, setCommandText] = useState('')
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [autoCompile, setAutoCompile] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const checkConnectionStatus = async () => {
    try {
      const status = await api.getStatus()
      setConnectionStatus(status.esp32Connected ? 'connected' : 'disconnected')
    } catch {
      setConnectionStatus('disconnected')
    }
  }

  const handleCompile = useCallback(async () => {
    if (!commandText.trim()) {
      setCompilationResult(null)
      return
    }

    setIsCompiling(true)
    try {
      const result = await api.saveScript(commandText)
      setCompilationResult({
        success: result.success,
        commands: [],
        error: result.error,
        commandCount: result.commandCount || 0
      })
    } catch (error) {
      setCompilationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Compilation failed',
        commandCount: 0
      })
    } finally {
      setIsCompiling(false)
    }
  }, [commandText])

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
      case 'connected': return 'ESP32 Connected'
      case 'disconnected': return 'ESP32 Disconnected'
      case 'connecting': return 'Connecting...'
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full animate-pulse", getConnectionStatusColor())} />
              <div>
                <p className="text-sm font-medium">{getConnectionStatusText()}</p>
                <p className="text-xs text-muted-foreground">ESP32 Connection Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {compilationResult && (
          <Card className={cn("border-0", 
            compilationResult.success ? "bg-gradient-to-r from-green-50 to-green-100" : "bg-gradient-to-r from-red-50 to-red-100"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {compilationResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {compilationResult.success ? `${compilationResult.commandCount} Commands` : 'Compilation Error'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {compilationResult.success ? 'Script compiled successfully' : 'Check script syntax'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
                        variant={editorMode === 'visual' ? "default" : "ghost"}
                        onClick={() => setEditorMode('visual')}
                        className="h-7 px-2 text-xs"
                      >
                        <Blocks className="w-3 h-3 mr-1" />
                        Visual
                      </Button>
                      <Button
                        size="sm"
                        variant={editorMode === 'timeline' ? "default" : "ghost"}
                        onClick={() => setEditorMode('timeline')}
                        className="h-7 px-2 text-xs"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Timeline
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
              {editorMode === 'text' ? (
                <Textarea
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  placeholder="Enter your palletizer commands here...&#10;&#10;Example:&#10;X1000 Y2000 F1500&#10;GROUP X0 Y0 Z500&#10;SYNC&#10;&#10;FUNC pickup&#10;  Z-100&#10;  G1&#10;  Z100&#10;ENDFUNC&#10;&#10;CALL pickup"
                  className="min-h-[400px] font-mono text-sm bg-background/50 border-0 focus:ring-2 focus:ring-primary/20"
                />
              ) : editorMode === 'visual' ? (
                <div className="border-0 rounded-lg min-h-[400px] bg-background/30 relative">
                  <BlockEditor
                    onScriptGenerated={(script) => setCommandText(script)}
                  />
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 text-center max-w-sm">
                      <Blocks className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Visual Editor</h3>
                      <p className="text-muted-foreground">This feature is coming soon!</p>
                    </Card>
                  </div>
                </div>
              ) : editorMode === 'timeline' ? (
                <div className="border-0 rounded-lg min-h-[400px] bg-background/30 relative">
                  <TimelineEditor
                    onScriptGenerated={(script) => setCommandText(script)}
                  />
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 text-center max-w-sm">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Timeline Editor</h3>
                      <p className="text-muted-foreground">This feature is coming soon!</p>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="border-0 rounded-lg min-h-[400px] bg-background/30">
                  <SpreadsheetEditor
                    onScriptGenerated={(script) => setCommandText(script)}
                  />
                </div>
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
                  onClick={() => setCommandText('X1000 Y2000 F1500\nSYNC\nX0 Y0 F3000')}
                  className="justify-start hover:bg-primary/5 hover:border-primary/30"
                >
                  Simple Movement
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
                  onClick={() => setCommandText('// Palletizing Pattern\nFUNC place_item\n  X{pos_x} Y{pos_y} F2000\n  Z-50\n  G0  // Release gripper\n  Z50\nENDFUNC\n\nLOOP 3\n  LOOP 4\n    CALL place_item\n    X+200\n  ENDLOOP\n  X0\n  Y+150\nENDLOOP')}
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