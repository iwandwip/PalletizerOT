'use client'

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Save, Download, FileText, Play, Compile, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

interface CompilationResult {
  success: boolean;
  commands?: any[];
  error?: string;
  commandCount?: number;
}

interface CommandEditorProps {
  commandText: string
  onCommandTextChange: (text: string) => void
  onSaveCommands: () => void
  onLoadCommands: () => void
  onUploadFile: (file: File) => void
  onExecute?: () => void
}

export default function CommandEditor({
  commandText,
  onCommandTextChange,
  onSaveCommands,
  onLoadCommands,
  onUploadFile,
  onExecute
}: CommandEditorProps) {
  const [activeTab, setActiveTab] = useState("editor")
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [autoCompile, setAutoCompile] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Setup WebSocket listeners
  useEffect(() => {
    api.on('esp32_connected', () => setConnectionStatus('connected'))
    api.on('esp32_disconnected', () => setConnectionStatus('disconnected'))
    
    // Check initial connection status
    checkConnectionStatus()
    
    return () => {
      api.off('esp32_connected', () => setConnectionStatus('connected'))
      api.off('esp32_disconnected', () => setConnectionStatus('disconnected'))
    }
  }, [])

  // Auto-compile when text changes
  useEffect(() => {
    if (autoCompile && commandText.trim()) {
      const timeoutId = setTimeout(() => {
        handleCompile()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [commandText, autoCompile])

  const checkConnectionStatus = async () => {
    try {
      const status = await api.getStatus()
      setConnectionStatus(status.esp32Connected ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus('disconnected')
    }
  }

  const handleCompile = async () => {
    if (!commandText.trim()) {
      setCompilationResult(null)
      return
    }

    setIsCompiling(true)
    try {
      const result = await api.parseScript(commandText)
      setCompilationResult({
        success: result.success,
        commands: result.commands,
        error: result.error,
        commandCount: result.commands?.length || 0
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
  }

  const handleExecuteScript = async () => {
    if (!commandText.trim()) {
      return
    }

    setIsExecuting(true)
    try {
      const result = await api.executeScript(commandText)
      
      if (result.success) {
        if (onExecute) {
          onExecute()
        }
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (error) {
      console.error('Script execution failed:', error)
      // You might want to show a toast or alert here
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
        onCommandTextChange(content)
      }
      reader.readAsText(file)
      onUploadFile(file)
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
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
          <span className="text-sm font-medium">{getConnectionStatusText()}</span>
        </div>
        {compilationResult && (
          <Badge variant={compilationResult.success ? "default" : "destructive"} className="text-xs">
            {compilationResult.success ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                {compilationResult.commandCount} Commands
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Compilation Error
              </>
            )}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Script Editor</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Modern Script Language</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Auto-compile</span>
                <Button
                  size="sm"
                  variant={autoCompile ? "default" : "outline"}
                  onClick={() => setAutoCompile(!autoCompile)}
                  className="h-6 px-2 text-xs"
                >
                  {autoCompile ? "ON" : "OFF"}
                </Button>
              </div>
            </div>
            
            <Textarea
              value={commandText}
              onChange={(e) => onCommandTextChange(e.target.value)}
              placeholder="Enter your palletizer commands here...&#10;&#10;Example:&#10;X1000 Y2000 F1500&#10;GROUP X0 Y0 Z500&#10;SYNC&#10;&#10;FUNC pickup&#10;  Z-100&#10;  G1&#10;  Z100&#10;ENDFUNC&#10;&#10;CALL pickup"
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          {compilationResult && !compilationResult.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Compilation Error:</strong> {compilationResult.error}
              </AlertDescription>
            </Alert>
          )}

          {compilationResult?.success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Script compiled successfully! Generated {compilationResult.commandCount} commands ready for execution.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Operations */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">File Operations</h3>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2" />
                Load from File
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveToFile}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Save to File
              </Button>

              <Button
                variant="outline"
                onClick={onSaveCommands}
                className="w-full justify-start"
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Memory
              </Button>

              <Button
                variant="outline"
                onClick={onLoadCommands}
                className="w-full justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                Load from Memory
              </Button>
            </div>

            {/* Script Operations */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Script Operations</h3>
              
              <Button
                onClick={handleCompile}
                disabled={isCompiling || !commandText.trim()}
                className="w-full justify-start"
              >
                {isCompiling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Compile className="w-4 h-4 mr-2" />
                )}
                Compile Script
              </Button>

              <Button
                onClick={handleExecuteScript}
                disabled={isExecuting || !compilationResult?.success || connectionStatus !== 'connected'}
                className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
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
                className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
              >
                {isCompiling || isExecuting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Compile & Execute
              </Button>
            </div>
          </div>

          {/* Script Examples */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Quick Examples</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCommandTextChange('X1000 Y2000 F1500\nSYNC\nX0 Y0 F3000')}
              >
                Simple Movement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCommandTextChange('GROUP X1000 Y2000 Z500\nSYNC\nGROUP X0 Y0 Z0')}
              >
                Group Movements
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCommandTextChange('FUNC pickup\n  Z-100\n  G1\n  Z100\nENDFUNC\n\nCALL pickup')}
              >
                Function Example
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCommandTextChange('LOOP 5\n  X100\n  Y100\n  X0\n  Y0\nENDLOOP')}
              >
                Loop Example
              </Button>
            </div>
          </div>
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